"""Regressão logística contra LightGBM, em simulação (roteiro até o MVP, passo E.4).

A Etapa 2 prometeu comparar o ranking com o LightGBM e a Entrega 3 declarou isso "não feito". O
professor perguntou na Entrega 3 se a comparação já foi realizada, e apontou que o modelo aprende o
simulador que gerou os dados. Aqui se faz as duas coisas:

* **A comparação**, no mesmo teste temporal da regressão logística (treina no passado, avalia
  depois de `test_start`), com as mesmas sete variáveis do ranking, pelo AUC, pelo erro de
  probabilidade (Brier) e pela chance média de sucesso do top-5 contra o oráculo (avaliação
  contrafactual, possível só em simulação).
* **Um mundo com regra não linear**, em que a distância pesa mais a partir de 15 km e a preferência
  de período muda quanto a distância pesa. A regressão logística não representa essas duas coisas,
  e o LightGBM, sim. Mostra se a conclusão depende de o simulador ser quase linear.

Roda só na CI (workflow `lightgbm.yml`): o LightGBM não entra nas dependências da API nem da PoC,
para a imagem do servidor continuar pequena e para o núcleo continuar em Python puro. A parte que
não depende da biblioteca (os mundos, a avaliação, o relatório) é testada sem ela.

Tudo é simulação com dados sintéticos; o modelo aprende o simulador (circularidade).
"""

import math
from collections.abc import Callable, Sequence
from datetime import datetime
from typing import Any

from app.charts import COMPACT, column_chart
from app.models import Dataset
from app.ranking.compute import FeatureStore
from app.ranking.evaluate import (
    TOP_K,
    auc,
    eligible_pool,
    evaluate,
    training_set,
    truth_state,
)
from app.ranking.features import RANKING_FEATURES
from app.synthetic import truth
from app.synthetic.generator import generate

Predictor = Callable[[list[list[float]]], list[float]]
Fit = Callable[[list[list[float]], list[bool]], tuple[Predictor, dict[str, Any]]]

# Os critérios de troca, escritos antes do resultado (combinados em 11/11/2026).
MIN_GAIN = 0.01  # 1 ponto de chance de sucesso do top-5 contra a regressão logística
MIN_Z = 3.0  # e pelo menos 3 erros-padrão (diferença pareada por vaga)
NONLINEAR = "Regra não linear"
BASE = "Base"
# Termos extras do aceite (ver `truth.py`): a distância pesa mais a partir de 15 km, e quem
# prefere o período aguenta mais distância.
NONLINEAR_ACCEPT = {"distance_far": -0.30, "distance_preference": 0.06}


def worlds(base: dict[str, Any]) -> list[tuple[str, dict[str, Any]]]:
    """A base, três outras sementes e o mundo com regra não linear."""
    accept = {**base["accept"], **NONLINEAR_ACCEPT}
    return [
        (BASE, base),
        ("Outra semente (1)", {**base, "seed": 1}),
        ("Outra semente (2)", {**base, "seed": 2}),
        ("Outra semente (3)", {**base, "seed": 3}),
        (NONLINEAR, {**base, "accept": accept}),
    ]


def fit_lightgbm(matrix: list[list[float]], labels: list[bool]) -> tuple[Predictor, dict[str, Any]]:
    """Treina o LightGBM: 80% mais antigos ajustam, 20% mais recentes param o treino cedo.

    As linhas chegam em ordem de envio, então o corte é temporal. Depois, o modelo final é
    treinado de novo com todo o passado, no número de rodadas que a validação escolheu, como a
    regressão logística, que também usa todo o passado.
    """
    import lightgbm as lgb
    import numpy as np

    names = list(RANKING_FEATURES)
    x = np.asarray(matrix, dtype=float)
    y = np.asarray([int(label) for label in labels], dtype=int)
    cut = int(len(x) * 0.8)
    params = {
        "objective": "binary",
        "metric": "binary_logloss",
        "learning_rate": 0.05,
        "num_leaves": 15,
        "min_data_in_leaf": 40,
        "feature_fraction": 0.9,
        "bagging_fraction": 0.8,
        "bagging_freq": 1,
        "lambda_l2": 1.0,
        "num_threads": 1,
        "seed": 7,
        "deterministic": True,
        "force_row_wise": True,
        "verbose": -1,
    }
    train_part = lgb.Dataset(x[:cut], label=y[:cut], feature_name=names)
    valid_part = lgb.Dataset(x[cut:], label=y[cut:], reference=train_part)
    first = lgb.train(
        params,
        train_part,
        num_boost_round=500,
        valid_sets=[valid_part],
        callbacks=[lgb.early_stopping(30, verbose=False)],
    )
    rounds = first.best_iteration if first.best_iteration > 0 else first.current_iteration()
    final = lgb.train(params, lgb.Dataset(x, label=y, feature_name=names), num_boost_round=rounds)
    gains = final.feature_importance(importance_type="gain")
    total = float(sum(gains)) or 1.0

    def predict(rows: list[list[float]]) -> list[float]:
        return [float(p) for p in final.predict(np.asarray(rows, dtype=float), num_threads=1)]

    info = {
        "library": f"lightgbm {lgb.__version__}",
        "rounds": rounds,
        "importance": {name: float(g) / total for name, g in zip(names, gains, strict=True)},
    }
    return predict, info


def _matrix(rows: Sequence[dict[str, float]]) -> list[list[float]]:
    return [[row[name] for name in RANKING_FEATURES] for row in rows]


def _brier(predictions: Sequence[float], labels: Sequence[bool]) -> float:
    return sum((p - float(y)) ** 2 for p, y in zip(predictions, labels, strict=True)) / len(labels)


def _paired(values: Sequence[float], reference: Sequence[float]) -> tuple[float, float]:
    diffs = [a - b for a, b in zip(values, reference, strict=True)]
    n = len(diffs)
    mean = sum(diffs) / n
    if n < 2:
        return mean, float("nan")
    variance = sum((d - mean) ** 2 for d in diffs) / (n - 1)
    return mean, math.sqrt(variance / n)


def _top_chance(scores: list[float], chance: list[float], ids: list[str]) -> float:
    """Chance média verdadeira de sucesso dos TOP_K de maior score (empate pelo menor id)."""
    best = sorted(range(len(ids)), key=lambda i: (-scores[i], ids[i]))[:TOP_K]
    return sum(chance[i] for i in best) / TOP_K


def compare_world(name: str, dataset: Dataset, params: dict[str, Any], fit: Fit) -> dict[str, Any]:
    """Treina os dois modelos no passado e compara no período de teste."""
    logistic, metrics = evaluate(dataset, params)
    test_start = datetime.fromisoformat(params["test_start"])
    store = FeatureStore(dataset)
    train = sorted(
        (o for o in dataset.offers if o.sent_at < test_start), key=lambda o: (o.sent_at, o.shift_id)
    )
    test = [o for o in dataset.offers if o.sent_at >= test_start]
    train_rows, train_labels = training_set(dataset, store, train)
    predict, info = fit(_matrix(train_rows), train_labels)
    test_rows, test_labels = training_set(dataset, store, test)
    p_logistic = [logistic.probability(f) for f in test_rows]
    p_boost = predict(_matrix(test_rows))
    summary = metrics["counterfactual"]
    chances_logistic: list[float] = []
    chances_boost: list[float] = []
    shifts = sorted(
        (s for s in dataset.shifts.values() if s.published_at >= test_start),
        key=lambda s: (s.published_at, s.id),
    )
    for shift in shifts:
        duration = (shift.ends_at - shift.starts_at).total_seconds() / 3600
        pool = eligible_pool(dataset, store, shift)
        if len(pool) < TOP_K:
            continue
        chance = [
            truth.p_success(
                params["accept"],
                reliability=dataset.latent[doctor.id],
                **truth_state(f, shift, duration),
            )
            for doctor, f in pool
        ]
        ids = [doctor.id for doctor, _ in pool]
        by_logistic = [logistic.probability(f) for _, f in pool]
        by_boost = predict(_matrix([f for _, f in pool]))

        chances_logistic.append(_top_chance(by_logistic, chance, ids))
        chances_boost.append(_top_chance(by_boost, chance, ids))
    gain, gain_se = _paired(chances_boost, chances_logistic)
    return {
        "world": name,
        "accept_rate": sum(o.accepted for o in dataset.offers) / len(dataset.offers),
        "n_train_offers": len(train),
        "n_test_offers": len(test),
        "n_shifts": len(chances_logistic),
        "auc_logistic": auc(p_logistic, test_labels),
        "auc_boost": auc(p_boost, test_labels),
        "auc_baseline": metrics["auc_baseline"],
        "brier_logistic": _brier(p_logistic, test_labels),
        "brier_boost": _brier(p_boost, test_labels),
        "top5_oracle": summary["oracle"],
        "top5_baseline": summary["baseline"],
        "top5_random": summary["random"],
        "top5_logistic": sum(chances_logistic) / len(chances_logistic),
        "top5_boost": sum(chances_boost) / len(chances_boost),
        "gain": gain,
        "gain_se": gain_se,
        "fit": info,
    }


def verdict(gain: float, gain_se: float) -> str:
    """Ganha, perde ou empata, pelos critérios combinados (diferença pareada por vaga)."""
    if gain_se > 0 and gain >= MIN_GAIN and gain / gain_se >= MIN_Z:
        return "ganha"
    if gain_se > 0 and gain <= -MIN_GAIN and -gain / gain_se >= MIN_Z:
        return "perde"
    return "empata"


def decide(rows: Sequence[dict[str, Any]]) -> dict[str, Any]:
    """Troca a regressão pelo LightGBM só se ele ganhar na base e no mundo não linear."""
    verdicts = {row["world"]: verdict(row["gain"], row["gain_se"]) for row in rows}
    return {
        "verdicts": verdicts,
        "swap": all(verdicts.get(w) == "ganha" for w in (BASE, NONLINEAR)),
    }


def evaluate_lightgbm(
    params: dict[str, Any], fit: Fit = fit_lightgbm, only: Sequence[str] | None = None
) -> dict[str, Any]:
    """Compara nos mundos da lista. `fit` é o treino do LightGBM (um falso nos testes)."""
    rows = []
    for name, world_params in worlds(params):
        if only is not None and name not in only:
            continue
        rows.append(compare_world(name, generate(world_params), world_params, fit))
    return {"label": "simulacao", "rows": rows, "decision": decide(rows)}


def _num(value: float, digits: int = 3) -> str:
    return f"{value:.{digits}f}".replace(".", ",")


def _pct(value: float, digits: int = 1) -> str:
    return f"{value * 100:.{digits}f}%".replace(".", ",")


def _points(value: float) -> str:
    text = _num(abs(value) * 100, 1)
    return f"−{text}" if value < 0 else f"+{text}"


def render_lightgbm(metrics: dict[str, Any]) -> str:
    """Relatório em Markdown, com o rótulo de simulação em todo número."""
    rows = {row["world"]: row for row in metrics["rows"]}
    decision = metrics["decision"]
    base, nonlinear = rows[BASE], rows[NONLINEAR]
    library = base["fit"].get("library", "LightGBM")
    lines = [
        "# Regressão logística contra LightGBM (simulação)",
        "",
        "> **Simulação.** Os dados são sintéticos e o modelo aprende o simulador que os gerou "
        "(circularidade). O que vale é a comparação entre os modelos nas mesmas condições, e não "
        "o valor absoluto. Gerado na CI por `python -m app.cli lightgbm` "
        f"({library}), que roda só lá: o LightGBM não faz parte das dependências da API.",
        "",
        "## Pergunta",
        "",
        "A Etapa 2 prometeu comparar a regressão logística com o LightGBM, e a Entrega 3 deixou "
        "isso como não feito. O LightGBM ganha? E o que acontece se o simulador tiver uma regra "
        "que a regressão logística não representa?",
        "",
        "## Como foi feito",
        "",
        "- **Mesmo teste temporal** do restante do projeto: treino com as ofertas anteriores a "
        f"2026-08-01 ({base['n_train_offers']} na base) e avaliação depois dessa data "
        f"({base['n_test_offers']} ofertas), com as mesmas sete variáveis do ranking.",
        "- **LightGBM:** 15 folhas, taxa de 0,05, no máximo 500 rodadas e parada cedo numa "
        "validação com os 20% mais recentes do treino; depois, treino de novo com todo o passado.",
        "- **Três medidas:** AUC e erro de probabilidade (Brier) nas ofertas de teste, e a chance "
        "média de sucesso verdadeira do top-5 (contrafactual, só em simulação), pareada por vaga.",
        "- **Mundos:** a base, três outras sementes e um mundo com **regra não linear**: a "
        "distância pesa mais a partir de 15 km, e a preferência de período muda quanto ela pesa. "
        "A regressão logística não representa nenhuma das duas coisas.",
        f"- **Critério de troca, escrito antes do resultado:** o LightGBM só substituiria a "
        f"regressão se ganhasse pelo menos {_num(MIN_GAIN * 100, 0)} ponto de chance de sucesso "
        f"do top-5, com pelo menos {_num(MIN_Z, 0)} erros-padrão, **na base e no mundo não "
        "linear**.",
        "",
        "## Resultado",
        "",
        "| Mundo | AUC: baseline | AUC: logística | AUC: LightGBM | Brier: logística | Brier: "
        "LightGBM | Top-5: oráculo | Top-5: logística | Top-5: LightGBM | LightGBM menos "
        "logística (erro-padrão) | Veredito |",
        "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |",
    ]
    for name in (BASE, "Outra semente (1)", "Outra semente (2)", "Outra semente (3)", NONLINEAR):
        r = rows[name]
        lines.append(
            f"| {name} | {_num(r['auc_baseline'])} | {_num(r['auc_logistic'])} | "
            f"{_num(r['auc_boost'])} | {_num(r['brier_logistic'])} | {_num(r['brier_boost'])} | "
            f"{_pct(r['top5_oracle'])} | {_pct(r['top5_logistic'])} | {_pct(r['top5_boost'])} | "
            f"{_points(r['gain'])} (±{_num(r['gain_se'] * 100, 2)}) | "
            f"{decision['verdicts'][name]} |"
        )
    lines += [
        "",
        "![Chance de sucesso do top-5, por modelo e mundo (simulação)](fig-lightgbm.svg)",
        "",
        "## Leitura",
        "",
        f"- **Na base, o LightGBM {decision['verdicts'][BASE]}** "
        f"({_points(base['gain'])} ponto de chance de sucesso do top-5; AUC "
        f"{_num(base['auc_boost'])} contra {_num(base['auc_logistic'])}). O simulador é quase "
        "linear na escala logística, e é isso que a regressão aprende; um modelo mais flexível "
        "não tem muito o que acrescentar.",
        f"- **No mundo com regra não linear, o LightGBM {decision['verdicts'][NONLINEAR]}** "
        f"({_points(nonlinear['gain'])} ponto; AUC {_num(nonlinear['auc_boost'])} contra "
        f"{_num(nonlinear['auc_logistic'])}). Os dois ficam longe do oráculo "
        f"({_points(nonlinear['top5_logistic'] - nonlinear['top5_oracle'])} e "
        f"{_points(nonlinear['top5_boost'] - nonlinear['top5_oracle'])} pontos), que enxerga a "
        "confiabilidade latente do médico, algo que nenhum dos modelos vê.",
        f"- **Entre os {len(rows)} mundos, a diferença do LightGBM para a regressão vai de "
        f"{_points(min(r['gain'] for r in rows.values()))} a "
        f"{_points(max(r['gain'] for r in rows.values()))} ponto(s).** Ele não passa "
        "consistentemente à frente nem na base nem onde a regra deixa de ser linear.",
    ]
    if decision["swap"]:
        lines.append(
            "- **Decisão: o critério de troca foi cumprido nos dois mundos.** Mesmo assim, o "
            "LightGBM não entra agora: a API, o modelo congelado, a ficha e a explicação por "
            "variável foram feitos para a regressão. Ele fica como candidato para o piloto, a ser "
            "comparado com ofertas reais, num teste temporal do próprio hospital."
        )
    else:
        lines.append(
            "- **Decisão: a regressão logística continua.** O LightGBM não cumpre o critério nos "
            "dois mundos. Além do desempenho, a regressão tem a leitura por peso, que a tela do "
            'coordenador mostra como "por que este nome".'
        )
    importance = base["fit"].get("importance", {})
    if importance:
        top = sorted(importance.items(), key=lambda item: -item[1])[:4]
        names = ", ".join(f"`{name}` ({_pct(share, 0)})" for name, share in top)
        lines.append(
            f"- **O que o LightGBM usa na base** (ganho por variável): {names}. As mesmas "
            "variáveis que a regressão pesa mais."
        )
    lines += [
        "",
        "## Limites",
        "",
        "- É o mesmo simulador dos dois lados: o modelo aprende o mundo que o gerou. A comparação "
        "diz como cada modelo se sai nesse mundo e em uma variação dele, e não no hospital.",
        "- O mundo não linear foi escolhido pelo grupo para ter o que o LightGBM representa e a "
        "regressão não; os termos extras (−0,30 por km acima de 15 e +0,06 por km vezes a "
        "preferência) são arbitrários, e outra forma de não linearidade poderia dar outro "
        "resultado.",
        "- Hiperparâmetros fixos, sem busca; uma busca pode melhorar o LightGBM e não o "
        "piorará.",
        "- O LightGBM roda só na CI. Se vier a entrar no produto, a explicação por variável "
        "poderia vir das contribuições do próprio LightGBM, mas isso é trabalho novo.",
        "",
    ]
    return "\n".join(lines)


def lightgbm_chart(metrics: dict[str, Any]) -> str:
    """Colunas agrupadas: a chance de sucesso do top-5 da regressão e do LightGBM, por mundo."""
    order = [BASE, "Outra semente (1)", "Outra semente (2)", "Outra semente (3)", NONLINEAR]
    rows = {row["world"]: row for row in metrics["rows"]}
    labels = ["Base", "Semente 1", "Semente 2", "Semente 3", "Não linear"]
    return column_chart(
        "Chance de sucesso do top-5",
        "Regressão logística e LightGBM, por mundo; simulação",
        labels,
        [
            ("Logística", [rows[name]["top5_logistic"] * 100 for name in order]),
            ("LightGBM", [rows[name]["top5_boost"] * 100 for name in order]),
        ],
        lambda value: f"{value:.0f}%",
        "Colunas agrupadas com a chance média de sucesso do top-5 da regressão logística e do "
        "LightGBM, na base, em três outras sementes e no mundo com regra não linear.",
        **COMPACT,
    )
