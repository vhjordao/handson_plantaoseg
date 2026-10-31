"""Avaliação do ranking: baseline x modelo, em dados sintéticos (simulação).

Duas medidas, ambas com o rótulo "simulação":

* **Observacional:** AUC sobre as ofertas do período de teste (só há resposta de quem foi
  chamado; viés de seleção do processo manual).
* **Contrafactual:** como o simulador conhece a chance verdadeira de cada médico, mede-se a
  chance média de sucesso dos 5 recomendados entre *todos* os elegíveis, contra o oráculo (os
  5 melhores de verdade), o baseline e um sorteio. Só é possível em simulação.
"""

import math
import statistics
from collections import Counter
from datetime import datetime
from typing import Any

from app.models import Dataset, Doctor, Offer, Shift
from app.ranking.baseline import baseline_score
from app.ranking.compute import FeatureStore
from app.ranking.model import LogisticModel, train_model
from app.rules import evaluate_candidate
from app.synthetic import truth

TOP_K = 5
GROUP_ATTRIBUTES = ("gender", "age_band", "home_zone")


def auc(scores: list[float], labels: list[bool]) -> float:
    """Área sob a curva ROC pela estatística de soma de postos (empates pelo posto médio)."""
    n = len(scores)
    order = sorted(range(n), key=scores.__getitem__)
    ranks = [0.0] * n
    start = 0
    while start < n:
        end = start
        while end + 1 < n and scores[order[end + 1]] == scores[order[start]]:
            end += 1
        average = (start + end) / 2 + 1
        for position in range(start, end + 1):
            ranks[order[position]] = average
        start = end + 1
    positives = sum(1 for y in labels if y)
    negatives = n - positives
    if positives == 0 or negatives == 0:
        return float("nan")
    rank_sum = sum(r for r, y in zip(ranks, labels, strict=True) if y)
    return (rank_sum - positives * (positives + 1) / 2) / (positives * negatives)


def offer_features(dataset: Dataset, store: FeatureStore, offer: Offer) -> dict[str, float]:
    shift = dataset.shifts[offer.shift_id]
    return store.features(
        dataset.doctors[offer.doctor_id],
        specialty=shift.specialty,
        starts_at=shift.starts_at,
        ends_at=shift.ends_at,
        unit=dataset.units[shift.unit_id],
        policy=dataset.policy,
        t=offer.sent_at,
    )


def training_set(
    dataset: Dataset, store: FeatureStore, offers: list[Offer]
) -> tuple[list[dict[str, float]], list[bool]]:
    rows = [offer_features(dataset, store, offer) for offer in offers]
    return rows, [offer.y_success for offer in offers]


def _mean(values: list[float]) -> float:
    return sum(values) / len(values) if values else float("nan")


def _standard_error(values: list[float]) -> float:
    return statistics.stdev(values) / math.sqrt(len(values)) if len(values) > 1 else float("nan")


def eligible_pool(
    dataset: Dataset, store: FeatureStore, shift: Shift
) -> list[tuple[Doctor, dict[str, float]]]:
    """Médicos elegíveis para a vaga, vistos no instante da publicação, com as suas variáveis."""
    unit = dataset.units[shift.unit_id]
    moment = shift.published_at
    pool: list[tuple[Doctor, dict[str, float]]] = []
    for doctor in dataset.doctors.values():
        check = evaluate_candidate(
            doctor,
            specialty=shift.specialty,
            starts_at=shift.starts_at,
            ends_at=shift.ends_at,
            unit=unit,
            policy=dataset.policy,
            windows=dataset.windows.get(doctor.id, []),
            assignments=store.assignments_at(doctor.id, moment),
        )
        if not check.eligible:
            continue
        features = store.features(
            doctor,
            specialty=shift.specialty,
            starts_at=shift.starts_at,
            ends_at=shift.ends_at,
            unit=unit,
            policy=dataset.policy,
            t=moment,
        )
        pool.append((doctor, features))
    return pool


def truth_state(features: dict[str, float], shift: Shift, duration: float) -> dict[str, Any]:
    """Estado do par médico-vaga que o simulador usa para a chance verdadeira (`truth.py`)."""
    return {
        "distance_km": features["distance_km"],
        "preference_match": features["night_shift_preference_match"],
        "covered": features["availability_overlap_hours"] >= duration - 1e-9,
        "hours_since_last": features["hours_since_last_shift"],
        "shifts_last_30d": features["shifts_last_30d"],
        "urgency": shift.urgency,
        "specialty_match": features["specialty_match"],
    }


def counterfactual(
    dataset: Dataset,
    store: FeatureStore,
    model: LogisticModel,
    accept_params: dict[str, Any],
    shifts: list[Shift],
    top_k: int = TOP_K,
) -> tuple[dict[str, float], dict[str, Any]]:
    """Chance média de sucesso do top-k entre os elegíveis, contra oráculo, baseline e sorteio."""
    per_shift: list[dict[str, float]] = []
    counters: dict[str, dict[str, Counter]] = {
        attr: {"pool": Counter(), "model": Counter(), "baseline": Counter()}
        for attr in GROUP_ATTRIBUTES
    }
    appearances: dict[str, Counter] = {"model": Counter(), "baseline": Counter()}
    ever_eligible: set[str] = set()
    for shift in shifts:
        duration = (shift.ends_at - shift.starts_at).total_seconds() / 3600
        pool: list[tuple[str, float, float, float]] = []
        for doctor, f in eligible_pool(dataset, store, shift):
            chance = truth.p_success(
                accept_params,
                reliability=dataset.latent[doctor.id],
                **truth_state(f, shift, duration),
            )
            base = baseline_score(f, radius_km=doctor.max_radius_km, duration_h=duration)
            pool.append((doctor.id, chance, model.probability(f), base))
        if len(pool) < top_k:
            continue
        by_chance = sorted(pool, key=lambda row: (-row[1], row[0]))[:top_k]
        by_model = sorted(pool, key=lambda row: (-row[2], row[0]))[:top_k]
        by_base = sorted(pool, key=lambda row: (-row[3], row[0]))[:top_k]
        per_shift.append(
            {
                "pool": float(len(pool)),
                "oracle": _mean([row[1] for row in by_chance]),
                "model": _mean([row[1] for row in by_model]),
                "baseline": _mean([row[1] for row in by_base]),
                "random": _mean([row[1] for row in pool]),
            }
        )
        appearances["model"].update(row[0] for row in by_model)
        appearances["baseline"].update(row[0] for row in by_base)
        ever_eligible.update(row[0] for row in pool)
        for attr in GROUP_ATTRIBUTES:
            counters[attr]["pool"].update(getattr(dataset.doctors[r[0]], attr) for r in pool)
            counters[attr]["model"].update(getattr(dataset.doctors[r[0]], attr) for r in by_model)
            counters[attr]["baseline"].update(
                getattr(dataset.doctors[r[0]], attr) for r in by_base
            )
    column = {key: [row[key] for row in per_shift] for key in per_shift[0]} if per_shift else {}
    model_col, base_col = column.get("model", []), column.get("baseline", [])
    diffs = [m - b for m, b in zip(model_col, base_col, strict=True)]
    summary = {
        "n_shifts": float(len(per_shift)),
        "mean_pool": _mean(column.get("pool", [])),
        "oracle": _mean(column.get("oracle", [])),
        "model": _mean(column.get("model", [])),
        "baseline": _mean(column.get("baseline", [])),
        "random": _mean(column.get("random", [])),
        "model_minus_baseline": _mean(diffs),
        "model_minus_baseline_se": _standard_error(diffs),
    }
    for name in ("model", "baseline", "random"):
        summary[f"{name}_efficiency"] = summary[name] / summary["oracle"]
    top_n = max(1, round(0.1 * len(dataset.doctors)))
    for name in ("model", "baseline"):
        counts = appearances[name]
        slots = sum(counts.values()) or 1
        summary[f"{name}_top10pct_share"] = sum(c for _, c in counts.most_common(top_n)) / slots
        summary[f"{name}_never_recommended"] = float(len(ever_eligible - set(counts)))
    summary["ever_eligible"] = float(len(ever_eligible))
    return summary, {"counters": counters}


def fairness_table(counters: dict[str, dict[str, Counter]]) -> list[dict[str, Any]]:
    """Participação no top-5 em relação à participação no conjunto de elegíveis."""
    rows: list[dict[str, Any]] = []
    for attr, groups in counters.items():
        totals = {name: sum(counter.values()) or 1 for name, counter in groups.items()}
        for value in sorted(groups["pool"]):
            pool_share = groups["pool"][value] / totals["pool"]
            model_share = groups["model"][value] / totals["model"]
            base_share = groups["baseline"][value] / totals["baseline"]
            rows.append(
                {
                    "attribute": attr,
                    "value": value,
                    "pool_share": pool_share,
                    "model_share": model_share,
                    "baseline_share": base_share,
                    "model_ratio": model_share / pool_share if pool_share else float("nan"),
                    "baseline_ratio": base_share / pool_share if pool_share else float("nan"),
                }
            )
    return rows


def evaluate(
    dataset: Dataset, params: dict[str, Any], version: str = "logreg-v1"
) -> tuple[LogisticModel, dict[str, Any]]:
    """Treina no passado, avalia no período de teste e devolve o modelo e as métricas."""
    test_start = datetime.fromisoformat(params["test_start"])
    store = FeatureStore(dataset)
    train_offers = [o for o in dataset.offers if o.sent_at < test_start]
    test_offers = [o for o in dataset.offers if o.sent_at >= test_start]
    train_rows, train_labels = training_set(dataset, store, train_offers)
    model = train_model(train_rows, train_labels, version)
    test_rows, test_labels = training_set(dataset, store, test_offers)
    model_scores = [model.probability(f) for f in test_rows]
    base_scores = []
    for offer, f in zip(test_offers, test_rows, strict=True):
        shift = dataset.shifts[offer.shift_id]
        duration = (shift.ends_at - shift.starts_at).total_seconds() / 3600
        radius = dataset.doctors[offer.doctor_id].max_radius_km
        base_scores.append(baseline_score(f, radius_km=radius, duration_h=duration))
    test_shifts = [s for s in dataset.shifts.values() if s.published_at >= test_start]
    summary, extra = counterfactual(dataset, store, model, params["accept"], test_shifts)
    metrics: dict[str, Any] = {
        "label": "simulacao",
        "model_version": version,
        "test_start": params["test_start"],
        "n_train_offers": len(train_offers),
        "n_test_offers": len(test_offers),
        "train_success_rate": _mean([float(y) for y in train_labels]),
        "test_success_rate": _mean([float(y) for y in test_labels]),
        "auc_model": auc(model_scores, test_labels),
        "auc_baseline": auc(base_scores, test_labels),
        "counterfactual": summary,
        "fairness": fairness_table(extra["counters"]),
        "coefficients": sorted(
            (
                {"feature": name, "weight": weight}
                for name, weight in zip(model.feature_names, model.weights[1:], strict=True)
            ),
            key=lambda item: -abs(item["weight"]),
        ),
    }
    return model, metrics
