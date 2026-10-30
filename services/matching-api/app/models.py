"""Estruturas de dados e leitura/escrita dos CSVs sintéticos (só biblioteca padrão).

Os nomes das tabelas e das colunas seguem o dicionário de dados (docs/dados). Cada
dataclass é uma linha de tabela; os campos, na ordem, são as colunas do CSV.
"""

import csv
from dataclasses import dataclass, fields
from datetime import date, datetime, time, timedelta
from pathlib import Path
from typing import Any, get_args


@dataclass(frozen=True, slots=True)
class Organization:
    id: str
    name: str
    kind: str
    created_at: datetime


@dataclass(frozen=True, slots=True)
class Unit:
    id: str
    organization_id: str
    name: str
    kind: str
    ownership: str
    zone: str
    lat: float
    lon: float


@dataclass(frozen=True, slots=True)
class Doctor:
    id: str
    name_sim: str
    crm_sim: str
    phone_sim: str
    crm_status: str
    specialty: str
    secondary_specialty: str | None
    home_lat: float
    home_lon: float
    max_radius_km: float
    preferred_period: str
    home_zone: str
    gender: str
    age_band: str
    registered_at: datetime


@dataclass(frozen=True, slots=True)
class Window:
    """Linha de `doctor_availability`: janela livre semanal ou bloqueio por data."""

    id: str
    doctor_id: str
    kind: str
    weekday: int | None
    on_date: date | None
    start_time: time
    end_time: time
    valid_from: date
    valid_to: date | None


@dataclass(frozen=True, slots=True)
class Shift:
    id: str
    unit_id: str
    source_request_id: str | None
    specialty: str
    starts_at: datetime
    ends_at: datetime
    period: str
    is_weekend: bool
    urgency: str
    status: str
    published_at: datetime
    filled_at: datetime | None


@dataclass(frozen=True, slots=True)
class ShiftRequest:
    id: str
    unit_id: str
    coordinator_pseudo_id: str
    created_at: datetime
    raw_text: str
    style: str
    gt_unit_id: str
    gt_specialty: str
    gt_starts_at: datetime
    gt_ends_at: datetime
    gt_urgency: str
    is_adversarial: bool
    attack_type: str | None


@dataclass(frozen=True, slots=True)
class Offer:
    id: str
    shift_id: str
    doctor_id: str
    sequence_no: int
    selection_source: str
    sent_at: datetime
    ttl_minutes: int
    responded_at: datetime | None
    response: str
    decline_reason: str | None
    accepted: bool
    attended: bool | None
    y_success: bool
    injected_violation: bool

    @property
    def resolved_at(self) -> datetime:
        """Instante em que o resultado da oferta passou a ser conhecido."""
        return self.responded_at or self.sent_at + timedelta(minutes=self.ttl_minutes)


@dataclass(frozen=True, slots=True)
class Policy:
    organization_id: str
    max_continuous_hours: int
    min_rest_hours: int
    allow_secondary_specialty: bool
    min_overlap_ratio: float
    default_radius_km: float
    offer_ttl_minutes: int
    top_k: int
    effective_from: date


@dataclass(frozen=True, slots=True)
class Compensation:
    """Valor simulado do plantão. Restrito: nunca entra no ranking nem no LLM."""

    shift_id: str
    amount_brl_sim: float


@dataclass(frozen=True, slots=True)
class DoctorLatent:
    """Verdade do simulador (gabarito). O modelo e o LLM nunca veem esta tabela."""

    doctor_id: str
    reliability: float


TABLES: dict[str, type] = {
    "organizations": Organization,
    "units": Unit,
    "doctors": Doctor,
    "doctor_availability": Window,
    "shifts": Shift,
    "shift_requests": ShiftRequest,
    "offers": Offer,
    "policy_config": Policy,
    "shift_compensation": Compensation,
    "doctors_latent": DoctorLatent,
}


@dataclass
class Dataset:
    """Conjunto de tabelas carregado em memória."""

    organizations: list[Organization]
    units: dict[str, Unit]
    doctors: dict[str, Doctor]
    windows: dict[str, list[Window]]
    shifts: dict[str, Shift]
    requests: list[ShiftRequest]
    offers: list[Offer]
    policy: Policy
    compensation: dict[str, float]
    latent: dict[str, float]


def _allows_none(tp: Any) -> bool:
    return type(None) in get_args(tp)


def _base_type(tp: Any) -> Any:
    args = [arg for arg in get_args(tp) if arg is not type(None)]
    return args[0] if args else tp


def parse_value(tp: Any, raw: str) -> Any:
    """Converte o texto de uma célula do CSV para o tipo da coluna."""
    if raw == "" and _allows_none(tp):
        return None
    base = _base_type(tp)
    if base is bool:
        return raw == "true"
    if base is int:
        return int(raw)
    if base is float:
        return float(raw)
    if base is datetime:
        return datetime.fromisoformat(raw)
    if base is date:
        return date.fromisoformat(raw)
    if base is time:
        return time.fromisoformat(raw)
    return raw


def format_value(value: Any) -> str:
    """Converte um valor de coluna para o texto do CSV."""
    if value is None:
        return ""
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%dT%H:%M:%S")
    if isinstance(value, date | time):
        return value.isoformat()
    if isinstance(value, float):
        return f"{value:.6f}".rstrip("0").rstrip(".") or "0"
    return str(value)


def row_of(obj: Any) -> dict[str, str]:
    return {f.name: format_value(getattr(obj, f.name)) for f in fields(obj)}


def from_row(cls: type, row: dict[str, str]) -> Any:
    return cls(**{f.name: parse_value(f.type, row[f.name]) for f in fields(cls)})


def write_table(path: Path, cls: type, rows: list[Any]) -> None:
    names = [f.name for f in fields(cls)]
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=names, lineterminator="\n")
        writer.writeheader()
        for obj in rows:
            writer.writerow(row_of(obj))


def read_table(path: Path, cls: type) -> list[Any]:
    with path.open(encoding="utf-8", newline="") as handle:
        return [from_row(cls, row) for row in csv.DictReader(handle)]


def load_dataset(directory: Path) -> Dataset:
    """Lê as tabelas de um diretório gerado por `python -m app.cli seed`."""
    organizations = read_table(directory / "organizations.csv", Organization)
    windows: dict[str, list[Window]] = {}
    for window in read_table(directory / "doctor_availability.csv", Window):
        windows.setdefault(window.doctor_id, []).append(window)
    latent_path = directory / "doctors_latent.csv"
    latent = (
        {row.doctor_id: row.reliability for row in read_table(latent_path, DoctorLatent)}
        if latent_path.exists()
        else {}
    )
    comp_path = directory / "shift_compensation.csv"
    compensation = (
        {row.shift_id: row.amount_brl_sim for row in read_table(comp_path, Compensation)}
        if comp_path.exists()
        else {}
    )
    return Dataset(
        organizations=organizations,
        units={u.id: u for u in read_table(directory / "units.csv", Unit)},
        doctors={d.id: d for d in read_table(directory / "doctors.csv", Doctor)},
        windows=windows,
        shifts={s.id: s for s in read_table(directory / "shifts.csv", Shift)},
        requests=read_table(directory / "shift_requests.csv", ShiftRequest),
        offers=read_table(directory / "offers.csv", Offer),
        policy=read_table(directory / "policy_config.csv", Policy)[0],
        compensation=compensation,
        latent=latent,
    )
