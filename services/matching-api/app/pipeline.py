"""Pipeline de recomendação: regras, variáveis, ranking, explicação e auditoria.

A IA recomenda, o humano decide: `recommend` só devolve candidatos; a oferta depende de
`approve`, que registra a decisão do coordenador na trilha de auditoria.
"""

import hashlib
from collections import Counter
from dataclasses import dataclass
from datetime import datetime

from app.audit import AuditLog
from app.explain import Explanation, explain
from app.llm.client import LLMClient
from app.llm.guardrails import ShiftFields
from app.models import Dataset, Unit
from app.ranking.compute import FeatureStore
from app.ranking.features import RANKING_FEATURES
from app.ranking.model import LogisticModel
from app.rules import evaluate_candidate

# A partir desta carga (plantões atendidos em 30 dias) o candidato recebe um alerta de jornada.
HIGH_LOAD_30D = 8


@dataclass(frozen=True, slots=True)
class Candidate:
    rank: int
    doctor_id: str
    score: float
    features: dict[str, float]
    contributions: dict[str, float]
    alerts: tuple[str, ...]
    explanation: Explanation
    explanation_fallback: str | None


@dataclass(frozen=True, slots=True)
class Exclusion:
    doctor_id: str
    rule_code: str
    rule_text: str


@dataclass
class Recommendation:
    shift_key: str
    fields: ShiftFields
    unit: Unit
    model_version: str
    now: datetime
    pool_size: int
    eligible_count: int
    candidates: list[Candidate]
    exclusions: list[Exclusion]

    def exclusion_counts(self) -> dict[str, int]:
        return dict(Counter(e.rule_code for e in self.exclusions).most_common())


def shift_key(fields: ShiftFields) -> str:
    """Identificador estável da vaga ainda não publicada, derivado dos campos conferidos."""
    base = f"{fields.unit_id}|{fields.specialty}|{fields.starts_at}|{fields.ends_at}"
    return "vaga-" + hashlib.sha256(base.encode("utf-8")).hexdigest()[:12]


def recommend(
    dataset: Dataset,
    store: FeatureStore,
    model: LogisticModel,
    fields: ShiftFields,
    now: datetime,
    *,
    top_k: int | None = None,
    client: LLMClient | None = None,
    audit: AuditLog | None = None,
) -> Recommendation:
    """Filtra os elegíveis, ranqueia, explica e registra. Não envia nenhuma oferta."""
    unit_id, specialty = fields.unit_id, fields.specialty
    starts_at, ends_at = fields.starts_at, fields.ends_at
    if unit_id is None or specialty is None or starts_at is None or ends_at is None:
        raise ValueError("faltam campos obrigatórios: " + ", ".join(fields.missing_required()))
    unit = dataset.units[unit_id]
    limit = top_k or dataset.policy.top_k
    key = shift_key(fields)
    exclusions: list[Exclusion] = []
    scored: list[tuple[float, str, dict[str, float], tuple[str, ...]]] = []
    for doctor in dataset.doctors.values():
        check = evaluate_candidate(
            doctor,
            specialty=specialty,
            starts_at=starts_at,
            ends_at=ends_at,
            unit=unit,
            policy=dataset.policy,
            windows=dataset.windows.get(doctor.id, []),
            assignments=store.assignments_at(doctor.id, now),
        )
        if not check.eligible:
            exclusions.append(Exclusion(doctor.id, check.rule_code or "", check.rule_text or ""))
            continue
        features = store.features(
            doctor,
            specialty=specialty,
            starts_at=starts_at,
            ends_at=ends_at,
            unit=unit,
            policy=dataset.policy,
            t=now,
        )
        alerts = check.alerts
        load = features["shifts_last_30d"]
        if load >= HIGH_LOAD_30D:
            alerts = (*alerts, f"carga recente alta: {load:.0f} plantões nos últimos 30 dias")
        scored.append((model.probability(features), doctor.id, features, alerts))
    scored.sort(key=lambda row: (-row[0], row[1]))
    reference = {
        name: sum(row[2][name] for row in scored) / len(scored) for name in RANKING_FEATURES
    } if scored else {}
    candidates: list[Candidate] = []
    for rank, (score, doctor_id, features, alerts) in enumerate(scored[:limit], start=1):
        contributions = model.contributions(features, reference)
        explanation, fallback = explain(features, contributions, client)
        candidates.append(
            Candidate(
                rank, doctor_id, score, features, contributions, alerts, explanation, fallback
            )
        )
    result = Recommendation(
        shift_key=key,
        fields=fields,
        unit=unit,
        model_version=model.version,
        now=now,
        pool_size=len(dataset.doctors),
        eligible_count=len(scored),
        candidates=candidates,
        exclusions=exclusions,
    )
    if audit is not None:
        audit.append(
            now=now,
            actor_role="system",
            actor_pseudo_id="matching-api",
            action="recommendation_generated",
            entity_type="shift",
            entity_id=key,
            model_version=model.version,
            details={
                "eligible": len(scored),
                "excluded": len(exclusions),
                "excluded_by_rule": result.exclusion_counts(),
                "top_doctor_ids": [c.doctor_id for c in candidates],
            },
        )
        for candidate in candidates:
            audit.append(
                now=now,
                actor_role="system",
                actor_pseudo_id="matching-api",
                action="explanation_generated",
                entity_type="recommendation",
                entity_id=f"{key}:{candidate.doctor_id}",
                model_version=model.version,
                details={
                    "rank": candidate.rank,
                    "source": candidate.explanation.source,
                    "factors_cited": list(candidate.explanation.factors_cited),
                    "fallback_reason": candidate.explanation_fallback,
                },
            )
    return result


def approve(
    audit: AuditLog,
    recommendation: Recommendation,
    approved_ids: list[str],
    *,
    now: datetime,
    coordinator_id: str,
    mode: str = "humano",
) -> dict:
    """Registra a decisão do coordenador. Sem este passo, nenhuma oferta pode sair."""
    shortlisted = {c.doctor_id for c in recommendation.candidates}
    if not approved_ids or not set(approved_ids) <= shortlisted:
        raise ValueError("só é possível aprovar candidatos recomendados")
    return audit.append(
        now=now,
        actor_role="coordinator",
        actor_pseudo_id=coordinator_id,
        action="recommendation_approved",
        entity_type="shift",
        entity_id=recommendation.shift_key,
        model_version=recommendation.model_version,
        details={"approved_doctor_ids": approved_ids, "mode": mode},
    )
