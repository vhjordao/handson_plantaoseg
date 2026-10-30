"""Conjunto pequeno de dados sintéticos compartilhado pelos testes (não modificar)."""

from datetime import date, datetime, time
from functools import cache

from app.models import Dataset, Doctor, Policy, Unit, Window
from app.ranking.evaluate import evaluate
from app.ranking.model import LogisticModel
from app.synthetic.generator import generate
from app.synthetic.params import load_params

SMALL = {
    "n_doctors": 60,
    "start_date": "2026-01-01",
    "end_date": "2026-03-31",
    "test_start": "2026-03-01",
    "text_requests": 80,
}

POLICY = Policy("org", 24, 11, True, 1.0, 15.0, 60, 5, date(2026, 1, 1))
UNIT = Unit("u1", "org", "Hospital Modelo Centro", "PS", "privado", "centro", -10.0, -50.0)
DOCTOR = Doctor(
    id="d1",
    name_sim="Ana Almeida Dias",
    crm_sim="SIM-SP-000001",
    phone_sim="+55 00 90000-0000",
    crm_status="active",
    specialty="pediatria",
    secondary_specialty=None,
    home_lat=-10.0,
    home_lon=-50.0,
    max_radius_km=15.0,
    preferred_period="night",
    home_zone="centro",
    gender="F",
    age_band="35-44",
    registered_at=datetime(2025, 1, 1),
)
FRIDAY_NIGHT = (datetime(2026, 10, 2, 19), datetime(2026, 10, 3, 7))


def friday_window(start: time = time(19), end: time = time(7)) -> Window:
    return Window("w1", "d1", "available", 4, None, start, end, date(2026, 1, 1), None)


def blocked_window(day: date) -> Window:
    return Window("w2", "d1", "blocked", None, day, time(0), time(23, 59), date(2026, 1, 1), None)


def small_params() -> dict:
    return load_params(overrides=SMALL)


@cache
def small_dataset() -> Dataset:
    return generate(small_params())


@cache
def small_model() -> LogisticModel:
    model, _ = evaluate(small_dataset(), small_params())
    return model
