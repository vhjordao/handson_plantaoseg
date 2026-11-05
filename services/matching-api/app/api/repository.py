"""Camada de repositório: lê e grava no Supabase e monta os objetos que o motor já conhece.

As listas abaixo são o contrato do que a API lê. O que o motor não usa fica de fora de propósito:
nome, CRM, telefone, gênero, faixa etária, zona de residência, o valor do plantão, os rótulos e os
campos de gabarito. Dado que não entrou na memória não tem como vazar para o ranking nem para o
LLM. `tests/test_contrato_banco.py` confere as listas com as migrações.
"""

from collections.abc import Sequence
from dataclasses import dataclass
from datetime import date, datetime, time
from typing import Any

from app.api.rest import Rest
from app.api.tempo import db_from_local, local_from_db
from app.models import Dataset, Doctor, Offer, Organization, Policy, Shift, Unit, Window

ORGANIZATION_COLUMNS = ("id", "name", "kind", "created_at")
UNIT_COLUMNS = ("id", "organization_id", "name", "kind", "ownership", "zone", "lat", "lon")
DOCTOR_COLUMNS = (
    "id",
    "crm_status",
    "specialty",
    "secondary_specialty",
    "home_lat",
    "home_lon",
    "max_radius_km",
    "preferred_period",
    "registered_at",
)
WINDOW_COLUMNS = (
    "id",
    "doctor_id",
    "kind",
    "weekday",
    "on_date",
    "start_time",
    "end_time",
    "valid_from",
    "valid_to",
)
POLICY_COLUMNS = (
    "organization_id",
    "max_continuous_hours",
    "min_rest_hours",
    "allow_secondary_specialty",
    "min_overlap_ratio",
    "default_radius_km",
    "offer_ttl_minutes",
    "top_k",
    "effective_from",
)
SHIFT_COLUMNS = (
    "id",
    "unit_id",
    "source_request_id",
    "specialty",
    "starts_at",
    "ends_at",
    "period",
    "is_weekend",
    "urgency",
    "status",
    "published_at",
    "filled_at",
)
OFFER_COLUMNS = (
    "id",
    "shift_id",
    "doctor_id",
    "sequence_no",
    "selection_source",
    "sent_at",
    "ttl_minutes",
    "responded_at",
    "response",
    "decline_reason",
    "accepted",
    "attended",
)
PROFILE_COLUMNS = ("id", "role", "organization_id", "doctor_id")
MODEL_REGISTRY_COLUMNS = ("model_version", "features", "status")
SHORTLIST_COLUMNS = ("doctor_id", "rank")
EXCLUSION_COLUMNS = ("id",)
APPROVAL_COLUMNS = ("seq", "details")

# Tudo o que a API pode ler. Um teste confere com as migrações e com a neutralidade econômica.
READ_COLUMNS: dict[str, tuple[str, ...]] = {
    "organizations": ORGANIZATION_COLUMNS,
    "units": UNIT_COLUMNS,
    "doctors": DOCTOR_COLUMNS,
    "doctor_availability": WINDOW_COLUMNS,
    "policy_config": POLICY_COLUMNS,
    "shifts": SHIFT_COLUMNS,
    "offers": OFFER_COLUMNS,
    "profiles": PROFILE_COLUMNS,
    "model_registry": MODEL_REGISTRY_COLUMNS,
    "recommendations": SHORTLIST_COLUMNS,
    "recommendation_exclusions": EXCLUSION_COLUMNS,
    "audit_log": APPROVAL_COLUMNS,
}


@dataclass(frozen=True, slots=True)
class Profile:
    """Papel e organização do usuário, sempre lidos de `public.profiles`, e nunca do JWT."""

    user_id: str
    role: str
    organization_id: str | None
    doctor_id: str | None


@dataclass(slots=True)
class World:
    """O que o motor precisa em memória: as tabelas e a política de cada organização."""

    dataset: Dataset
    policies: dict[str, Policy]


def _optional_local(value: str | None) -> datetime | None:
    return local_from_db(value) if value else None


def _optional_date(value: str | None) -> date | None:
    return date.fromisoformat(value) if value else None


def organization_from_row(row: dict[str, Any]) -> Organization:
    return Organization(row["id"], row["name"], row["kind"], local_from_db(row["created_at"]))


def unit_from_row(row: dict[str, Any]) -> Unit:
    return Unit(
        row["id"],
        row["organization_id"],
        row["name"],
        row["kind"],
        row["ownership"],
        row["zone"],
        float(row["lat"]),
        float(row["lon"]),
    )


def doctor_from_row(row: dict[str, Any]) -> Doctor:
    """Médico sem nada de pessoal: esses campos ficam vazios porque nem são lidos."""
    return Doctor(
        id=row["id"],
        name_sim="",
        crm_sim="",
        phone_sim="",
        crm_status=row["crm_status"],
        specialty=row["specialty"],
        secondary_specialty=row["secondary_specialty"],
        home_lat=float(row["home_lat"]),
        home_lon=float(row["home_lon"]),
        max_radius_km=float(row["max_radius_km"]),
        preferred_period=row["preferred_period"],
        home_zone="",
        gender="",
        age_band="",
        registered_at=local_from_db(row["registered_at"]),
    )


def window_from_row(row: dict[str, Any]) -> Window:
    return Window(
        row["id"],
        row["doctor_id"],
        row["kind"],
        row["weekday"],
        _optional_date(row["on_date"]),
        time.fromisoformat(row["start_time"]),
        time.fromisoformat(row["end_time"]),
        date.fromisoformat(row["valid_from"]),
        _optional_date(row["valid_to"]),
    )


def policy_from_row(row: dict[str, Any]) -> Policy:
    return Policy(
        row["organization_id"],
        row["max_continuous_hours"],
        row["min_rest_hours"],
        row["allow_secondary_specialty"],
        float(row["min_overlap_ratio"]),
        float(row["default_radius_km"]),
        row["offer_ttl_minutes"],
        row["top_k"],
        date.fromisoformat(row["effective_from"]),
    )


def shift_from_row(row: dict[str, Any]) -> Shift:
    return Shift(
        row["id"],
        row["unit_id"],
        row["source_request_id"],
        row["specialty"],
        local_from_db(row["starts_at"]),
        local_from_db(row["ends_at"]),
        row["period"],
        row["is_weekend"],
        row["urgency"],
        row["status"],
        local_from_db(row["published_at"]),
        _optional_local(row["filled_at"]),
    )


def offer_from_row(row: dict[str, Any]) -> Offer:
    """Oferta sem os rótulos do modelo, que o motor não lê para recomendar."""
    return Offer(
        id=row["id"],
        shift_id=row["shift_id"],
        doctor_id=row["doctor_id"],
        sequence_no=row["sequence_no"],
        selection_source=row["selection_source"],
        sent_at=local_from_db(row["sent_at"]),
        ttl_minutes=row["ttl_minutes"],
        responded_at=_optional_local(row["responded_at"]),
        response=row["response"],
        decline_reason=row["decline_reason"],
        accepted=row["accepted"],
        attended=row["attended"],
        y_success=False,
        injected_violation=False,
    )


class Repository:
    """Tudo o que a API lê e grava passa por aqui. Nenhuma regra de negócio mora nesta camada."""

    def __init__(self, rest: Rest) -> None:
        self._rest = rest

    def load_world(self) -> World:
        """Lê as tabelas do motor. Valor do plantão, pedidos e gabarito ficam de fora."""
        select = self._rest.select
        windows: dict[str, list[Window]] = {}
        for row in select("doctor_availability", WINDOW_COLUMNS):
            windows.setdefault(row["doctor_id"], []).append(window_from_row(row))
        # A política mais recente de cada organização vence.
        policies: dict[str, Policy] = {}
        for row in select("policy_config", POLICY_COLUMNS, order="effective_from"):
            policy = policy_from_row(row)
            policies[policy.organization_id] = policy
        if not policies:
            raise RuntimeError("o banco não tem política de jornada: a carga rodou?")
        dataset = Dataset(
            organizations=[
                organization_from_row(row)
                for row in select("organizations", ORGANIZATION_COLUMNS)
            ],
            units={row["id"]: unit_from_row(row) for row in select("units", UNIT_COLUMNS)},
            doctors={row["id"]: doctor_from_row(row) for row in select("doctors", DOCTOR_COLUMNS)},
            windows=windows,
            shifts={row["id"]: shift_from_row(row) for row in select("shifts", SHIFT_COLUMNS)},
            requests=[],
            offers=[offer_from_row(row) for row in select("offers", OFFER_COLUMNS)],
            policy=next(iter(policies.values())),
            compensation={},
            latent={},
        )
        return World(dataset, policies)

    def active_models(self) -> list[dict[str, Any]]:
        return self._rest.select(
            "model_registry", MODEL_REGISTRY_COLUMNS, filters={"status": "eq.active"}
        )

    def profile(self, user_id: str) -> Profile | None:
        rows = self._rest.select(
            "profiles", PROFILE_COLUMNS, filters={"id": f"eq.{user_id}"}, limit=1
        )
        if not rows:
            return None
        row = rows[0]
        return Profile(row["id"], row["role"], row["organization_id"], row["doctor_id"])

    def shift(self, shift_id: str) -> Shift | None:
        rows = self._rest.select(
            "shifts", SHIFT_COLUMNS, filters={"id": f"eq.{shift_id}"}, limit=1
        )
        return shift_from_row(rows[0]) if rows else None

    def offer(self, offer_id: str) -> Offer | None:
        rows = self._rest.select(
            "offers", OFFER_COLUMNS, filters={"id": f"eq.{offer_id}"}, limit=1
        )
        return offer_from_row(rows[0]) if rows else None

    def offers_of_shift(self, shift_id: str) -> list[Offer]:
        rows = self._rest.select(
            "offers", OFFER_COLUMNS, filters={"shift_id": f"eq.{shift_id}"}, order="sequence_no"
        )
        return [offer_from_row(row) for row in rows]

    def shortlist(self, shift_id: str) -> list[str]:
        """Os médicos recomendados para a vaga, na ordem do ranking."""
        rows = self._rest.select(
            "recommendations",
            SHORTLIST_COLUMNS,
            filters={"shift_id": f"eq.{shift_id}"},
            order="rank",
        )
        return [row["doctor_id"] for row in rows]

    def has_exclusions(self, shift_id: str) -> bool:
        rows = self._rest.select(
            "recommendation_exclusions",
            EXCLUSION_COLUMNS,
            filters={"shift_id": f"eq.{shift_id}"},
            limit=1,
        )
        return bool(rows)

    def approved_ids(self, shift_id: str) -> list[str] | None:
        """A decisão do coordenador, lida da trilha. `None`: nunca houve aprovação."""
        rows = self._rest.select(
            "audit_log",
            APPROVAL_COLUMNS,
            filters={
                "entity_type": "eq.shift",
                "entity_id": f"eq.{shift_id}",
                "action": "eq.recommendation_approved",
            },
            order="seq",
            limit=1,
        )
        return list(rows[0]["details"]["approved_doctor_ids"]) if rows else None

    def publish(
        self,
        *,
        unit_id: str,
        coordinator_id: str,
        raw_text: str,
        specialty: str,
        starts_at: datetime,
        ends_at: datetime,
        period: str,
        is_weekend: bool,
        urgency: str,
        now: datetime,
    ) -> tuple[str, Shift]:
        """Grava o pedido e a vaga. Devolve o ID do pedido e a vaga criada."""
        request = self._rest.insert(
            "shift_requests",
            [
                {
                    "unit_id": unit_id,
                    "coordinator_pseudo_id": coordinator_id,
                    "created_at": db_from_local(now),
                    "raw_text": raw_text,
                }
            ],
            returning=("id",),
        )[0]
        rows = self._rest.insert(
            "shifts",
            [
                {
                    "unit_id": unit_id,
                    "source_request_id": request["id"],
                    "specialty": specialty,
                    "starts_at": db_from_local(starts_at),
                    "ends_at": db_from_local(ends_at),
                    "period": period,
                    "is_weekend": is_weekend,
                    "urgency": urgency,
                    "status": "open",
                    "published_at": db_from_local(now),
                }
            ],
            returning=SHIFT_COLUMNS,
        )
        return request["id"], shift_from_row(rows[0])

    def save_recommendations(
        self,
        rows: Sequence[dict[str, Any]],
        explanations: Sequence[dict[str, Any]],
        exclusions: Sequence[dict[str, Any]],
    ) -> None:
        """Grava recomendações, explicações e exclusões. `explanations` segue a ordem de `rows`."""
        saved = self._rest.insert("recommendations", rows, returning=("id", "doctor_id"))
        ids = {row["doctor_id"]: row["id"] for row in saved}
        self._rest.insert(
            "explanations",
            [
                {"recommendation_id": ids[row["doctor_id"]], **explanation}
                for row, explanation in zip(rows, explanations, strict=True)
            ],
        )
        self._rest.insert("recommendation_exclusions", exclusions)

    def add_audit(self, rows: Sequence[dict[str, Any]]) -> None:
        self._rest.insert("audit_log", rows)

    def add_offer(
        self,
        *,
        shift_id: str,
        doctor_id: str,
        sequence_no: int,
        ttl_minutes: int,
        now: datetime,
    ) -> Offer:
        rows = self._rest.insert(
            "offers",
            [
                {
                    "shift_id": shift_id,
                    "doctor_id": doctor_id,
                    "sequence_no": sequence_no,
                    "selection_source": "system_recommendation",
                    "sent_at": db_from_local(now),
                    "ttl_minutes": ttl_minutes,
                    "response": "pending",
                }
            ],
            returning=OFFER_COLUMNS,
        )
        return offer_from_row(rows[0])

    def close_offer(
        self,
        offer_id: str,
        *,
        response: str,
        responded_at: datetime | None,
        decline_reason: str | None = None,
    ) -> Offer | None:
        """Fecha a oferta só se ela ainda estiver pendente. `None`: outra chamada já fechou."""
        rows = self._rest.update(
            "offers",
            {
                "response": response,
                "responded_at": db_from_local(responded_at) if responded_at else None,
                "decline_reason": decline_reason,
            },
            filters={"id": f"eq.{offer_id}", "response": "eq.pending"},
            returning=OFFER_COLUMNS,
        )
        return offer_from_row(rows[0]) if rows else None

    def set_shift_status(
        self, shift_id: str, status: str, *, filled_at: datetime | None = None
    ) -> Shift | None:
        rows = self._rest.update(
            "shifts",
            {"status": status, "filled_at": db_from_local(filled_at) if filled_at else None},
            filters={"id": f"eq.{shift_id}"},
            returning=SHIFT_COLUMNS,
        )
        return shift_from_row(rows[0]) if rows else None
