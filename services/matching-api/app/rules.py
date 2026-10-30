"""Filtro determinístico de elegibilidade e jornada.

Código decide, o LLM não participa. Cada candidato barrado recebe o código e o texto da
primeira regra que o excluiu. Os limites de jornada vêm de `Policy` (padrão: 24 h contínuas
e 11 h de descanso, configuração do projeto e não norma verificada; validar com jurídico).
"""

from dataclasses import dataclass
from datetime import date, datetime, timedelta

from app.geo import haversine_km
from app.models import Doctor, Policy, Unit, Window

RULE_TEXTS: dict[str, str] = {
    "crm_inactive": "CRM não está ativo",
    "specialty_mismatch": "Especialidade diferente da vaga",
    "outside_radius": "Fora do raio de deslocamento do médico",
    "unavailable": "Sem disponibilidade declarada para o horário da vaga",
    "schedule_conflict": "Já tem plantão no mesmo horário",
    "continuous_hours_exceeded": "Passaria do limite de horas contínuas",
    "rest_violation": "Descanso mínimo entre plantões não respeitado",
}

Interval = tuple[datetime, datetime]


@dataclass(frozen=True, slots=True)
class Check:
    """Resultado da avaliação de um candidato para uma vaga."""

    eligible: bool
    rule_code: str | None
    rule_text: str | None
    alerts: tuple[str, ...]
    distance_km: float
    overlap_hours: float
    specialty_match: float


def _hours(delta: timedelta) -> float:
    return delta.total_seconds() / 3600


def distance_km(doctor: Doctor, unit: Unit) -> float:
    return haversine_km(doctor.home_lat, doctor.home_lon, unit.lat, unit.lon)


def shift_period(starts_at: datetime) -> str:
    """`night` para plantões que começam entre 19h e 7h; `day` nos demais."""
    return "night" if starts_at.hour >= 19 or starts_at.hour < 7 else "day"


def preference_match(doctor: Doctor, starts_at: datetime) -> float:
    """1,0 se o período da vaga coincide com a preferência do médico."""
    preferred = doctor.preferred_period
    weekend = starts_at.weekday() >= 5
    if preferred == "any" or preferred == shift_period(starts_at):
        return 1.0
    return 1.0 if preferred == "weekend" and weekend else 0.0


def specialty_match_value(doctor: Doctor, specialty: str, policy: Policy) -> float:
    """1,0 se a especialidade principal bate; 0,5 se só a secundária (e a política permite)."""
    if doctor.specialty == specialty:
        return 1.0
    if policy.allow_secondary_specialty and doctor.secondary_specialty == specialty:
        return 0.5
    return 0.0


def availability_overlap_hours(windows: list[Window], start: datetime, end: datetime) -> float:
    """Horas da vaga cobertas pelas janelas `available`, descontados os dias `blocked`."""
    blocked: set[date] = {w.on_date for w in windows if w.kind == "blocked" and w.on_date}
    available = [w for w in windows if w.kind == "available"]
    total = 0.0
    day = start.date() - timedelta(days=1)
    while day <= end.date():
        if day not in blocked:
            for window in available:
                if window.weekday != day.weekday():
                    continue
                win_start = datetime.combine(day, window.start_time)
                win_end = datetime.combine(day, window.end_time)
                if win_end <= win_start:
                    win_end += timedelta(days=1)
                low, high = max(win_start, start), min(win_end, end)
                if high > low:
                    total += _hours(high - low)
        day += timedelta(days=1)
    return total


def contiguous_hours(assignments: list[Interval], start: datetime, end: datetime) -> float:
    """Horas contínuas da cadeia de plantões colados (sem intervalo) que inclui a vaga."""
    chain = _hours(end - start)
    cursor = start
    extended = True
    while extended:
        extended = False
        for a_start, a_end in assignments:
            if a_end == cursor:
                chain += _hours(a_end - a_start)
                cursor = a_start
                extended = True
                break
    cursor = end
    extended = True
    while extended:
        extended = False
        for a_start, a_end in assignments:
            if a_start == cursor:
                chain += _hours(a_end - a_start)
                cursor = a_end
                extended = True
                break
    return chain


def schedule_check(
    assignments: list[Interval], start: datetime, end: datetime, policy: Policy
) -> tuple[str | None, tuple[str, ...]]:
    """Confere conflito, horas contínuas e descanso. Devolve (código da regra, alertas)."""
    for a_start, a_end in assignments:
        if a_start < end and a_end > start:
            return "schedule_conflict", ()
    chain = contiguous_hours(assignments, start, end)
    if chain > policy.max_continuous_hours:
        return "continuous_hours_exceeded", ()
    gaps: list[float] = []
    previous_ends = [a_end for _, a_end in assignments if a_end <= start]
    following_starts = [a_start for a_start, _ in assignments if a_start >= end]
    if previous_ends:
        gaps.append(_hours(start - max(previous_ends)))
    if following_starts:
        gaps.append(_hours(min(following_starts) - end))
    if any(0 < gap < policy.min_rest_hours for gap in gaps):
        return "rest_violation", ()
    alerts: list[str] = []
    if chain > _hours(end - start):
        alerts.append(f"plantão colado a outro: {chain:.0f} h contínuas")
    if chain >= policy.max_continuous_hours:
        alerts.append(f"atinge o limite de {policy.max_continuous_hours} h contínuas")
    for gap in gaps:
        if policy.min_rest_hours <= gap < policy.min_rest_hours + 3:
            alerts.append(
                f"descanso de {gap:.0f} h, perto do mínimo de {policy.min_rest_hours} h"
            )
    return None, tuple(alerts)


def evaluate_candidate(
    doctor: Doctor,
    *,
    specialty: str,
    starts_at: datetime,
    ends_at: datetime,
    unit: Unit,
    policy: Policy,
    windows: list[Window],
    assignments: list[Interval],
) -> Check:
    """Aplica as regras na ordem e devolve a primeira que barra, ou o candidato elegível."""
    dist = distance_km(doctor, unit)
    duration = _hours(ends_at - starts_at)
    match = specialty_match_value(doctor, specialty, policy)

    def fail(code: str, overlap: float = 0.0) -> Check:
        return Check(False, code, RULE_TEXTS[code], (), dist, overlap, match)

    if doctor.crm_status != "active":
        return fail("crm_inactive")
    if match == 0.0:
        return fail("specialty_mismatch")
    if dist > (doctor.max_radius_km or policy.default_radius_km):
        return fail("outside_radius")
    overlap = availability_overlap_hours(windows, starts_at, ends_at)
    if overlap < policy.min_overlap_ratio * duration - 1e-9:
        return fail("unavailable", overlap)
        return fail("unavailable")
    code, alerts = schedule_check(assignments, starts_at, ends_at, policy)
    if code:
        return fail(code)
    return Check(True, None, None, alerts, dist, overlap, match)
