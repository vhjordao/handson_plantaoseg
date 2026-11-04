"""O motor roda em memória: os dados carregam na subida e cada escrita da API os atualiza.

A API é a única que escreve no banco, então a cópia em memória não envelhece sozinha. Se alguém
mudar o banco por fora, `POST /internal/reload` ou reiniciar o serviço relê tudo.
"""

from dataclasses import replace
from threading import RLock

from app.api.repository import Repository, World
from app.models import Dataset, Doctor, Offer, Shift, Unit
from app.ranking.compute import FeatureStore


class WorldCache:
    def __init__(self, repository: Repository) -> None:
        self._repository = repository
        self._lock = RLock()
        self._world: World | None = None
        self._offers: dict[str, Offer] = {}
        self._store: FeatureStore | None = None

    def load(self) -> None:
        """Relê tudo do banco. Se falhar, a cópia anterior continua valendo."""
        world = self._repository.load_world()
        with self._lock:
            self._world = world
            self._offers = {offer.id: offer for offer in world.dataset.offers}
            self._store = None

    def _current(self) -> World:
        if self._world is None:
            raise RuntimeError("os dados do motor ainda não foram carregados")
        return self._world

    def unit(self, unit_id: str) -> Unit | None:
        return self._current().dataset.units.get(unit_id)

    def units_of(self, organization_id: str) -> dict[str, Unit]:
        units = self._current().dataset.units
        return {key: unit for key, unit in units.items() if unit.organization_id == organization_id}

    def doctor(self, doctor_id: str) -> Doctor | None:
        return self._current().dataset.doctors.get(doctor_id)

    def engine(self, organization_id: str) -> tuple[Dataset, FeatureStore]:
        """As tabelas com a política da organização e as variáveis no estado atual."""
        with self._lock:
            world = self._current()
            policy = world.policies.get(organization_id)
            if policy is None:
                raise LookupError(f"organização sem política de jornada: {organization_id}")
            if self._store is None:
                world.dataset.offers = list(self._offers.values())
                self._store = FeatureStore(world.dataset)
            return replace(world.dataset, policy=policy), self._store

    def put_shift(self, shift: Shift) -> None:
        with self._lock:
            self._current().dataset.shifts[shift.id] = shift
            self._store = None

    def put_offer(self, offer: Offer) -> None:
        with self._lock:
            self._offers[offer.id] = offer
            self._store = None

    def counts(self) -> dict[str, int]:
        with self._lock:
            dataset = self._current().dataset
            return {
                "doctors": len(dataset.doctors),
                "windows": sum(len(rows) for rows in dataset.windows.values()),
                "shifts": len(dataset.shifts),
                "offers": len(self._offers),
            }
