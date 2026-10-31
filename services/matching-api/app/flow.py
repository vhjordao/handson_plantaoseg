"""Fluxo recomendado contra o processo manual, em simulação (tempo, ofertas e antecedência).

Fecha o que o ranking sozinho não responde: as metas da Entrega 1 falam de tempo até preencher a
vaga, e o ranking mede só a chance de sucesso do top-5. Aqui as duas pontas ficam comparáveis:

* **Processo manual:** o que o gerador registrou (`shifts` e `offers`), sem nenhuma suposição extra.
* **Fluxo recomendado:** nas mesmas vagas de teste, chama os elegíveis na ordem de cada método até
  alguém aceitar (no máximo `max_offers_per_shift`), com a chance verdadeira de aceite do
  simulador (`truth.p_accept`) e as mesmas premissas de tempo do gerador (`generator.py`).

Só é possível em simulação, porque só o simulador conhece a chance verdadeira, e vale tanto quanto
as premissas dele: não é evidência do mundo real. Limites que o relatório repete:

* cada vaga é avaliada isoladamente, com a agenda do histórico manual; quem o fluxo escalaria não
  fica ocupado para as vagas seguintes, então a concentração das ofertas efetivas é uma
  estimativa superior;
* o processo manual simulado sorteia quem chamar sem checar disponibilidade, raio nem jornada
  (premissa do grupo); parte do ganho vem só de não chamar quem não poderia aceitar.
"""

import random
import statistics
from collections import Counter
from collections.abc import Sequence
from datetime import datetime, timedelta
from typing import Any

from app.charts import COMPACT, column_chart
from app.models import Dataset, Offer, Shift
from app.ranking.baseline import baseline_score
from app.ranking.compute import FeatureStore
from app.ranking.evaluate import TOP_K, eligible_pool, truth_state
from app.ranking.model import LogisticModel
from app.ranking.report import num, pct
from app.synthetic import truth
from app.synthetic.generator import (
    DECLINE_SHARE,
    FIRST_OFFER_DELAY_MINUTES,
    NEXT_OFFER_GAP_MINUTES,
    RESPONSE_MEAN_MINUTES,
)

ORDERINGS = ("oracle", "model", "baseline", "random")
ORDER_LABELS = {
    "oracle": "Oráculo (teto)",
    "model": "Regras + modelo",
    "baseline": "Regras + baseline heurístico",
    "random": "Regras + sorteio entre elegíveis",
}
REPS = 100
ADVANCE = timedelta(hours=24)
NAN = float("nan")


def _mean(values: Sequence[float]) -> float:
    return sum(values) / len(values) if values else NAN


def _median(values: Sequence[float]) -> float:
    return statistics.median(values) if values else NAN


def _percentile(values: Sequence[float], share: float) -> float:
    ordered = sorted(values)
    return ordered[min(len(ordered) - 1, int(share * len(ordered)))] if ordered else NAN


def _minutes(delta: timedelta) -> float:
    return delta.total_seconds() / 60


def top_share(counter: Counter, n_top: int) -> float:
    """Parcela do total recebida pelos `n_top` mais frequentes."""
    total = sum(counter.values())
    return sum(count for _, count in counter.most_common(n_top)) / total if total else NAN


def manual_baseline(dataset: Dataset, shifts: Sequence[Shift]) -> dict[str, float]:
    """O que o processo manual simulado fez nestas vagas (nada além do que o gerador gravou)."""
    by_shift: dict[str, list[Offer]] = {}
    for offer in dataset.offers:
        by_shift.setdefault(offer.shift_id, []).append(offer)
    filled = [s for s in shifts if s.status == "filled" and s.filled_at is not None]
    minutes = [_minutes(s.filled_at - s.published_at) for s in filled if s.filled_at]
    offers = [o for s in shifts for o in by_shift.get(s.id, [])]
    accepted = [o for o in offers if o.accepted]
    violations = sum(1 for o in accepted if o.injected_violation)
    n_top = max(1, round(0.1 * len(dataset.doctors)))
    total = len(shifts)
    early_fills = sum(1 for s in filled if s.filled_at and s.starts_at - s.filled_at >= ADVANCE)
    early_published = sum(1 for s in shifts if s.starts_at - s.published_at >= ADVANCE)
    return {
        "n_shifts": total,
        "filled_share": len(filled) / total,
        "uncovered_share": 1 - len(filled) / total,
        "offers_per_shift": len(offers) / total,
        "time_mean": _mean(minutes),
        "time_median": _median(minutes),
        "time_p90": _percentile(minutes, 0.9),
        "lead24_share": early_fills / total,
        "published24_share": early_published / total,
        "accepted": len(accepted),
        "violations": violations,
        "violation_share": violations / len(accepted) if accepted else NAN,
        "top10_offer_share": top_share(Counter(o.doctor_id for o in offers), n_top),
    }


def cascade_expectation(probabilities: Sequence[float], cap: int) -> tuple[float, float]:
    """Ofertas esperadas até o primeiro aceite e chance de a vaga ficar sem cobertura.

    A oferta `k` só existe se as `k - 1` anteriores falharam; o prazo é de `cap` ofertas.
    """
    survive, expected = 1.0, 0.0
    for probability in probabilities[:cap]:
        expected += survive
        survive *= 1.0 - probability
    return expected, survive


def _response_delay(rng: random.Random, ttl_minutes: int) -> int:
    return min(ttl_minutes - 1, int(rng.expovariate(1 / RESPONSE_MEAN_MINUTES)))


def simulate_cascade(
    probabilities: Sequence[float], rng: random.Random, ttl_minutes: int, cap: int
) -> tuple[int, bool]:
    """Minutos até a vaga ser preenchida (ou até a última oferta) e se foi preenchida.

    Mesmas premissas do gerador: a primeira oferta sai de 5 a 30 min depois da publicação; quem
    não aceita recusa (70%, depois de uma resposta) ou deixa expirar (30%, no prazo da oferta); a
    seguinte sai de 1 a 10 min depois do resultado.
    """
    elapsed = rng.randint(*FIRST_OFFER_DELAY_MINUTES)
    for probability in probabilities[:cap]:
        if rng.random() < probability:
            return elapsed + _response_delay(rng, ttl_minutes), True
        if rng.random() < DECLINE_SHARE:
            elapsed += _response_delay(rng, ttl_minutes)
        else:
            elapsed += ttl_minutes
        elapsed += rng.randint(*NEXT_OFFER_GAP_MINUTES)
    return elapsed, False


def recommended_flow(
    dataset: Dataset,
    store: FeatureStore,
    model: LogisticModel,
    params: dict[str, Any],
    shifts: Sequence[Shift],
    reps: int = REPS,
) -> tuple[dict[str, dict[str, float]], dict[str, float], dict[str, Any]]:
    """Fluxo recomendado nas vagas dadas: por ordem de chamada, concentração e vagas usadas."""
    cap = int(params["max_offers_per_shift"])
    ttl = int(params["ttl_minutes"])
    rng = random.Random(f"flow:{params['seed']}")
    n_top = max(1, round(0.1 * len(dataset.doctors)))
    acc: dict[str, dict[str, Any]] = {
        name: {"offers": [], "uncovered": [], "times": [], "lead24": 0, "runs": 0}
        for name in ORDERINGS
    }
    slots = {"model": Counter(), "baseline": Counter()}
    effective = {"model": Counter(), "baseline": Counter()}
    first = {"model": Counter(), "baseline": Counter()}
    kept: list[str] = []
    pool_sizes: list[int] = []
    for shift in shifts:
        duration = (shift.ends_at - shift.starts_at).total_seconds() / 3600
        rows: list[tuple[str, float, float, float]] = []
        for doctor, f in eligible_pool(dataset, store, shift):
            accept = truth.p_accept(
                params["accept"],
                reliability=dataset.latent[doctor.id],
                **truth_state(f, shift, duration),
            )
            base = baseline_score(f, radius_km=doctor.max_radius_km, duration_h=duration)
            rows.append((doctor.id, accept, model.probability(f), base))
        if len(rows) < TOP_K:
            continue
        kept.append(shift.id)
        pool_sizes.append(len(rows))
        ranked = {
            "oracle": sorted(rows, key=lambda row: (-row[1], row[0])),
            "model": sorted(rows, key=lambda row: (-row[2], row[0])),
            "baseline": sorted(rows, key=lambda row: (-row[3], row[0])),
        }
        for name in ("model", "baseline"):
            ordered = ranked[name]
            slots[name].update(row[0] for row in ordered[:TOP_K])
            survive = 1.0
            for row in ordered[:cap]:
                effective[name][row[0]] += survive
                survive *= 1.0 - row[1]
            first[name][ordered[0][0]] += 1
        budget = shift.starts_at - shift.published_at
        for name in ORDERINGS:
            if name == "random":
                orders = []
                for _ in range(reps):
                    shuffled = [row[1] for row in rows]
                    rng.shuffle(shuffled)
                    orders.append(shuffled)
                pairs = [cascade_expectation(order, cap) for order in orders]
                expected = _mean([pair[0] for pair in pairs])
                uncovered = _mean([pair[1] for pair in pairs])
            else:
                orders = [[row[1] for row in ranked[name]]] * reps
                expected, uncovered = cascade_expectation(orders[0], cap)
            acc[name]["offers"].append(expected)
            acc[name]["uncovered"].append(uncovered)
            for order in orders:
                minutes, filled = simulate_cascade(order, rng, ttl, cap)
                acc[name]["runs"] += 1
                if filled:
                    acc[name]["times"].append(minutes)
                    if budget - timedelta(minutes=minutes) >= ADVANCE:
                        acc[name]["lead24"] += 1
    summary = {
        name: {
            "offers_per_shift": _mean(a["offers"]),
            "uncovered_share": _mean(a["uncovered"]),
            "time_mean": _mean(a["times"]),
            "time_median": _median(a["times"]),
            "time_p90": _percentile(a["times"], 0.9),
            "lead24_share": a["lead24"] / a["runs"] if a["runs"] else NAN,
        }
        for name, a in acc.items()
    }
    concentration = {
        "top_n_doctors": float(n_top),
        "model_top5_slots": top_share(slots["model"], n_top),
        "baseline_top5_slots": top_share(slots["baseline"], n_top),
        "model_effective_offers": top_share(effective["model"], n_top),
        "baseline_effective_offers": top_share(effective["baseline"], n_top),
        "model_first_offer": top_share(first["model"], n_top),
        "baseline_first_offer": top_share(first["baseline"], n_top),
    }
    extra = {"shift_ids": kept, "mean_pool": _mean(pool_sizes), "n_shifts": len(kept)}
    return summary, concentration, extra


def evaluate_flow(
    dataset: Dataset, params: dict[str, Any], model: LogisticModel, reps: int = REPS
) -> dict[str, Any]:
    """Processo manual e fluxo recomendado, nas mesmas vagas do período de teste."""
    test_start = datetime.fromisoformat(params["test_start"])
    store = FeatureStore(dataset)
    test_shifts = [s for s in dataset.shifts.values() if s.published_at >= test_start]
    flow, concentration, extra = recommended_flow(dataset, store, model, params, test_shifts, reps)
    kept = set(extra["shift_ids"])
    manual_test = manual_baseline(dataset, [s for s in test_shifts if s.id in kept])
    manual_year = manual_baseline(dataset, list(dataset.shifts.values()))
    concentration["manual_offers"] = manual_test["top10_offer_share"]
    best, rules_only = flow["model"], flow["random"]
    gain = manual_test["time_mean"] - best["time_mean"]
    reduction = {
        "time_mean": 1 - best["time_mean"] / manual_test["time_mean"],
        "time_median": 1 - best["time_median"] / manual_test["time_median"],
        "offers_per_shift": 1 - best["offers_per_shift"] / manual_test["offers_per_shift"],
        "time_mean_rules_only": 1 - rules_only["time_mean"] / manual_test["time_mean"],
        "rules_share_of_gain": (manual_test["time_mean"] - rules_only["time_mean"]) / gain,
        "time_mean_model_vs_baseline": 1 - best["time_mean"] / flow["baseline"]["time_mean"],
        "lead24_gain_points": (best["lead24_share"] - manual_test["lead24_share"]) * 100,
    }
    return {
        "label": "simulacao",
        "test_start": params["test_start"],
        "n_shifts": extra["n_shifts"],
        "mean_pool": extra["mean_pool"],
        "assumptions": {
            "max_offers_per_shift": params["max_offers_per_shift"],
            "ttl_minutes": params["ttl_minutes"],
            "first_offer_delay_minutes": list(FIRST_OFFER_DELAY_MINUTES),
            "response_mean_minutes": RESPONSE_MEAN_MINUTES,
            "decline_share": DECLINE_SHARE,
            "next_offer_gap_minutes": list(NEXT_OFFER_GAP_MINUTES),
            "repetitions": reps,
        },
        "manual": {"year": manual_year, "test": manual_test},
        "flow": flow,
        "reduction": reduction,
        "concentration": concentration,
    }


def _thousands(value: int) -> str:
    return f"{value:,}".replace(",", ".")


def render_flow(metrics: dict[str, Any]) -> str:
    """Relatório em Markdown (português do Brasil) com o fluxo recomendado e a linha de base."""
    year, test = metrics["manual"]["year"], metrics["manual"]["test"]
    flow, red, con = metrics["flow"], metrics["reduction"], metrics["concentration"]
    a = metrics["assumptions"]
    n = metrics["n_shifts"]
    delay_lo, delay_hi = a["first_offer_delay_minutes"]
    gap_lo, gap_hi = a["next_offer_gap_minutes"]
    expire = 1 - a["decline_share"]
    lines = [
        "# Fluxo recomendado contra o processo manual (simulação)",
        "",
        "> **Simulação.** Os dados são sintéticos e as premissas de tempo são do grupo, sem fonte "
        "externa. O resultado mostra de onde vem o ganho dentro do simulador; não é evidência de "
        "quanto tempo um hospital real economizaria.",
        "",
        "## Como foi medido",
        "",
        "- **Processo manual:** o que o gerador registrou. A coordenação sorteia quem chamar, com "
        "mais chance para quem mora perto e para quem já está no hospital (dobra), checando só "
        "CRM e especialidade: não olha disponibilidade, raio nem jornada.",
        f"- **Fluxo recomendado:** nas mesmas {n} vagas do período de teste (a partir de "
        f"{metrics['test_start']}), chama os médicos que passam no filtro de regras, na ordem de "
        f"cada método, até alguém aceitar (no máximo {a['max_offers_per_shift']} ofertas). A "
        "chance de aceite de cada médico é a verdadeira do simulador.",
        f"- **Tempos (premissas do gerador):** primeira oferta de {delay_lo} a {delay_hi} min "
        f"depois da publicação; resposta média de {a['response_mean_minutes']} min; entre quem "
        f"não aceita, {pct(a['decline_share'], 0)} recusa e {pct(expire, 0)} deixa expirar "
        f"({a['ttl_minutes']} min); a próxima oferta sai de {gap_lo} a {gap_hi} min depois. "
        f"São {a['repetitions']} repetições por vaga e ordem, com semente fixa.",
        "",
        "## Linha de base: o processo manual simulado",
        "",
        f"| Indicador | Ano inteiro ({_thousands(int(year['n_shifts']))} vagas) | "
        f"Período de teste ({int(test['n_shifts'])} vagas) |",
        "| --- | ---: | ---: |",
        f"| Vagas sem cobertura | {pct(year['uncovered_share'])} | "
        f"{pct(test['uncovered_share'])} |",
        f"| Ofertas por vaga | {num(year['offers_per_shift'], 2)} | "
        f"{num(test['offers_per_shift'], 2)} |",
        f"| Tempo até preencher, média (min) | {year['time_mean']:.0f} | {test['time_mean']:.0f} |",
        f"| Tempo até preencher, mediana (min) | {year['time_median']:.0f} | "
        f"{test['time_median']:.0f} |",
        f"| Tempo até preencher, 90% das vagas até (min) | {year['time_p90']:.0f} | "
        f"{test['time_p90']:.0f} |",
        f"| Preenchidas com 24 h ou mais de antecedência | {pct(year['lead24_share'])} | "
        f"{pct(test['lead24_share'])} |",
        f"| Vagas já publicadas com 24 h ou mais (teto desse indicador) | "
        f"{pct(year['published24_share'])} | {pct(test['published24_share'])} |",
        f"| Aceites que violam a jornada | {pct(year['violation_share'])} "
        f"({year['violations']:.0f} de {_thousands(int(year['accepted']))}) | "
        f"{pct(test['violation_share'])} ({test['violations']:.0f} de {test['accepted']:.0f}) |",
        f"| Ofertas recebidas pelos 10% de médicos mais ofertados | "
        f"{pct(year['top10_offer_share'])} | {pct(test['top10_offer_share'])} |",
        "",
        "## Fluxo recomendado, nas mesmas vagas de teste",
        "",
        "| Ordem de chamada | Ofertas por vaga | Sem cobertura | Tempo médio (min) | Mediana (min) "
        "| Preenchidas com 24 h ou mais |",
        "| --- | ---: | ---: | ---: | ---: | ---: |",
        f"| Processo manual (observado) | {num(test['offers_per_shift'], 2)} | "
        f"{pct(test['uncovered_share'])} | {test['time_mean']:.0f} | {test['time_median']:.0f} | "
        f"{pct(test['lead24_share'])} |",
    ]
    for name in ("random", "baseline", "model", "oracle"):
        row = flow[name]
        lines.append(
            f"| {ORDER_LABELS[name]} | {num(row['offers_per_shift'], 2)} | "
            f"{pct(row['uncovered_share'])} | {row['time_mean']:.0f} | {row['time_median']:.0f} | "
            f"{pct(row['lead24_share'])} |"
        )
    lines += [
        "",
        "## O que isso mostra",
        "",
        f"- **Tempo:** a média até preencher a vaga cai de {test['time_mean']:.0f} para "
        f"{flow['model']['time_mean']:.0f} min (**{pct(red['time_mean'], 0)} a menos**; mediana de "
        f"{test['time_median']:.0f} para {flow['model']['time_median']:.0f} min, "
        f"{pct(red['time_median'], 0)} a menos) e as ofertas por vaga, de "
        f"{num(test['offers_per_shift'], 2)} para {num(flow['model']['offers_per_shift'], 2)} "
        f"({pct(red['offers_per_shift'], 0)} a menos). A meta da Entrega 1 era reduzir 50% o "
        "tempo.",
        f"- **De onde vem o ganho:** só o filtro de regras (sorteio entre elegíveis) já leva a "
        f"média a {flow['random']['time_mean']:.0f} min ({pct(red['time_mean_rules_only'], 0)} "
        f"a menos), ou seja, {pct(red['rules_share_of_gain'], 0)} do ganho vem de não chamar "
        f"quem não poderia aceitar. O modelo tira mais "
        f"{pct(red['time_mean_model_vs_baseline'], 0)} "
        f"do tempo do baseline heurístico ({flow['baseline']['time_mean']:.0f} para "
        f"{flow['model']['time_mean']:.0f} min).",
        f"- **Antecedência:** {pct(test['published24_share'])} das vagas já nascem com 24 h ou "
        f"mais, e esse é o teto. O processo manual preenche com antecedência "
        f"{pct(test['lead24_share'])} delas e o fluxo recomendado, "
        f"{pct(flow['model']['lead24_share'])} "
        f"({num(red['lead24_gain_points'], 1)} pontos percentuais a mais). A meta de +20 pontos "
        "não é alcançável só com a recomendação: depende de publicar a vaga antes, isto é, da "
        "previsão de vagas descobertas (evolução futura).",
        "",
        "## Concentração das ofertas",
        "",
        f"Parcela recebida pelos 10% de médicos mais ofertados ou recomendados "
        f"({con['top_n_doctors']:.0f} médicos).",
        "",
        "| Medida | Parcela |",
        "| --- | ---: |",
        f"| Processo manual: ofertas feitas (período de teste) | {pct(con['manual_offers'])} |",
        f"| Baseline heurístico: lugares do top-5 | {pct(con['baseline_top5_slots'])} |",
        f"| Modelo: lugares do top-5 | {pct(con['model_top5_slots'])} |",
        f"| Baseline heurístico: ofertas efetivas se a cascata seguir a ordem | "
        f"{pct(con['baseline_effective_offers'])} |",
        f"| Modelo: ofertas efetivas se a cascata seguir a ordem | "
        f"{pct(con['model_effective_offers'])} |",
        f"| Modelo: só a primeira oferta de cada vaga | {pct(con['model_first_offer'])} |",
        "",
        "Recomendar por ordem **concentra mais** que o processo manual: quem lidera o ranking é "
        "chamado primeiro em vagas parecidas. A estimativa de ofertas efetivas é superior ao "
        "real, porque cada vaga é avaliada isoladamente e quem seria escalado não fica ocupado "
        "para as seguintes; mesmo assim a direção é clara. Mitigações a estudar na Etapa 3: "
        "rodízio entre elegíveis equivalentes, limite de ofertas por médico e menor peso da "
        "distância.",
        "",
        "## Limites",
        "",
        "- O processo manual simulado é uma premissa do grupo e não checa disponibilidade; "
        "um coordenador real pode ser melhor ou pior, e só as entrevistas dirão.",
        "- A chance de aceite dos elegíveis é a verdadeira do simulador; no mundo real ela é "
        "desconhecida, e o modelo a estima com erro.",
        "- Vagas sem cobertura próximas de zero no fluxo recomendado dependem dessa premissa e "
        "não devem ser lidas como promessa.",
        "- O tempo de resposta e de expiração das ofertas são parâmetros do gerador "
        "(`FIRST_OFFER_DELAY_MINUTES`, `RESPONSE_MEAN_MINUTES`, `DECLINE_SHARE` e "
        "`NEXT_OFFER_GAP_MINUTES`).",
        "",
    ]
    return "\n".join(lines)


def flow_chart(metrics: dict[str, Any]) -> str:
    """Gráfico de colunas do tempo médio até preencher a vaga, do manual ao oráculo."""
    manual = metrics["manual"]["test"]["time_mean"]
    flow = metrics["flow"]
    categories = [
        "Processo manual",
        "Regras + sorteio",
        "Regras + baseline",
        "Regras + modelo",
        "Oráculo (teto)",
    ]
    values = [
        manual,
        flow["random"]["time_mean"],
        flow["baseline"]["time_mean"],
        flow["model"]["time_mean"],
        flow["oracle"]["time_mean"],
    ]
    return column_chart(
        "Tempo médio até preencher (min)",
        f"{metrics['n_shifts']} vagas de teste, em simulação",
        categories,
        [("Minutos", values)],
        lambda value: f"{value:.0f}",
        "Colunas com o tempo médio até preencher a vaga: processo manual, regras com sorteio, "
        "regras com baseline, regras com modelo e oráculo.",
        **COMPACT,
    )


def concentration_chart(metrics: dict[str, Any]) -> str:
    """Gráfico de colunas da concentração das ofertas: o custo que acompanha o ganho de tempo."""
    con = metrics["concentration"]
    categories = ["Manual: ofertas", "Baseline: top-5", "Modelo: top-5", "Modelo: ofertas*"]
    values = [
        con["manual_offers"] * 100,
        con["baseline_top5_slots"] * 100,
        con["model_top5_slots"] * 100,
        con["model_effective_offers"] * 100,
    ]
    return column_chart(
        "Concentração nos 10% mais ofertados",
        "Parcela em %; igualdade seria 10%; *estimativa superior",
        categories,
        [("Parcela", values)],
        lambda value: f"{value:.0f}%",
        "Colunas com a parcela das ofertas ou dos lugares do top-5 recebida pelos 10% de médicos "
        "mais ofertados: processo manual, baseline, modelo e modelo com ofertas efetivas.",
        **COMPACT,
    )
