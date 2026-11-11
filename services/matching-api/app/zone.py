"""Experimento contra a exclusão por zona, em simulação (roteiro até o MVP, passo 7.3).

O experimento da concentração (`concentration.py`) mostrou que o rodízio reduz a concentração entre
pessoas, mas não a exclusão por zona: quem mora longe tem chance de aceite menor, quase nunca fica
perto da melhor e quase nunca aparece. O feedback da Entrega 3 perguntou se o rodízio resolve a
desigualdade entre regiões. Aqui se testam medidas que atacam isso, sobre o rodízio de hoje:

* **Limite ao peso da distância:** a penalidade da distância no score para de crescer a partir de
  um limite em km. Muda a ordem do modelo, então custa precisão.
* **Lugar de oportunidade:** um lugar do top-5 (o 2º ou o 3º) vai para quem tem menos aparições na
  semana e ainda tem chance razoável (a até `reach` da melhor). Não olha a zona.
* **Cota por zona (só referência):** o mesmo lugar vai para a zona menos presente até ali. Usa a
  zona para decidir, o que o projeto não faz, e entra só para mostrar o teto do que se ganharia.

Todas as políticas usam as mesmas vagas, na ordem de publicação, a mesma memória de exposição por
política e os mesmos sorteios da cascata. Vale o mesmo limite do `flow.py`: cada vaga usa a agenda
do histórico manual. Tudo é simulação com dados sintéticos.
"""

import math
import random
from collections import Counter
from collections.abc import Callable, Sequence
from dataclasses import dataclass
from datetime import datetime
from typing import Any

from app.concentration import REPS, ZONES_ATTRIBUTE, Candidate, ExposureWindow
from app.flow import cascade_expectation, simulate_cascade, top_share
from app.models import Dataset, Shift
from app.ranking.compute import FeatureStore
from app.ranking.evaluate import TOP_K, eligible_pool, truth_state
from app.ranking.model import LogisticModel
from app.ranking.rotation import ROTATION_DELTA, rotate, with_opportunity_slot
from app.synthetic import truth

# Os critérios de adoção, escritos antes de ver o resultado (combinados em 11/11/2026).
MIN_WORST_ZONE = 0.5  # a zona menos exposta chega a pelo menos metade do proporcional
MAX_EXTRA_LOSS = 0.02  # perde no máximo 2 pontos de chance de sucesso além do rodízio de hoje
ALERT_FLOOR = 0.5  # o alerta de revisão humana dispara abaixo disto, numa semana
REACH = 0.30  # alcance: a até 30 pontos de chance prevista da melhor
CURRENT = "rodizio10"
BASELINE = "hoje"


@dataclass(frozen=True)
class Eligible(Candidate):
    """O elegível da vaga, com a distância até o hospital (variável que já está no ranking)."""

    distance_km: float = 0.0


@dataclass(frozen=True)
class ZonePolicy:
    """Uma forma de ordenar. Todas, menos a de hoje, partem do rodízio de 10 pontos."""

    key: str
    label: str
    rotation: bool = True
    distance_cap_km: float | None = None
    slot: int | None = None
    reach: float | None = None
    by_zone: bool = False
    min_distance_km: float | None = None
    adoptable: bool = True


POLICIES: tuple[ZonePolicy, ...] = (
    ZonePolicy(BASELINE, "Hoje: só a ordem do modelo", rotation=False),
    ZonePolicy(CURRENT, "Rodízio de 10 pontos (o que está na API)"),
    ZonePolicy("dist10", "Rodízio e limite do peso da distância em 10 km", distance_cap_km=10),
    ZonePolicy("opp3", "Rodízio e lugar de oportunidade no 3º", slot=3, reach=REACH),
    ZonePolicy("opp2", "Rodízio e lugar de oportunidade no 2º", slot=2, reach=REACH),
    ZonePolicy(
        "longe3_d12",
        "Rodízio e 3º lugar para quem mora a 12 km ou mais",
        slot=3,
        reach=REACH,
        min_distance_km=12,
    ),
    ZonePolicy(
        "longe2_d10",
        "Rodízio e 2º lugar para quem mora a 10 km ou mais",
        slot=2,
        reach=REACH,
        min_distance_km=10,
    ),
    ZonePolicy(
        "longe2_d12",
        "Rodízio e 2º lugar para quem mora a 12 km ou mais",
        slot=2,
        reach=REACH,
        min_distance_km=12,
    ),
    ZonePolicy(
        "cota3",
        "Referência: cota por zona no 3º lugar (usa a zona; não é adotável)",
        slot=3,
        reach=REACH,
        by_zone=True,
        adoptable=False,
    ),
    ZonePolicy(
        "cota2",
        "Referência: cota por zona no 2º lugar (usa a zona; não é adotável)",
        slot=2,
        reach=REACH,
        by_zone=True,
        adoptable=False,
    ),
)

# O teto do peso da distância que cada política precisa (as caps diferentes pedem pools diferentes).
DISTANCE_CAPS: tuple[float | None, ...] = tuple(
    sorted({p.distance_cap_km for p in POLICIES}, key=lambda c: (c is not None, c or 0))
)


def build_pools(
    dataset: Dataset,
    store: FeatureStore,
    model: LogisticModel,
    params: dict[str, Any],
    shifts: Sequence[Shift],
    distance_cap_km: float | None,
) -> list[tuple[Shift, list[Eligible]]]:
    """Elegíveis de cada vaga, com a chance verdadeira e o score (com o limite da distância)."""
    pools: list[tuple[Shift, list[Eligible]]] = []
    for shift in shifts:
        duration = (shift.ends_at - shift.starts_at).total_seconds() / 3600
        rows: list[Eligible] = []
        for doctor, f in eligible_pool(dataset, store, shift):
            state = truth_state(f, shift, duration)
            reliability = dataset.latent[doctor.id]
            seen = f
            if distance_cap_km is not None and f["distance_km"] > distance_cap_km:
                seen = {**f, "distance_km": distance_cap_km}
            rows.append(
                Eligible(
                    doctor.id,
                    truth.p_accept(params["accept"], reliability=reliability, **state),
                    truth.p_success(params["accept"], reliability=reliability, **state),
                    model.probability(seen),
                    f["distance_km"],
                )
            )
        if len(rows) >= TOP_K:
            pools.append((shift, rows))
    return pools


class ZoneState:
    """O que a cota por zona (a referência) sabe: aparições e elegíveis por zona até ali."""

    def __init__(self) -> None:
        self.slots: Counter[str] = Counter()
        self.seen: Counter[str] = Counter()


def _quota_slot(
    ordered: list[Candidate],
    zone_of: Callable[[str], str],
    state: ZoneState,
    position: int,
    reach: float,
) -> list[Candidate]:
    """Referência: o lugar vai para quem é da zona menos presente no top-5 até ali."""
    result = list(ordered)
    index = position - 1
    if index <= 0 or index >= len(result):
        return result
    best = result[0].score
    options = [i for i in range(index, len(result)) if result[i].score >= best - reach]
    if not options:
        return result

    def presence(i: int) -> float:
        zone = zone_of(result[i].doctor_id)
        return state.slots[zone] / state.seen[zone] if state.seen[zone] else 0.0

    chosen = min(options, key=lambda i: (presence(i), -result[i].score, result[i].doctor_id))
    if chosen != index:
        result.insert(index, result.pop(chosen))
    return result


def order(
    candidates: Sequence[Candidate],
    exposure: dict[str, int],
    policy: ZonePolicy,
    zone_of: Callable[[str], str],
    state: ZoneState,
) -> list[Candidate]:
    """A ordem de chamada da política para uma vaga."""
    ordered = sorted(candidates, key=lambda c: (-c.score, c.doctor_id))
    if policy.rotation:
        ordered = rotate(
            ordered,
            score=lambda c: c.score,
            key=lambda c: c.doctor_id,
            exposure=exposure,
            delta=ROTATION_DELTA,
        )
    if policy.slot is not None and policy.reach is not None:
        if policy.by_zone:
            ordered = _quota_slot(ordered, zone_of, state, policy.slot, policy.reach)
        else:
            far = policy.min_distance_km
            ordered = with_opportunity_slot(
                ordered,
                score=lambda c: c.score,
                key=lambda c: c.doctor_id,
                exposure=exposure,
                position=policy.slot,
                reach=policy.reach,
                only=None if far is None else (lambda c: getattr(c, "distance_km", 0.0) >= far),
            )
    return ordered


def _ratios(pool: Counter[str], got: Counter[str]) -> dict[str, float]:
    """Parcela de cada zona no que se recebeu, dividida pela parcela dela entre os elegíveis."""
    pool_total = sum(pool.values()) or 1
    got_total = sum(got.values()) or 1
    return {
        zone: (got[zone] / got_total) / (pool[zone] / pool_total)
        for zone in sorted(pool)
        if pool[zone]
    }


def run_policy(
    dataset: Dataset,
    pools: Sequence[tuple[Shift, list[Candidate]]],
    params: dict[str, Any],
    policy: ZonePolicy,
    reps: int = REPS,
) -> tuple[dict[str, Any], list[float]]:
    """Aplica a política às vagas em ordem. Devolve as medidas e a chance do top-5 por vaga."""
    cap = int(params["max_offers_per_shift"])
    ttl = int(params["ttl_minutes"])
    n_top = max(1, round(0.1 * len(dataset.doctors)))

    def zone_of(doctor_id: str) -> str:
        return str(getattr(dataset.doctors[doctor_id], ZONES_ATTRIBUTE))

    window = ExposureWindow()
    state = ZoneState()
    slots: Counter[str] = Counter()
    effective: Counter[str] = Counter()
    zone_pool: Counter[str] = Counter()
    zone_top: Counter[str] = Counter()
    zone_offers: Counter[str] = Counter()
    week_pool: dict[int, Counter[str]] = {}
    week_top: dict[int, Counter[str]] = {}
    ever_eligible: set[str] = set()
    success: list[float] = []
    offers: list[float] = []
    uncovered: list[float] = []
    times: list[float] = []
    runs = filled_runs = 0
    start = pools[0][0].published_at
    for shift, candidates in pools:
        exposure = window.at(shift.published_at)
        ordered = order(candidates, exposure, policy, zone_of, state)
        top = ordered[:TOP_K]
        window.add(shift.published_at, [c.doctor_id for c in top])
        slots.update(c.doctor_id for c in top)
        survive = 1.0
        for c in ordered[:cap]:
            effective[c.doctor_id] += survive
            zone_offers[zone_of(c.doctor_id)] += survive
            survive *= 1.0 - c.p_accept
        ever_eligible.update(c.doctor_id for c in candidates)
        pool_zones = [zone_of(c.doctor_id) for c in candidates]
        top_zones = [zone_of(c.doctor_id) for c in top]
        zone_pool.update(pool_zones)
        zone_top.update(top_zones)
        state.seen.update(pool_zones)
        state.slots.update(top_zones)
        week = (shift.published_at - start).days // 7
        week_pool.setdefault(week, Counter()).update(pool_zones)
        week_top.setdefault(week, Counter()).update(top_zones)
        success.append(sum(c.p_success for c in top) / len(top))
        probabilities = [c.p_accept for c in ordered]
        expected, empty = cascade_expectation(probabilities, cap)
        offers.append(expected)
        uncovered.append(empty)
        rng = random.Random(f"concentracao:{params['seed']}:{shift.id}")
        for _ in range(reps):
            minutes, filled = simulate_cascade(probabilities, rng, ttl, cap)
            runs += 1
            if filled:
                filled_runs += 1
                times.append(minutes)
    ratios_top = _ratios(zone_pool, zone_top)
    ratios_offers = _ratios(zone_pool, zone_offers)
    alert_weeks = sum(
        1
        for week in week_pool
        if any(r < ALERT_FLOOR for r in _ratios(week_pool[week], week_top[week]).values())
    )
    result = {
        "label": policy.label,
        "adoptable": policy.adoptable,
        "top5_success": sum(success) / len(success),
        "offers_per_shift": sum(offers) / len(offers),
        "uncovered_share": sum(uncovered) / len(uncovered),
        "time_mean": sum(times) / len(times) if times else float("nan"),
        "filled_share": filled_runs / runs if runs else float("nan"),
        "top10_top5_slots": top_share(slots, n_top),
        "top10_effective_offers": top_share(effective, n_top),
        "never_recommended_share": len(ever_eligible - set(slots)) / len(ever_eligible),
        "zone_top5": ratios_top,
        "zone_offers": ratios_offers,
        "worst_zone_top5": min(ratios_top.values()),
        "worst_zone_offers": min(ratios_offers.values()),
        "alert_weeks": alert_weeks,
        "weeks": len(week_pool),
    }
    return result, success


def _paired_se(values: list[float], reference: list[float]) -> float:
    diffs = [a - b for a, b in zip(values, reference, strict=True)]
    n = len(diffs)
    if n < 2:
        return float("nan")
    mean = sum(diffs) / n
    variance = sum((d - mean) ** 2 for d in diffs) / (n - 1)
    return math.sqrt(variance / n)


def evaluate_zone(
    dataset: Dataset, params: dict[str, Any], model: LogisticModel, reps: int = REPS
) -> dict[str, Any]:
    """Todas as políticas nas vagas do período de teste, na ordem de publicação."""
    test_start = datetime.fromisoformat(params["test_start"])
    store = FeatureStore(dataset)
    shifts = sorted(
        (s for s in dataset.shifts.values() if s.published_at >= test_start),
        key=lambda s: (s.published_at, s.id),
    )
    pools_by_cap = {
        cap: build_pools(dataset, store, model, params, shifts, cap) for cap in DISTANCE_CAPS
    }
    results: dict[str, dict[str, Any]] = {}
    per_shift: dict[str, list[float]] = {}
    for policy in POLICIES:
        pools = pools_by_cap[policy.distance_cap_km]
        results[policy.key], per_shift[policy.key] = run_policy(
            dataset, pools, params, policy, reps
        )
    reference = per_shift[CURRENT]
    for key, row in results.items():
        row["top5_success_vs_current"] = row["top5_success"] - results[CURRENT]["top5_success"]
        row["top5_success_vs_current_se"] = (
            0.0 if key == CURRENT else _paired_se(per_shift[key], reference)
        )
    base_pools = pools_by_cap[None]
    return {
        "label": "simulacao",
        "test_start": params["test_start"],
        "n_shifts": len(base_pools),
        "mean_pool": sum(len(c) for _, c in base_pools) / len(base_pools) if base_pools else 0.0,
        "repetitions": reps,
        "policies": results,
    }


SCENARIOS = (
    "Outra semente (1)",
    "Outra semente (2)",
    "Outra semente (3)",
    "Distância pesa metade",
    "Distância pesa o dobro",
)
SUMMARY = (
    "top5_success",
    "top10_effective_offers",
    "worst_zone_top5",
    "worst_zone_offers",
    "time_mean",
)
CHART_KEYS = ("hoje", "rodizio10", "dist10", "opp2", "longe2_d10", "longe2_d12", "cota2")
CHART_LABELS = (
    "Hoje",
    "Rodízio 10",
    "Limite 10 km",
    "Oport. 2º",
    "Longe 2º 10 km",
    "Longe 2º 12 km",
    "Cota zona 2º",
)


def evaluate_suite(
    dataset: Dataset, params: dict[str, Any], model: LogisticModel, reps: int = REPS
) -> dict[str, Any]:
    """A base e, para ver o que resiste, outros mundos: sementes e o peso da distância."""
    from app.ranking.evaluate import evaluate
    from app.robustness import scenarios
    from app.synthetic.generator import generate

    metrics = evaluate_zone(dataset, params, model, reps)
    rows: list[dict[str, Any]] = []
    for name, scenario_params in scenarios(params):
        if name not in SCENARIOS:
            continue
        world = generate(scenario_params)
        scenario_model, _ = evaluate(world, scenario_params)
        measured = evaluate_zone(world, scenario_params, scenario_model, reps)
        rows.append(
            {
                "scenario": name,
                "n_shifts": measured["n_shifts"],
                "policies": {
                    key: {field: row[field] for field in SUMMARY}
                    for key, row in measured["policies"].items()
                },
            }
        )
    return {**metrics, "scenarios": rows}


def adoptable_key(metrics: dict[str, Any]) -> str | None:
    """A política adotável que cumpre os dois critérios, a de maior participação da pior zona."""
    ok = [
        (key, row)
        for key, row in metrics["policies"].items()
        if row["adoptable"]
        and key not in (BASELINE, CURRENT)
        and row["worst_zone_top5"] >= MIN_WORST_ZONE
        and -row["top5_success_vs_current"] <= MAX_EXTRA_LOSS
    ]
    if not ok:
        return None
    return max(ok, key=lambda item: (item[1]["worst_zone_top5"], item[0]))[0]


def _num(value: float, digits: int = 0) -> str:
    return f"{value:.{digits}f}".replace(".", ",")


def _pct(value: float, digits: int = 1) -> str:
    return f"{value * 100:.{digits}f}%".replace(".", ",")


def _points(value: float) -> str:
    text = _num(abs(value) * 100, 1)
    return f"−{text}" if value < 0 else f"+{text}"


def _row_cells(row: dict[str, Any]) -> str:
    return (
        f"{_pct(row['top5_success'])} | {_points(row['top5_success_vs_current'])} "
        f"(±{_num(row['top5_success_vs_current_se'] * 100, 2)}) | {_num(row['time_mean'])} | "
        f"{_pct(row['top10_effective_offers'])} | {_num(row['worst_zone_top5'], 2)} | "
        f"{_num(row['worst_zone_offers'], 2)} | {row['alert_weeks']} de {row['weeks']}"
    )


def render_zone(metrics: dict[str, Any]) -> str:
    """Relatório em Markdown, com o rótulo de simulação em todo número."""
    pol = metrics["policies"]
    hoje, atual = pol[BASELINE], pol[CURRENT]
    chosen = adoptable_key(metrics)
    base_world = {
        "scenario": "Base",
        "policies": {k: {f: v[f] for f in SUMMARY} for k, v in pol.items()},
    }
    worlds = [base_world, *metrics.get("scenarios", [])]
    drop = [w["policies"][BASELINE]["top10_effective_offers"] for w in worlds]
    kept = [w["policies"][CURRENT]["top10_effective_offers"] for w in worlds]
    lines = [
        "# Experimento contra a exclusão por zona (simulação)",
        "",
        "> **Simulação.** Os dados são sintéticos e a chance de aceite é a do simulador, em que a "
        "distância pesa muito. O experimento mostra quanto cada medida troca de equidade entre "
        "regiões por chance de sucesso e tempo dentro do mundo simulado; não é evidência do mundo "
        "real. Gerado por `python -m app.cli zone`.",
        "",
        "## Perguntas",
        "",
        "O feedback da Entrega 3 perguntou: (1) o rodízio reduz mesmo a concentração entre "
        "médicos? (2) Ele resolve a desigualdade entre regiões? O [experimento da concentração]"
        "(metricas-concentracao.md) já mostrou que a zona quase não muda (leste e oeste de 0,01 "
        "para 0,07). Aqui se testa o que atacaria isso e a que preço.",
        "",
        "## Como foi feito",
        "",
        f"- **{metrics['n_shifts']} vagas de teste**, as mesmas do experimento da concentração, em "
        f"ordem de publicação, com em média {round(metrics['mean_pool'])} elegíveis por vaga e "
        f"{metrics['repetitions']} repetições da cascata por vaga, com os mesmos sorteios para "
        "todas as políticas.",
        "- **Todas partem do rodízio de 10 pontos** (o que está na API), menos a de hoje.",
        "- **Limite ao peso da distância:** o score passa a tratar qualquer distância acima de "
        "10 km como 10 km. Muda a ordem do modelo.",
        "- **Lugar de oportunidade:** o 2º ou o 3º lugar vai para quem tem menos aparições no "
        "top-5 na semana, entre os que estão a até 30 pontos de chance prevista da melhor. Não "
        "olha a zona nem a distância.",
        "- **Lugar para quem mora longe:** igual ao anterior, mas só entre quem mora a 10 km ou "
        "mais (ou 12 km). Usa a distância, que já é variável do ranking, e não a zona.",
        "- **Cota por zona (só referência):** o lugar vai para a zona menos presente no top-5 "
        "até ali. Usa a zona para decidir, o que o projeto não faz, e mostra o teto do que se "
        "ganharia.",
        "- **Duas medidas por zona** (1,00 seria proporcional): a participação no top-5 e a das "
        "ofertas que de fato saem (a cascata faz em média "
        f"{_num(atual['offers_per_shift'], 1)} ofertas por vaga, então estar em 5º quase nunca "
        "significa receber uma).",
        f"- **Critérios de adoção, escritos antes do resultado:** a zona menos exposta chega a "
        f"{_num(MIN_WORST_ZONE, 2)} no top-5 e a chance de sucesso cai no máximo "
        f"{_num(MAX_EXTRA_LOSS * 100)} pontos além do rodízio de hoje. As referências por zona "
        "não podem ser adotadas.",
        f"- **Alerta de revisão humana:** conta as semanas em que alguma zona fica abaixo de "
        f"{_num(ALERT_FLOOR, 2)} no top-5.",
        "",
        "## Resultado",
        "",
        "| Política | Chance de sucesso do top-5 | Contra o rodízio de hoje (erro-padrão) | Tempo "
        "médio (min) | 10% mais expostos: ofertas* | Zona menos exposta: top-5 | Zona menos "
        "exposta: ofertas | Semanas com alerta |",
        "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ]
    for key, row in pol.items():
        name = f"**{row['label']}**" if key == chosen else row["label"]
        lines.append(f"| {name} | {_row_cells(row)} |")
    lines += [
        "",
        "\\* Estimativa superior, como no experimento da concentração. O tempo do processo manual "
        "simulado é de cerca de 110 min.",
        "",
        "![Zona menos exposta nas ofertas, por política (simulação)](fig-zona-politicas.svg)",
        "",
        "### Por zona, nas ofertas que saem (1,00 = proporcional)",
        "",
    ]
    zones = list(hoje["zone_offers"])
    lines += [
        "| Política | " + " | ".join(zone.capitalize() for zone in zones) + " |",
        "| --- | " + " | ".join("---:" for _ in zones) + " |",
    ]
    for key in (BASELINE, CURRENT, "opp2", "longe2_d10", "longe2_d12", "cota2"):
        row = pol[key]
        cells = " | ".join(_num(row["zone_offers"][zone], 2) for zone in zones)
        lines.append(f"| {row['label']} | {cells} |")
    lines += [
        "",
        "## O que resiste em outros mundos",
        "",
        "A mesma comparação, refeita com outras sementes e com o peso da distância no aceite pela "
        "metade e pelo dobro. Cada linha traz a parcela das ofertas dos 10% mais expostos, a "
        "participação da zona menos exposta (top-5) e a chance de sucesso.",
        "",
        "| Mundo | Hoje: 10% mais expostos | Hoje: zona | Rodízio: 10% mais expostos | Rodízio: "
        "zona | Longe no 2º (10 km): zona | Longe no 2º: sucesso | Cota por zona: zona | Cota: "
        "sucesso |",
        "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ]
    for world in worlds:
        p = world["policies"]
        lines.append(
            f"| {world['scenario']} | {_pct(p[BASELINE]['top10_effective_offers'])} | "
            f"{_num(p[BASELINE]['worst_zone_top5'], 2)} | "
            f"{_pct(p[CURRENT]['top10_effective_offers'])} | "
            f"{_num(p[CURRENT]['worst_zone_top5'], 2)} | "
            f"{_num(p['longe2_d10']['worst_zone_top5'], 2)} | "
            f"{_pct(p['longe2_d10']['top5_success'])} | "
            f"{_num(p['cota2']['worst_zone_top5'], 2)} | {_pct(p['cota2']['top5_success'])} |"
        )
    near = pol["longe2_d10"]
    quota = pol["cota2"]
    lines += [
        "",
        "## Leitura",
        "",
        f"- **Pergunta 1, sim.** O rodízio reduz a concentração entre pessoas em todos os "
        f"{len(worlds)} mundos testados: os 10% mais expostos recebem de {_pct(min(drop))} a "
        f"{_pct(max(drop))} das ofertas só pelo modelo e de {_pct(min(kept))} a "
        f"{_pct(max(kept))} com o rodízio. O custo na base é de "
        f"{_points(atual['top5_success'] - hoje['top5_success'])} pontos de chance de sucesso do "
        "top-5.",
        f"- **Pergunta 2, não.** Com o rodízio, a zona menos exposta recebe "
        f"{_num(atual['worst_zone_offers'], 2)} do que receberia se fosse proporcional, e o "
        f"alerta de revisão humana dispararia em {atual['alert_weeks']} das {atual['weeks']} "
        "semanas.",
        f"- **Sem olhar a distância nem a zona, não resolve.** O lugar de oportunidade no 2º leva "
        f"a zona menos exposta a {_num(pol['opp2']['worst_zone_offers'], 2)}: quem está há mais "
        "tempo sem aparecer não é, em geral, quem mora longe.",
        f"- **Limitar o peso da distância ajuda pouco.** Com o teto de 10 km, a zona menos exposta "
        f"vai a {_num(pol['dist10']['worst_zone_offers'], 2)} nas ofertas, por "
        f"{_points(pol['dist10']['top5_success_vs_current'])} pontos de chance de sucesso: o "
        "modelo continua achando que quem mora longe aceita menos, e acha com razão no simulador.",
        f"- **Olhando a distância, resolve em parte e custa.** Reservar o 2º lugar a quem mora a "
        f"10 km ou mais leva a zona menos exposta a {_num(near['worst_zone_offers'], 2)} nas "
        f"ofertas, com {_points(near['top5_success_vs_current'])} pontos de chance de sucesso e "
        f"{_num(near['time_mean'] - atual['time_mean'])} min a mais por vaga.",
        f"- **O teto, usando a zona:** a cota por zona no 2º lugar leva a zona menos exposta a "
        f"{_num(quota['worst_zone_offers'], 2)}, por {_points(quota['top5_success_vs_current'])} "
        "pontos. Fica como referência, porque decidir por zona é outra escolha, de política e de "
        "ética, e não só de engenharia.",
        "- **A posição do lugar importa mais que o alcance.** No 3º lugar a mesma regra quase "
        "não muda as ofertas, porque a cascata raramente chega até ele.",
    ]
    if chosen is None:
        lines.append(
            "- **Pelos critérios combinados, nenhuma política é adotável por padrão:** as que "
            f"chegam perto de {_num(MIN_WORST_ZONE, 2)} na zona menos exposta custam mais de "
            f"{_num(MAX_EXTRA_LOSS * 100)} pontos de chance de sucesso. O preço da equidade "
            "regional é real e é uma escolha do hospital (da Comissão de IA), a ser feita com "
            "ofertas reais no piloto. O que este experimento entrega é o preço de cada escolha."
        )
    else:
        row = pol[chosen]
        label = row["label"][0].lower() + row["label"][1:]
        lines.append(f"- **Pelos critérios combinados, adotável: {label}.**")
    lines += [
        "",
        "## Limites",
        "",
        "- A distância pesa no aceite porque o simulador diz que pesa (39,9% de aceite até 5 km "
        "contra 17,4% a partir de 20 km). Parte da diferença entre regiões é preferência real de "
        "quem mora longe, e não injustiça; por isso a meta é igualdade de chance de ser chamado "
        "quando é viável, e não de resultado.",
        "- Os limites de distância (10 e 12 km), o alcance de 30 pontos e o piso de alerta são "
        "escolhas do grupo. Para o lugar de oportunidade e para a cota, alcances de 20 e 40 "
        "pontos foram testados na exploração e deram resultado praticamente igual.",
        "- A cascata simulada só liga os que recusam; quem está em 2º recebe oferta se o 1º "
        "recusar. No mundo real, a recusa tem outros motivos (cansaço, agenda) que o simulador "
        "não representa por completo.",
        "- A zona não entra no ranking do modelo, só na auditoria e nas referências deste "
        "experimento. As medidas adotáveis usam a distância, que já é variável do ranking.",
        "- Nada aqui muda a API: o rodízio de 10 pontos é o que está no ar.",
        "",
    ]
    return "\n".join(lines)


def zone_chart(metrics: dict[str, Any]) -> str:
    """Colunas: a zona menos exposta nas ofertas, por política (100% seria proporcional)."""
    from app.charts import COMPACT, column_chart

    pol = metrics["policies"]
    values = [pol[key]["worst_zone_offers"] * 100 for key in CHART_KEYS]
    return column_chart(
        "Zona menos exposta nas ofertas",
        "Em % do proporcional; 100% seria justo",
        list(CHART_LABELS),
        [("Zona menos exposta", values)],
        lambda value: f"{value:.0f}%",
        "Colunas com a participação da zona menos exposta nas ofertas que saem, em relação ao "
        "proporcional: a ordem de hoje, o rodízio de 10 pontos, o limite ao peso da distância, o "
        "lugar de oportunidade no 2º, o 2º lugar para quem mora longe e a cota por zona.",
        **COMPACT,
    )
