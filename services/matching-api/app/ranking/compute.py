"""Variáveis do ranking calculadas no instante da oferta (sem vazamento do futuro).

Regra de ouro: para uma oferta enviada em `t`, só entram dados cujo resultado já era conhecido
antes de `t` (`resolved_at < t`). A própria oferta nunca entra na sua conta.
"""

from dataclasses import dataclass
from datetime import datetime, timedelta

from app.models import Dataset, Doctor, Policy, Unit
from app.ranking.features import CONTEXT_VARIABLES, RANKING_FEATURES
from app.rules import (
    availability_overlap_hours,
    distance_km,
    preference_match,
    specialty_match_value,
)

HOURS_CAP = 168.0


@dataclass(frozen=True, slots=True)
class HistoryRow:
    """Uma oferta já enviada a um médico, com o resultado e o horário da vaga."""

    sent_at: datetime
    resolved_at: datetime
    accepted: bool
    attended: bool | None
    starts_at: datetime
    ends_at: datetime


class FeatureStore:
    """Índice do histórico por médico para calcular as variáveis em qualquer instante."""

    def __init__(self, dataset: Dataset) -> None:
        self.dataset = dataset
        rows: dict[str, list[HistoryRow]] = {}
        for offer in sorted(dataset.offers, key=lambda o: o.sent_at):
            shift = dataset.shifts[offer.shift_id]
            rows.setdefault(offer.doctor_id, []).append(
                HistoryRow(
                    sent_at=offer.sent_at,
                    resolved_at=offer.resolved_at,
                    accepted=offer.accepted,
                    attended=offer.attended,
                    starts_at=shift.starts_at,
                    ends_at=shift.ends_at,
                )
            )
        self._rows = rows

    def assignments_at(self, doctor_id: str, t: datetime) -> list[tuple[datetime, datetime]]:
        """Plantões aceitos e conhecidos antes de `t` (a agenda usada pelas regras)."""
        return [
            (r.starts_at, r.ends_at)
            for r in self._rows.get(doctor_id, [])
            if r.accepted and r.resolved_at < t
        ]

    def features(
        self,
        doctor: Doctor,
        *,
        specialty: str,
        starts_at: datetime,
        ends_at: datetime,
        unit: Unit,
        policy: Policy,
        t: datetime,
    ) -> dict[str, float]:
        """Variáveis de um médico para uma vaga, vistas em `t`.

        Devolve as de `RANKING_FEATURES` e também as de `CONTEXT_VARIABLES` (carga e exposição).
        O modelo usa só as primeiras (`LogisticModel.feature_names`); as de contexto alimentam
        os alertas de jornada e a avaliação em simulação.
        """
        rows = self._rows.get(doctor.id, [])
        since_90 = t - timedelta(days=90)
        since_30 = t - timedelta(days=30)
        resolved = [r for r in rows if since_90 <= r.resolved_at < t]
        accepted = sum(1 for r in resolved if r.accepted)
        finished = [r for r in rows if r.accepted and since_90 <= r.ends_at < t]
        attended = sum(1 for r in finished if r.attended)
        previous_ends = [
            r.ends_at
            for r in rows
            if r.accepted and r.resolved_at < t and r.ends_at <= starts_at
        ]
        if previous_ends:
            hours_since = min(HOURS_CAP, (starts_at - max(previous_ends)).total_seconds() / 3600)
        else:
            hours_since = HOURS_CAP
        values = {
            "specialty_match": specialty_match_value(doctor, specialty, policy),
            "distance_km": distance_km(doctor, unit),
            "availability_overlap_hours": availability_overlap_hours(
                self.dataset.windows.get(doctor.id, []), starts_at, ends_at
            ),
            "acceptance_rate_90d": (accepted + 1) / (len(resolved) + 2),
            "attendance_rate_90d": (attended + 1) / (len(finished) + 2),
            "hours_since_last_shift": hours_since,
            "shifts_last_30d": float(
                sum(1 for r in rows if r.accepted and r.attended and since_30 <= r.ends_at < t)
            ),
            "offers_received_30d": float(sum(1 for r in rows if since_30 <= r.sent_at < t)),
            "night_shift_preference_match": preference_match(doctor, starts_at),
        }
        return {name: values[name] for name in (*RANKING_FEATURES, *CONTEXT_VARIABLES)}
