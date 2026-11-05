"""Banco falso e chaves de teste para os testes da API. Sem rede, sem Docker e sem Supabase.

`FakeRest` guarda as linhas em memória e imita o que importa do banco real: recusa coluna que não
existe nas migrações, aplica as restrições que o fluxo depende e barra a tabela do valor do plantão.
Os testes de comportamento do banco de verdade são os de pgTAP, na CI.
"""

import copy
import re
from dataclasses import fields as dataclass_fields
from datetime import UTC, date, datetime, time, timedelta
from typing import Any
from uuid import uuid4

import jwt
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi.testclient import TestClient

from app.api.auth import AUDIENCE, TokenVerifier
from app.api.main import create_app
from app.api.repository import Repository
from app.api.rest import RestConflict, RestError, column_list, guard_table
from app.api.service import MatchingService
from app.api.tempo import SAO_PAULO
from app.api.world import WorldCache
from app.audit import ACTIONS
from app.llm.guardrails import ShiftFields
from app.models import Dataset
from app.pipeline import recommend
from app.ranking.compute import FeatureStore
from app.ranking.features import RANKING_FEATURES
from app.rules import RULE_TEXTS
from tests.helpers import small_dataset, small_model
from tests.test_contrato_banco import _columns

SUPABASE_URL = "https://teste.supabase.invalid"
WEBHOOK_SECRET = "segredo-de-teste-com-mais-de-32-caracteres"
PII_IN_DETAILS = re.compile(r'"(name|name_sim|crm|crm_sim|phone|phone_sim|email|cpf)"\s*:', re.I)

ORG_B = "b0000000-0000-4000-8000-000000000001"
UNIT_B = "b0000000-0000-4000-8000-000000000002"
COORDINATOR_A = "a1000000-0000-4000-8000-000000000001"
COORDINATOR_B = "b1000000-0000-4000-8000-000000000001"
ADMIN_A = "a1000000-0000-4000-8000-000000000002"
NO_PROFILE = "c0000000-0000-4000-8000-000000000001"

_PRIVATE_KEY = ec.generate_private_key(ec.SECP256R1())
PUBLIC_KEY = _PRIVATE_KEY.public_key()
KID = "chave-de-teste"


class StaticKeys:
    def key_for(self, kid: str) -> Any | None:
        return PUBLIC_KEY if kid == KID else None


def make_token(sub: str, *, headers: dict[str, Any] | None = None, **claims: Any) -> str:
    payload = {
        "sub": sub,
        "aud": AUDIENCE,
        "iss": f"{SUPABASE_URL}/auth/v1",
        "exp": datetime.now(UTC) + timedelta(hours=1),
        **claims,
    }
    all_headers = {"kid": KID, **(headers or {})}
    return jwt.encode(payload, _PRIVATE_KEY, algorithm="ES256", headers=all_headers)


def bearer(sub: str, **claims: Any) -> dict[str, str]:
    return {"Authorization": f"Bearer {make_token(sub, **claims)}"}


def _db_value(value: Any) -> Any:
    """Como o Supabase devolve o valor: instante em UTC, data e hora em texto."""
    if isinstance(value, datetime):
        return value.replace(tzinfo=SAO_PAULO).astimezone(UTC).isoformat()
    if isinstance(value, date | time):
        return value.isoformat()
    return value


def _rows(items: Any, *, skip: set[str] | None = None) -> list[dict[str, Any]]:
    skipped = skip or set()
    return [
        {
            field.name: _db_value(getattr(item, field.name))
            for field in dataclass_fields(item)
            if field.name not in skipped
        }
        for item in items
    ]


def _staff_profile(user_id: str, role: str, organization_id: str) -> dict[str, Any]:
    return {"id": user_id, "role": role, "organization_id": organization_id, "doctor_id": None}


def seed_tables(dataset: Dataset | None = None) -> dict[str, list[dict[str, Any]]]:
    """Tabelas com os dados pequenos da simulação e uma segunda organização, para o isolamento."""
    data = dataset or small_dataset()
    policy_b = {
        "organization_id": ORG_B,
        "max_continuous_hours": 24,
        "min_rest_hours": 11,
        "allow_secondary_specialty": True,
        "min_overlap_ratio": 1.0,
        "default_radius_km": 15.0,
        "offer_ttl_minutes": 60,
        "top_k": 5,
        "effective_from": "2025-01-01",
    }
    org_a = data.organizations[0].id
    tables: dict[str, list[dict[str, Any]]] = {
        "organizations": [
            *_rows(data.organizations),
            {
                "id": ORG_B,
                "name": "Outra Rede",
                "kind": "controle_rls",
                "created_at": "2025-01-01T00:00:00+00:00",
            },
        ],
        "units": [
            *_rows(data.units.values()),
            {
                "id": UNIT_B,
                "organization_id": ORG_B,
                "name": "Hospital da Outra Rede",
                "kind": "PS",
                "ownership": "privado",
                "zone": "centro",
                "lat": -10.0,
                "lon": -50.0,
            },
        ],
        "doctors": _rows(data.doctors.values()),
        "doctor_availability": _rows(w for rows in data.windows.values() for w in rows),
        "policy_config": [*_rows([data.policy]), policy_b],
        "shifts": _rows(data.shifts.values()),
        "offers": _rows(data.offers),
        "shift_requests": [],
        "recommendations": [],
        "recommendation_exclusions": [],
        "explanations": [],
        "audit_log": [],
        "model_registry": [
            {
                "model_version": small_model().version,
                "features": list(RANKING_FEATURES),
                "status": "active",
            }
        ],
        "profiles": [
            _staff_profile(COORDINATOR_A, "coordinator", org_a),
            _staff_profile(ADMIN_A, "admin", org_a),
            _staff_profile(COORDINATOR_B, "coordinator", ORG_B),
        ],
    }
    return copy.deepcopy(tables)


def _matches(row: dict[str, Any], filters: dict[str, str] | None) -> bool:
    for column, condition in (filters or {}).items():
        operator, _, value = condition.partition(".")
        assert operator == "eq", f"o banco falso só conhece eq: {condition}"
        if str(row.get(column)) != value:
            return False
    return True


class FakeRest:
    """Implementa o protocolo `Rest` em memória, com as restrições de que o fluxo depende."""

    def __init__(self, tables: dict[str, list[dict[str, Any]]]) -> None:
        self.tables = tables
        self.calls: list[tuple[str, str, tuple[str, ...]]] = []
        self.down = False

    def _before(self, kind: str, table: str, columns: tuple[str, ...]) -> None:
        guard_table(table)
        self.calls.append((kind, table, columns))
        if self.down:
            raise RestError(503, "ConnectError")
        unknown = set(columns) - _columns(table)
        if unknown:
            raise RestError(400, f"coluna inexistente em {table}: {sorted(unknown)}")

    def select(self, table, columns, *, filters=None, order=None, limit=None):
        column_list(columns)
        self._before("select", table, tuple(columns))
        rows = [row for row in self.tables[table] if _matches(row, filters)]
        key = order or columns[0]
        rows.sort(key=lambda row: (row[key] is None, row[key]))
        rows = rows[:limit] if limit else rows
        return copy.deepcopy([{name: row[name] for name in columns} for row in rows])

    def insert(self, table, rows, *, returning=None):
        if not rows:
            return []
        self._before("insert", table, tuple(sorted({key for row in rows for key in row})))
        saved = [self._insert_one(table, dict(row)) for row in rows]
        if returning is None:
            return []
        column_list(returning)
        return copy.deepcopy([{name: row[name] for name in returning} for row in saved])

    def _insert_one(self, table: str, row: dict[str, Any]) -> dict[str, Any]:
        row.setdefault("id", str(uuid4()))
        for column in _columns(table):
            row.setdefault(column, None)
        if table == "offers":
            self._check_offer_unique(row)
            self._derive_offer(row)
        if table == "shift_requests" and ("\x00" in row["raw_text"] or len(row["raw_text"]) > 5000):
            raise RestError(400, "23514")
        if table == "recommendations" and not set(row["features"]) <= set(RANKING_FEATURES):
            raise RestError(400, "23514")
        if table == "recommendation_exclusions" and row["rule_code"] not in RULE_TEXTS:
            raise RestError(400, "22P02")
        if table == "audit_log":
            details = str(row["details"]).replace("'", '"')
            if row["action"] not in ACTIONS or PII_IN_DETAILS.search(details):
                raise RestError(400, "23514")
            row["seq"] = len(self.tables[table]) + 1
        self.tables[table].append(row)
        return row

    def _check_offer_unique(self, row: dict[str, Any]) -> None:
        for existing in self.tables["offers"]:
            if existing["shift_id"] != row["shift_id"]:
                continue
            same_doctor = existing["doctor_id"] == row["doctor_id"]
            if same_doctor or existing["sequence_no"] == row["sequence_no"]:
                raise RestConflict(409, "23505")

    @staticmethod
    def _derive_offer(row: dict[str, Any]) -> None:
        row["accepted"] = row["response"] == "accepted"
        row["y_success"] = row["accepted"] and bool(row["attended"])
        if (row["responded_at"] is None) != (row["response"] in ("pending", "expired")):
            raise RestError(400, "23514")

    def update(self, table, values, *, filters, returning):
        self._before("update", table, tuple(sorted(values)))
        changed = []
        for row in self.tables[table]:
            if _matches(row, filters):
                row.update(values)
                if table == "offers":
                    self._derive_offer(row)
                is_filled = row.get("status") == "filled"
                if table == "shifts" and is_filled != (row["filled_at"] is not None):
                    raise RestError(400, "23514")
                changed.append(row)
        return copy.deepcopy([{name: row[name] for name in returning} for row in changed])


class FixedClock:
    def __init__(self, now: datetime) -> None:
        self.now = now

    def __call__(self) -> datetime:
        return self.now

    def forward(self, minutes: int) -> None:
        self.now += timedelta(minutes=minutes)


class RecordingLLM:
    """LLM falso que guarda tudo o que recebeu, para provar o que foi e o que não foi enviado."""

    def __init__(self, response: str = "{}") -> None:
        self.response = response
        self.prompts: list[str] = []

    def generate_json(self, *, system: str, user: str, schema: dict[str, Any]) -> str:
        self.prompts.append(f"{system}\n{user}")
        return self.response


def _demo_shift():
    """Uma vaga da simulação com candidatos suficientes para exercitar a cascata inteira."""
    data = small_dataset()
    store = FeatureStore(data)
    for shift in sorted(data.shifts.values(), key=lambda item: item.published_at):
        if shift.published_at.month != 3:
            continue
        fields = ShiftFields(
            shift.unit_id, shift.specialty, shift.starts_at, shift.ends_at, shift.urgency
        )
        if len(recommend(data, store, small_model(), fields, shift.published_at).candidates) >= 3:
            return shift
    raise AssertionError("nenhuma vaga com 3 candidatos nos dados pequenos")


DEMO_SHIFT = _demo_shift()


class Harness:
    """A API inteira ligada ao banco falso, com relógio fixo no dia da vaga de exemplo."""

    def __init__(
        self,
        *,
        llm: Any = None,
        cors: tuple[str, ...] = (),
        docs: bool = False,
        notifier: Any = None,
    ) -> None:
        self.rest = FakeRest(seed_tables())
        # Prazo curto: com o relógio andando pouco, o histórico simulado não muda a agenda no meio
        # do teste, e o que muda é só o que o próprio teste fez.
        for policy in self.rest.tables["policy_config"]:
            policy["offer_ttl_minutes"] = 2
        self.repository = Repository(self.rest)
        self.world = WorldCache(self.repository)
        self.world.load()
        self.clock = FixedClock(DEMO_SHIFT.published_at)
        self.service = MatchingService(
            self.repository, self.world, small_model(), llm=llm, clock=self.clock
        )
        self.app = create_app(
            service=self.service,
            repository=self.repository,
            world=self.world,
            verifier=TokenVerifier(SUPABASE_URL, StaticKeys()),
            webhook_secret=WEBHOOK_SECRET,
            cors_origins=cors,
            expose_docs=docs,
            notifier=notifier,
        )
        self.client = TestClient(self.app)
        self.coordinator = bearer(COORDINATOR_A)

    def publish_body(self, **overrides: Any) -> dict[str, Any]:
        return {
            "text": "Preciso de plantonista para a vaga conferida",
            "unit_id": DEMO_SHIFT.unit_id,
            "specialty": DEMO_SHIFT.specialty,
            "starts_at": DEMO_SHIFT.starts_at.isoformat(),
            "ends_at": DEMO_SHIFT.ends_at.isoformat(),
            "urgency": DEMO_SHIFT.urgency,
            **overrides,
        }

    def publish(self, **overrides: Any) -> str:
        response = self.client.post(
            "/shifts", json=self.publish_body(**overrides), headers=self.coordinator
        )
        assert response.status_code == 201, response.text
        return response.json()["id"]

    def recommended(self) -> tuple[str, list[str]]:
        """Publica uma vaga e gera a recomendação. Devolve a vaga e os médicos recomendados."""
        shift_id = self.publish()
        response = self.client.post(f"/shifts/{shift_id}/recommendations", headers=self.coordinator)
        assert response.status_code == 201, response.text
        return shift_id, [item["doctor_id"] for item in response.json()["candidates"]]

    def approved(self, count: int = 3) -> tuple[str, list[str], dict[str, Any]]:
        """Vaga aprovada com os primeiros recomendados. A primeira oferta já saiu."""
        shift_id, doctors = self.recommended()
        chosen = doctors[:count]
        response = self.client.post(
            f"/shifts/{shift_id}/approve", json={"doctor_ids": chosen}, headers=self.coordinator
        )
        assert response.status_code == 200, response.text
        return shift_id, chosen, response.json()

    def doctor_headers(self, doctor_id: str) -> dict[str, str]:
        """Login de médico para o cadastro pedido, criando o perfil só na primeira vez."""
        user_id = f"d0000000-0000-4000-8000-{doctor_id[-12:]}"
        profiles = self.rest.tables["profiles"]
        if not any(row["id"] == user_id for row in profiles):
            profiles.append(
                {"id": user_id, "role": "doctor", "organization_id": None, "doctor_id": doctor_id}
            )
        return bearer(user_id)

    def internal(self, secret: str = WEBHOOK_SECRET) -> dict[str, str]:
        return {"X-Internal-Secret": secret}

    def offers_of(self, shift_id: str) -> list[dict[str, Any]]:
        rows = [row for row in self.rest.tables["offers"] if row["shift_id"] == shift_id]
        return sorted(rows, key=lambda row: row["sequence_no"])

    def audit_actions(self, entity_id: str | None = None) -> list[str]:
        rows = self.rest.tables["audit_log"]
        return [
            row["action"]
            for row in rows
            if entity_id is None
            or row["entity_id"] == entity_id
            or row["details"].get("shift_id") == entity_id
        ]
