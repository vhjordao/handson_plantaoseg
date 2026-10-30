"""Gerador de dados sintéticos do PlantãoSeguro (só biblioteca padrão, reprodutível).

Segmento (ADR 0001): pronto-socorro de hospitais privados fictícios, plantão noturno de 12 h
e de fim de semana, clínica médica e pediatria. Tudo é simulação: nomes, CRM, telefones,
coordenadas e valores são inventados e não têm validade médica ou legal.

O histórico de ofertas nasce de um "processo manual" simulado (a coordenação chama médicos em
cascata sem checar jornada). As respostas seguem `truth.py`; o modelo de ranking não vê esse
mundo, só as variáveis de `RANKING_FEATURES`.
"""

import hashlib
import json
import random
import sys
import uuid
from dataclasses import replace
from datetime import date, datetime, time, timedelta
from pathlib import Path
from typing import Any

from app.models import (
    TABLES,
    Compensation,
    Dataset,
    Doctor,
    DoctorLatent,
    Offer,
    Organization,
    Policy,
    Shift,
    ShiftRequest,
    Unit,
    Window,
    write_table,
)
from app.rules import (
    availability_overlap_hours,
    distance_km,
    preference_match,
    schedule_check,
    shift_period,
    specialty_match_value,
)
from app.synthetic import truth
from app.synthetic.params import DICTIONARY_VERSION, GENERATOR_VERSION, load_params
from app.synthetic.texts import ATTACK_TYPES, make_request_text

ORIGIN_LAT, ORIGIN_LON = -10.0, -50.0
ZONES = ("centro", "norte", "sul", "leste", "oeste")
ZONE_WEIGHTS = (0.25, 0.20, 0.20, 0.175, 0.175)
ZONE_OFFSETS = {
    "centro": (0.0, 0.0),
    "norte": (0.10, 0.02),
    "sul": (-0.09, -0.03),
    "leste": (0.0, 0.12),
    "oeste": (0.0, -0.12),
}
UNIT_SPECS = (
    ("Hospital Modelo Centro", "centro"),
    ("Hospital Modelo Norte", "norte"),
    ("Hospital Modelo Sul", "sul"),
)
SPECIALTIES = ("clinica_medica", "pediatria")
AGE_BANDS = ("25-34", "35-44", "45-54", "55+")
PREFERRED = ("night", "day", "weekend", "any")
CRM_STATUS = ("active", "suspended", "expired")
RADII_KM = (10.0, 15.0, 20.0, 30.0)
NIGHT_WINDOWS = ((time(19), time(7)), (time(19), time(1)), (time(23), time(7)))
FIRST_NAMES = (
    "Ana", "Bruno", "Carla", "Daniel", "Eduarda", "Felipe", "Gabriela", "Henrique", "Isabela",
    "João", "Karina", "Lucas", "Mariana", "Nicolas", "Olívia", "Paulo", "Renata", "Sérgio",
    "Tatiana", "Vítor",
)  # fmt: skip
LAST_NAMES = (
    "Almeida", "Barros", "Cardoso", "Dias", "Esteves", "Ferraz", "Gomes", "Holanda", "Ibarra",
    "Jardim", "Lacerda", "Macedo", "Nogueira", "Oliveira", "Pacheco", "Queiroz", "Ramos",
    "Siqueira", "Tavares", "Uchoa",
)  # fmt: skip


def _new_id(rng: random.Random) -> str:
    return str(uuid.UUID(int=rng.getrandbits(128), version=4))


def _fake_name(rng: random.Random) -> str:
    return f"{rng.choice(FIRST_NAMES)} {rng.choice(LAST_NAMES)} {rng.choice(LAST_NAMES)}"


def _hours(delta: timedelta) -> float:
    return delta.total_seconds() / 3600


def _make_units(rng: random.Random, organization_id: str) -> dict[str, Unit]:
    units: dict[str, Unit] = {}
    for name, zone in UNIT_SPECS:
        dlat, dlon = ZONE_OFFSETS[zone]
        unit = Unit(
            id=_new_id(rng),
            organization_id=organization_id,
            name=name,
            kind="PS",
            ownership="privado",
            zone=zone,
            lat=ORIGIN_LAT + dlat,
            lon=ORIGIN_LON + dlon,
        )
        units[unit.id] = unit
    return units


def _make_doctors(
    rng: random.Random, params: dict[str, Any]
) -> tuple[dict[str, Doctor], dict[str, list[Window]], dict[str, float]]:
    start = date.fromisoformat(params["start_date"])
    span = (date.fromisoformat(params["end_date"]) - start).days
    doctors: dict[str, Doctor] = {}
    windows: dict[str, list[Window]] = {}
    latent: dict[str, float] = {}
    for index in range(1, params["n_doctors"] + 1):
        doctor_id = _new_id(rng)
        zone = rng.choices(ZONES, weights=ZONE_WEIGHTS)[0]
        dlat, dlon = ZONE_OFFSETS[zone]
        specialty = "pediatria" if rng.random() < params["share_pediatria"] else "clinica_medica"
        if specialty == "pediatria":
            secondary = "clinica_medica" if rng.random() < 0.20 else None
        else:
            secondary = "pediatria" if rng.random() < 0.05 else None
        preferred = rng.choices(PREFERRED, weights=(0.40, 0.15, 0.20, 0.25))[0]
        doctor = Doctor(
            id=doctor_id,
            name_sim=_fake_name(rng),
            crm_sim=f"SIM-SP-{index:06d}",
            phone_sim=f"+55 00 9{rng.randint(0, 9999):04d}-{rng.randint(0, 9999):04d}",
            crm_status=rng.choices(CRM_STATUS, weights=(0.94, 0.04, 0.02))[0],
            specialty=specialty,
            secondary_specialty=secondary,
            home_lat=ORIGIN_LAT + dlat + rng.gauss(0, 0.035),
            home_lon=ORIGIN_LON + dlon + rng.gauss(0, 0.035),
            max_radius_km=rng.choices(RADII_KM, weights=(0.2, 0.35, 0.3, 0.15))[0],
            preferred_period=preferred,
            home_zone=zone,
            gender=rng.choice(("F", "M")),
            age_band=rng.choices(AGE_BANDS, weights=(0.25, 0.35, 0.25, 0.15))[0],
            registered_at=datetime.combine(start, time(0)) - timedelta(days=rng.randint(30, 400)),
        )
        doctors[doctor_id] = doctor
        latent[doctor_id] = rng.betavariate(5, 3)
        rows: list[Window] = []
        night_prob = {"night": 0.75, "any": 0.60, "day": 0.25, "weekend": 0.30}[preferred]
        day_prob = {"weekend": 0.75, "any": 0.60, "day": 0.60, "night": 0.25}[preferred]
        for weekday in range(7):
            if rng.random() < night_prob:
                begin, finish = rng.choices(NIGHT_WINDOWS, weights=(0.8, 0.1, 0.1))[0]
                rows.append(
                    _window(rng, doctor_id, "available", weekday, None, begin, finish, start)
                )
            if weekday >= 5 and rng.random() < day_prob:
                rows.append(
                    _window(rng, doctor_id, "available", weekday, None, time(7), time(19), start)
                )
        for offset in sorted(rng.sample(range(span + 1), k=rng.randint(0, min(14, span + 1)))):
            blocked_day = start + timedelta(days=offset)
            rows.append(
                _window(rng, doctor_id, "blocked", None, blocked_day, time(0), time(23, 59), start)
            )
        windows[doctor_id] = rows
    return doctors, windows, latent


def _window(
    rng: random.Random,
    doctor_id: str,
    kind: str,
    weekday: int | None,
    on_date: date | None,
    start_time: time,
    end_time: time,
    valid_from: date,
) -> Window:
    return Window(
        id=_new_id(rng),
        doctor_id=doctor_id,
        kind=kind,
        weekday=weekday,
        on_date=on_date,
        start_time=start_time,
        end_time=end_time,
        valid_from=valid_from,
        valid_to=None,
    )


def _new_shift(rng: random.Random, unit: Unit, specialty: str, starts_at: datetime) -> Shift:
    urgency = rng.choices(("low", "medium", "high"), weights=(0.25, 0.45, 0.30))[0]
    lead_minutes = int(min(336 * 60, 6 * 60 + rng.expovariate(1 / 3600)))
    return Shift(
        id=_new_id(rng),
        unit_id=unit.id,
        source_request_id=None,
        specialty=specialty,
        starts_at=starts_at,
        ends_at=starts_at + timedelta(hours=12),
        period=shift_period(starts_at),
        is_weekend=starts_at.weekday() >= 5,
        urgency=urgency,
        status="open",
        published_at=starts_at - timedelta(minutes=lead_minutes),
        filled_at=None,
    )


def _make_shifts(rng: random.Random, params: dict[str, Any], units: list[Unit]) -> list[Shift]:
    day = date.fromisoformat(params["start_date"])
    last = date.fromisoformat(params["end_date"])
    shifts: list[Shift] = []
    while day <= last:
        for unit in units:
            for specialty in SPECIALTIES:
                if rng.random() < params["p_night_shift"]:
                    shifts.append(_new_shift(rng, unit, specialty, datetime.combine(day, time(19))))
                if day.weekday() >= 5 and rng.random() < params["p_weekend_day_shift"]:
                    shifts.append(_new_shift(rng, unit, specialty, datetime.combine(day, time(7))))
        day += timedelta(days=1)
    shifts.sort(key=lambda s: (s.published_at, s.id))
    return shifts


def _make_requests(
    rng: random.Random, params: dict[str, Any], shifts: list[Shift], units: dict[str, Unit]
) -> tuple[list[ShiftRequest], list[Shift]]:
    count = min(params["text_requests"], len(shifts))
    chosen = sorted(rng.sample(range(len(shifts)), k=count))
    adversarial = round(count * 0.15)
    styles = ["adversarial"] * adversarial
    styles += rng.choices(
        ("formal", "abreviado", "com_erros", "ambiguo"),
        weights=(0.35, 0.30, 0.20, 0.15),
        k=count - adversarial,
    )
    rng.shuffle(styles)
    updated = list(shifts)
    requests: list[ShiftRequest] = []
    attack_index = 0
    for position, shift_index in enumerate(chosen):
        shift = shifts[shift_index]
        style = styles[position]
        attack = None
        if style == "adversarial":
            attack = ATTACK_TYPES[attack_index % len(ATTACK_TYPES)]
            attack_index += 1
        request = ShiftRequest(
            id=_new_id(rng),
            unit_id=shift.unit_id,
            coordinator_pseudo_id=_new_id(rng),
            created_at=shift.published_at,
            raw_text=make_request_text(
                rng, style, shift, units[shift.unit_id], shift.published_at, attack
            ),
            style=style,
            gt_unit_id=shift.unit_id,
            gt_specialty=shift.specialty,
            gt_starts_at=shift.starts_at,
            gt_ends_at=shift.ends_at,
            gt_urgency=shift.urgency,
            is_adversarial=style == "adversarial",
            attack_type=attack,
        )
        requests.append(request)
        updated[shift_index] = replace(shift, source_request_id=request.id)
    return requests, updated


def _decline_reason(conflict: bool, covered: bool, dist: float, radius: float, gap: float) -> str:
    if conflict or not covered:
        return "schedule"
    if dist > min(radius, 15.0):
        return "distance"
    if gap < 24:
        return "fatigue"
    return "other"


def _simulate_offers(
    rng: random.Random,
    params: dict[str, Any],
    doctors: dict[str, Doctor],
    windows: dict[str, list[Window]],
    latent: dict[str, float],
    units: dict[str, Unit],
    shifts: list[Shift],
    policy: Policy,
) -> tuple[list[Offer], list[Shift]]:
    accept = params["accept"]
    ttl = params["ttl_minutes"]
    bias = params["historical_bias_scenario"]
    state: dict[str, list[tuple[datetime, datetime, bool]]] = {d: [] for d in doctors}
    distances: dict[tuple[str, str], float] = {}
    exposure = {
        doctor_id: (params["zone_exposure"][d.home_zone] * params["age_exposure"][d.age_band])
        if bias
        else 1.0
        for doctor_id, d in doctors.items()
    }
    offers: list[Offer] = []
    final_shifts: list[Shift] = []
    for shift in shifts:
        unit = units[shift.unit_id]
        duration = _hours(shift.ends_at - shift.starts_at)
        pool: list[Doctor] = []
        weights: list[float] = []
        for doctor in doctors.values():
            match = specialty_match_value(doctor, shift.specialty, policy)
            if doctor.crm_status != "active" or match == 0.0:
                continue
            key = (doctor.id, unit.id)
            if key not in distances:
                distances[key] = distance_km(doctor, unit)
            proximity = 1.0 / (1.0 + distances[key] / 10.0)
            # No processo manual a coordenação chama quem já está no hospital ("dobra").
            at_hospital = any(e == shift.starts_at for _, e, _ in state[doctor.id])
            boost = params["double_shift_boost"] if at_hospital else 1.0
            pool.append(doctor)
            weights.append(
                exposure[doctor.id] * proximity * (1.0 if match == 1.0 else 0.3) * boost
            )
        sent_at = shift.published_at + timedelta(minutes=rng.randint(5, 30))
        filled_at: datetime | None = None
        for sequence in range(1, params["max_offers_per_shift"] + 1):
            if not pool:
                break
            index = rng.choices(range(len(pool)), weights=weights)[0]
            doctor = pool.pop(index)
            weights.pop(index)
            reliability = latent[doctor.id]
            dist = distances[(doctor.id, unit.id)]
            intervals = [(s, e) for s, e, _ in state[doctor.id]]
            conflict = any(s < shift.ends_at and e > shift.starts_at for s, e in intervals)
            previous = [e for _, e in intervals if e <= shift.starts_at]
            gap = min(168.0, _hours(shift.starts_at - max(previous))) if previous else 168.0
            overlap = availability_overlap_hours(
                windows.get(doctor.id, []), shift.starts_at, shift.ends_at
            )
            covered = overlap >= duration - 1e-9
            recent = sum(
                1
                for _, e, attended_before in state[doctor.id]
                if attended_before and sent_at - timedelta(days=30) <= e <= sent_at
            )
            probability = truth.p_accept(
                accept,
                distance_km=dist,
                preference_match=preference_match(doctor, shift.starts_at),
                reliability=reliability,
                covered=covered,
                hours_since_last=gap,
                shifts_last_30d=recent,
                urgency=shift.urgency,
                specialty_match=specialty_match_value(doctor, shift.specialty, policy),
            )
            accepted = (not conflict) and rng.random() < probability
            responded_at: datetime | None = None
            attended: bool | None = None
            reason: str | None = None
            if accepted:
                response = "accepted"
                delay = min(ttl - 1, int(rng.expovariate(1 / 20)))
                responded_at = sent_at + timedelta(minutes=delay)
                attended = rng.random() < truth.p_attend(reliability)
            elif conflict or rng.random() < 0.7:
                response = "declined"
                delay = min(ttl - 1, int(rng.expovariate(1 / 20)))
                responded_at = sent_at + timedelta(minutes=delay)
                reason = _decline_reason(conflict, covered, dist, doctor.max_radius_km, gap)
            else:
                response = "expired"
            violation = False
            if accepted:
                code, _alerts = schedule_check(intervals, shift.starts_at, shift.ends_at, policy)
                violation = code in ("rest_violation", "continuous_hours_exceeded")
            offer = Offer(
                id=_new_id(rng),
                shift_id=shift.id,
                doctor_id=doctor.id,
                sequence_no=sequence,
                selection_source="manual_history",
                sent_at=sent_at,
                ttl_minutes=ttl,
                responded_at=responded_at,
                response=response,
                decline_reason=reason,
                accepted=accepted,
                attended=attended,
                y_success=bool(accepted and attended),
                injected_violation=violation,
            )
            offers.append(offer)
            if accepted:
                state[doctor.id].append((shift.starts_at, shift.ends_at, bool(attended)))
                filled_at = responded_at
                break
            sent_at = offer.resolved_at + timedelta(minutes=rng.randint(1, 10))
        status = "filled" if filled_at else "uncovered"
        final_shifts.append(replace(shift, status=status, filled_at=filled_at))
    return offers, final_shifts


def generate(params: dict[str, Any]) -> Dataset:
    """Gera todas as tabelas em memória a partir dos parâmetros (e da semente)."""
    rng = random.Random(params["seed"])
    start = date.fromisoformat(params["start_date"])
    organization = Organization(
        id=_new_id(rng),
        name="Rede Hospitalar Modelo",
        kind="rede_hospitais_privados",
        created_at=datetime.combine(start, time(0)),
    )
    units = _make_units(rng, organization.id)
    doctors, windows, latent = _make_doctors(rng, params)
    policy = Policy(
        organization_id=organization.id,
        max_continuous_hours=24,
        min_rest_hours=11,
        allow_secondary_specialty=True,
        min_overlap_ratio=1.0,
        default_radius_km=15.0,
        offer_ttl_minutes=params["ttl_minutes"],
        top_k=5,
        effective_from=start,
    )
    shifts = _make_shifts(rng, params, list(units.values()))
    requests, shifts = _make_requests(rng, params, shifts, units)
    offers, shifts = _simulate_offers(
        rng, params, doctors, windows, latent, units, shifts, policy
    )
    compensation = {s.id: round(rng.uniform(1200.0, 2600.0), 2) for s in shifts}
    return Dataset(
        organizations=[organization],
        units=units,
        doctors=doctors,
        windows=windows,
        shifts={s.id: s for s in shifts},
        requests=requests,
        offers=offers,
        policy=policy,
        compensation=compensation,
        latent=latent,
    )


def save_dataset(dataset: Dataset, directory: Path) -> dict[str, int]:
    """Grava os CSVs e devolve a contagem de linhas por tabela."""
    directory.mkdir(parents=True, exist_ok=True)
    tables: dict[str, list[Any]] = {
        "organizations": dataset.organizations,
        "units": list(dataset.units.values()),
        "doctors": list(dataset.doctors.values()),
        "doctor_availability": [w for rows in dataset.windows.values() for w in rows],
        "shifts": list(dataset.shifts.values()),
        "shift_requests": dataset.requests,
        "offers": dataset.offers,
        "policy_config": [dataset.policy],
        "shift_compensation": [Compensation(k, v) for k, v in dataset.compensation.items()],
        "doctors_latent": [DoctorLatent(k, v) for k, v in dataset.latent.items()],
    }
    for name, rows in tables.items():
        write_table(directory / f"{name}.csv", TABLES[name], rows)
    return {name: len(rows) for name, rows in tables.items()}


def write_manifest(directory: Path, params: dict[str, Any], counts: dict[str, int]) -> dict:
    checksums = {
        name: hashlib.sha256((directory / f"{name}.csv").read_bytes()).hexdigest()
        for name in counts
    }
    manifest = {
        "label": "simulacao",
        "dictionary_version": DICTIONARY_VERSION,
        "generator_version": GENERATOR_VERSION,
        "python": sys.version.split()[0],
        "seed": params["seed"],
        "params": params,
        "row_counts": counts,
        "sha256": checksums,
    }
    path = directory / "dataset_manifest.json"
    path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True), encoding="utf-8"
    )
    return manifest


def generate_sample(directory: Path, params_path: Path | None = None) -> dict[str, int]:
    """Gera um conjunto pequeno e íntegro (duas semanas) para testes rápidos das frentes."""
    overrides = {
        "n_doctors": 40,
        "start_date": "2026-09-01",
        "end_date": "2026-09-14",
        "test_start": "2026-09-10",
        "text_requests": 30,
    }
    params = load_params(params_path, overrides)
    dataset = generate(params)
    counts = save_dataset(dataset, directory)
    (directory / "doctors_latent.csv").unlink()
    counts.pop("doctors_latent")
    write_manifest(directory, params, counts)
    return counts
