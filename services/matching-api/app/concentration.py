"""Experimento contra a concentração das ofertas, em simulação (roteiro até o MVP, passo 7.1).

O fluxo recomendado (`flow.py`) mostrou o custo do ganho de tempo: os 10% de médicos mais
recomendados ocupam metade dos lugares do top-5, contra 31% das ofertas no processo manual. Aqui se
testa o que a matriz de riscos propôs como mitigação, nas mesmas vagas de teste:

* **Rodízio entre equivalentes:** a ordem continua sendo a do modelo, mas, entre os médicos cuja
  chance prevista fica a até `delta` da melhor ainda disponível, vai primeiro quem apareceu menos
  no top-5 nos últimos 7 dias. Ninguém passa à frente de alguém mais de `delta` melhor.
* **Limite de exposição:** quem já apareceu `limit` vezes no top-5 nos últimos 7 dias vai para o
  fim da lista. Continua elegível e pode ser chamado se os outros recusarem.
* **Os dois juntos.**

As vagas andam em ordem de publicação, e a memória de exposição é o que cada política recomendou
antes. Todas as políticas usam os mesmos sorteios por vaga, para a diferença vir da ordem e não do
acaso. Vale o mesmo limite do `flow.py`: cada vaga usa a agenda do histórico manual, e quem a
política escalaria não fica ocupado para as seguintes. Tudo é simulação com dados sintéticos.
"""

import random
from collections import Counter, deque
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any

from app.charts import COMPACT, column_chart
from app.flow import cascade_expectation, manual_baseline, simulate_cascade, top_share
from app.models import Dataset, Shift
from app.ranking.compute import FeatureStore
from app.ranking.evaluate import TOP_K, eligible_pool, truth_state
from app.ranking.model import LogisticModel
from app.ranking.report import pct
from app.synthetic import truth

WINDOW = timedelta(days=7)
REPS = 100
ZONES_ATTRIBUTE = "home_zone"


@dataclass(frozen=True)
class Policy:
    """Uma forma de ordenar os elegíveis: `delta` liga o rodízio, `limit` liga o limite."""

    key: str
    label: str
    delta: float | None = None
    limit: int | None = None


POLICIES: tuple[Policy, ...] = (
    Policy("hoje", "Hoje: só a ordem do modelo"),
    Policy("rodizio5", "Rodízio entre equivalentes, margem de 5 pontos", delta=0.05),
    Policy("rodizio10", "Rodízio entre equivalentes, margem de 10 pontos", delta=0.10),
    Policy("rodizio15", "Rodízio entre equivalentes, margem de 15 pontos", delta=0.15),
    Policy("limite2", "Limite de 2 aparições por semana", limit=2),
    Policy("limite4", "Limite de 4 aparições por semana", limit=4),
    Policy("rodizio10_limite4", "Rodízio de 10 pontos e limite de 4", delta=0.10, limit=4),
)


@dataclass(frozen=True)
class Candidate:
    """Um elegível da vaga: a chance verdadeira (só o simulador sabe) e o score do modelo."""

    doctor_id: str
    p_accept: float
    p_success: float
    score: float


def _rotate(block: list[Candidate], exposure: dict[str, int], delta: float) -> list[Candidate]:
    """Entre os que estão a até `delta` do melhor restante, chama primeiro o menos exposto."""
    remaining = list(block)
    ordered: list[Candidate] = []
    while remaining:
        best = remaining[0].score
        equivalents = [c for c in remaining if c.score >= best - delta]
        pick = min(equivalents, key=lambda c: (exposure.get(c.doctor_id, 0), -c.score, c.doctor_id))
        ordered.append(pick)
        remaining.remove(pick)
    return ordered


def rerank(
    candidates: Sequence[Candidate], exposure: dict[str, int], policy: Policy
) -> list[Candidate]:
    """Ordem de chamada da política. Sem rodízio nem limite, é a ordem do modelo.

    O limite separa dois blocos (abaixo e acima do limite) e o rodízio age dentro de cada um, então
    ninguém acima do limite passa à frente de quem está abaixo dele.
    """
    ordered = sorted(candidates, key=lambda c: (-c.score, c.doctor_id))
    blocks = [ordered]
    if policy.limit is not None:
        under = [c for c in ordered if exposure.get(c.doctor_id, 0) < policy.limit]
        over = [c for c in ordered if exposure.get(c.doctor_id, 0) >= policy.limit]
        blocks = [under, over]
    if policy.delta is not None:
        blocks = [_rotate(block, exposure, policy.delta) for block in blocks]
    return [c for block in blocks for c in block]


class ExposureWindow:
    """Quantas vezes cada médico apareceu no top-5 nos últimos 7 dias (vagas em ordem)."""

    def __init__(self, window: timedelta = WINDOW) -> None:
        self.window = window
        self.events: deque[tuple[datetime, str]] = deque()
        self.counts: Counter[str] = Counter()

    def at(self, moment: datetime) -> dict[str, int]:
        while self.events and self.events[0][0] <= moment - self.window:
            _, doctor_id = self.events.popleft()
            self.counts[doctor_id] -= 1
        return self.counts

    def add(self, moment: datetime, doctor_ids: Sequence[str]) -> None:
        for doctor_id in doctor_ids:
            self.events.append((moment, doctor_id))
            self.counts[doctor_id] += 1


def _pools(
    dataset: Dataset,
    store: FeatureStore,
    model: LogisticModel,
    params: dict[str, Any],
    shifts: Sequence[Shift],
) -> list[tuple[Shift, list[Candidate]]]:
    pools: list[tuple[Shift, list[Candidate]]] = []
    for shift in shifts:
        duration = (shift.ends_at - shift.starts_at).total_seconds() / 3600
        rows: list[Candidate] = []
        for doctor, f in eligible_pool(dataset, store, shift):
            state = truth_state(f, shift, duration)
            reliability = dataset.latent[doctor.id]
            rows.append(
                Candidate(
                    doctor.id,
                    truth.p_accept(params["accept"], reliability=reliability, **state),
                    truth.p_success(params["accept"], reliability=reliability, **state),
                    model.probability(f),
                )
            )
        if len(rows) >= TOP_K:
            pools.append((shift, rows))
    return pools


def _participation(
    dataset: Dataset, pool_counter: Counter[str], top_counter: Counter[str]
) -> dict[str, float]:
    """Parcela de cada zona no top-5 dividida pela parcela dela entre os elegíveis (1 = justo)."""
    pool_total = sum(pool_counter.values()) or 1
    top_total = sum(top_counter.values()) or 1
    return {
        zone: (top_counter[zone] / top_total) / (pool_counter[zone] / pool_total)
        for zone in sorted(pool_counter)
        if pool_counter[zone]
    }


def run_policy(
    dataset: Dataset,
    pools: Sequence[tuple[Shift, list[Candidate]]],
    params: dict[str, Any],
    policy: Policy,
    reps: int = REPS,
) -> dict[str, Any]:
    """Aplica a política às vagas em ordem e mede ranking, tempo e concentração."""
    cap = int(params["max_offers_per_shift"])
    ttl = int(params["ttl_minutes"])
    n_top = max(1, round(0.1 * len(dataset.doctors)))
    window = ExposureWindow()
    slots: Counter[str] = Counter()
    effective: Counter[str] = Counter()
    first: Counter[str] = Counter()
    zone_pool: Counter[str] = Counter()
    zone_top: Counter[str] = Counter()
    ever_eligible: set[str] = set()
    success, offers, uncovered, times = [], [], [], []
    runs = filled_runs = 0
    for shift, candidates in pools:
        exposure = window.at(shift.published_at)
        ordered = rerank(candidates, exposure, policy)
        top = ordered[:TOP_K]
        window.add(shift.published_at, [c.doctor_id for c in top])
        slots.update(c.doctor_id for c in top)
        first[ordered[0].doctor_id] += 1
        survive = 1.0
        for c in ordered[:cap]:
            effective[c.doctor_id] += survive
            survive *= 1.0 - c.p_accept
        ever_eligible.update(c.doctor_id for c in candidates)
        zone_pool.update(getattr(dataset.doctors[c.doctor_id], ZONES_ATTRIBUTE) for c in candidates)
        zone_top.update(getattr(dataset.doctors[c.doctor_id], ZONES_ATTRIBUTE) for c in top)
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
    zones = _participation(dataset, zone_pool, zone_top)
    return {
        "label": policy.label,
        "delta": policy.delta,
        "limit": policy.limit,
        "top5_success": sum(success) / len(success),
        "offers_per_shift": sum(offers) / len(offers),
        "uncovered_share": sum(uncovered) / len(uncovered),
        "time_mean": sum(times) / len(times) if times else float("nan"),
        "filled_share": filled_runs / runs if runs else float("nan"),
        "top10_top5_slots": top_share(slots, n_top),
        "top10_effective_offers": top_share(effective, n_top),
        "top10_first_offer": top_share(first, n_top),
        "never_recommended_share": len(ever_eligible - set(slots)) / len(ever_eligible),
        "zone_participation": zones,
        "worst_zone": min(zones.values()) if zones else float("nan"),
    }


def evaluate_concentration(
    dataset: Dataset, params: dict[str, Any], model: LogisticModel, reps: int = REPS
) -> dict[str, Any]:
    """Todas as políticas nas vagas do período de teste, na ordem de publicação."""
    test_start = datetime.fromisoformat(params["test_start"])
    store = FeatureStore(dataset)
    shifts = sorted(
        (s for s in dataset.shifts.values() if s.published_at >= test_start),
        key=lambda s: (s.published_at, s.id),
    )
    pools = _pools(dataset, store, model, params, shifts)
    results = {p.key: run_policy(dataset, pools, params, p, reps) for p in POLICIES}
    span_days = (pools[-1][0].published_at - pools[0][0].published_at).days + 1 if pools else 0
    manual = manual_baseline(dataset, [shift for shift, _ in pools])
    return {
        "label": "simulacao",
        "test_start": params["test_start"],
        "n_shifts": len(pools),
        "manual_offers": manual["top10_offer_share"],
        "span_days": span_days,
        "mean_pool": sum(len(c) for _, c in pools) / len(pools) if pools else float("nan"),
        "window_days": WINDOW.days,
        "repetitions": reps,
        "policies": results,
    }


def _num(value: float, digits: int = 0) -> str:
    return f"{value:.{digits}f}".replace(".", ",")


def _points(value: float) -> str:
    text = _num(abs(value) * 100, 1)
    return f"−{text}" if value < 0 else f"+{text}"


MAX_SUCCESS_LOSS = 0.02


def recommended_key(metrics: dict[str, Any]) -> str:
    """A política recomendada: a que mais reduz as ofertas concentradas perdendo até 2 pontos."""
    base = metrics["policies"]["hoje"]
    allowed = [
        (key, r)
        for key, r in metrics["policies"].items()
        if key != "hoje" and base["top5_success"] - r["top5_success"] <= MAX_SUCCESS_LOSS
    ]
    if not allowed:
        return "hoje"
    return min(allowed, key=lambda item: (item[1]["top10_effective_offers"], item[0]))[0]


def render_concentration(metrics: dict[str, Any], manual_offers: float) -> str:
    """Relatório em Markdown, com o rótulo de simulação em todo número."""
    pol = metrics["policies"]
    base = pol["hoje"]
    best_key = recommended_key(metrics)
    best = pol[best_key]
    lines = [
        "# Experimento contra a concentração das ofertas (simulação)",
        "",
        "> **Simulação.** Os dados são sintéticos e a chance de aceite é a do simulador. O "
        "experimento mostra quanto cada política troca de concentração por tempo e chance de "
        "sucesso dentro do mundo simulado; não é evidência do mundo real. Gerado por "
        "`python -m app.cli concentration`.",
        "",
        "## Pergunta",
        "",
        f"O fluxo recomendado põe os 10% de médicos mais recomendados em "
        f"{pct(base['top10_top5_slots'])} dos lugares do top-5 e, numa estimativa superior, em "
        f"{pct(base['top10_effective_offers'])} das ofertas que de fato saem, contra "
        f"{pct(manual_offers)} das ofertas no processo manual simulado "
        "([fluxo](metricas-fluxo.md)). Rodízio e limite de exposição reduzem isso? A que custo?",
        "",
        "## Como foi feito",
        "",
        f"- **{metrics['n_shifts']} vagas de teste** (a partir de {metrics['test_start']}, "
        f"{metrics['span_days']} dias), em ordem de publicação, com em média "
        f"{round(metrics['mean_pool'])} elegíveis por vaga.",
        f"- **Exposição** é quantas vezes o médico apareceu no top-5 nos últimos "
        f"{metrics['window_days']} dias, pelo que a própria política recomendou antes.",
        "- **Rodízio entre equivalentes:** entre os elegíveis com chance prevista a até 5, 10 "
        "ou 15 pontos da melhor ainda disponível, vai primeiro o menos exposto. Ninguém passa à "
        "frente de alguém melhor do que ele por mais que a margem. Os 5 pontos são a margem que a "
        'tela do coordenador usa para dizer "chances parecidas".',
        "- **Limite de exposição:** quem já apareceu 2 ou 4 vezes no top-5 na semana vai para o "
        "fim da lista; continua elegível.",
        f"- **Tempo e ofertas:** a mesma cascata do fluxo recomendado, com "
        f"{metrics['repetitions']} repetições por vaga e os mesmos sorteios para todas as "
        "políticas.",
        f"- **Critério de escolha (do grupo):** a política que mais reduz a parcela das ofertas "
        f"com os 10% mais expostos, perdendo até {round(MAX_SUCCESS_LOSS * 100)} pontos de chance "
        "de sucesso do top-5.",
        "",
        "## Resultado",
        "",
        "| Política | Chance de sucesso do top-5 | Tempo médio (min) | Ofertas por vaga | "
        "10% mais expostos: lugares do top-5 | 10% mais expostos: ofertas* | "
        "Elegíveis que nunca aparecem | Zona menos exposta** |",
        "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ]
    for key, r in pol.items():
        name = f"**{r['label']} (recomendada)**" if key == best_key else r["label"]
        lines.append(
            f"| {name} | {pct(r['top5_success'])} | {_num(r['time_mean'])} | "
            f"{_num(r['offers_per_shift'], 2)} | {pct(r['top10_top5_slots'])} | "
            f"{pct(r['top10_effective_offers'])} | {pct(r['never_recommended_share'])} | "
            f"{_num(r['worst_zone'], 2)} |"
        )
    uncovered = max(r["uncovered_share"] for r in pol.values())
    lines += [
        "",
        f"Vagas sem cobertura: no máximo {pct(uncovered)} em qualquer política.",
        "",
        "\\* Estimativa superior: cada vaga é avaliada com a agenda do histórico, e quem a "
        "política escalaria não fica ocupado para as seguintes. O processo manual simulado fica em "
        f"{pct(manual_offers)}.",
        "",
        "\\*\\* Parcela da zona no top-5 dividida pela parcela dela entre os elegíveis; 1,00 seria "
        "proporcional. A zona não entra no ranking: é medida só para a auditoria.",
        "",
        "![Ofertas com os 10% mais expostos, por política (simulação)]"
        "(fig-concentracao-politicas.svg)",
        "",
        "## Leitura",
        "",
    ]
    if best_key == "hoje":
        lines.append(
            "- Nenhuma política reduziu a concentração sem perder mais de 2 pontos de chance de "
            "sucesso. O risco continua aberto."
        )
    else:
        label = best["label"][0].lower() + best["label"][1:]
        lines += [
            f"- **Política recomendada: {label}.** Os 10% mais expostos passam de "
            f"{pct(base['top10_effective_offers'])} para {pct(best['top10_effective_offers'])} das "
            f"ofertas e de {pct(base['top10_top5_slots'])} para {pct(best['top10_top5_slots'])} "
            f"dos lugares do top-5, e os elegíveis que nunca aparecem vão de "
            f"{pct(base['never_recommended_share'])} para {pct(best['never_recommended_share'])}.",
            f"- **O custo:** a chance de sucesso do top-5 muda "
            f"{_points(best['top5_success'] - base['top5_success'])} pontos "
            f"({pct(base['top5_success'])} para {pct(best['top5_success'])}), e o tempo médio vai "
            f"de {_num(base['time_mean'])} para {_num(best['time_mean'])} min, ainda bem abaixo do "
            "processo manual simulado.",
            "- **O limite sozinho é pior:** corta a concentração, mas tira do topo quem tem chance "
            "muito maior, e a chance de sucesso cai mais. Somado ao rodízio, acrescenta pouco.",
        ]
    lines += [
        f"- **O que não resolve: a zona.** A zona menos exposta vai de "
        f"{_num(base['worst_zone'], 2)} para {_num(best['worst_zone'], 2)}. Quem mora longe tem "
        "chance de aceite muito menor e quase nunca fica perto da melhor. O rodízio reparte entre "
        "parecidos; a exclusão por zona pede outra medida (revisão humana da lista e limite ao "
        "peso da distância), que continua aberta.",
        "- **Comparação com o critério C5 da Entrega 3** (35% ou menos das ofertas com os 10% mais "
        "ofertados): a política recomendada fica perto dele, numa estimativa superior. A medida "
        "que vale é a do piloto, com ofertas reais.",
        "",
        "## Limites",
        "",
        "- O experimento ordena; não muda quem é elegível. Regras e jornada continuam iguais.",
        "- A chance de aceite é a verdadeira do simulador, e o tempo vem das premissas do gerador.",
        "- A janela de 7 dias, as margens e os limites testados são escolhas do grupo, não valores "
        "ótimos.",
        "- A política ainda não está na API; levá-la para lá é o passo 7.2 do roteiro.",
        "",
    ]
    return "\n".join(lines)


def concentration_policy_chart(metrics: dict[str, Any], manual_offers: float) -> str:
    """Colunas: ofertas recebidas pelos 10% mais expostos, por política, e o processo manual."""
    pol = metrics["policies"]
    keys = ["hoje", "rodizio5", "rodizio10", "rodizio15", "limite2"]
    labels = ["Manual", "Hoje", "Rodízio 5", "Rodízio 10", "Rodízio 15", "Limite 2"]
    values = [manual_offers * 100] + [pol[k]["top10_effective_offers"] * 100 for k in keys]
    return column_chart(
        "Ofertas com os 10% mais expostos",
        "Parcela em %; igualdade seria 10%; estimativa superior",
        labels,
        [("Parcela", values)],
        lambda value: f"{value:.0f}%",
        "Colunas com a parcela das ofertas recebida pelos 10% de médicos mais expostos: processo "
        "manual simulado, a ordem de hoje, rodízio com margens de 5, 10 e 15 pontos e limite de "
        "2 aparições por semana.",
        **COMPACT,
    )
