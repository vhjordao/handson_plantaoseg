"""Teste de premissas e simulação de lançamento: o que resiste se o simulador estiver errado.

Responde ao ponto do feedback da Etapa 2 sobre a falta de dados reais. Não substitui dado real:
refaz o mundo simulado com outras premissas e mostra quais conclusões dependem de quais delas, o que
define as perguntas das entrevistas. Tudo é simulação com dados sintéticos.
"""

from datetime import datetime, timedelta
from typing import Any

from app import public_data
from app.charts import COMPACT, column_chart, line_chart
from app.flow import REPS, evaluate_flow
from app.models import Dataset, Offer
from app.ranking.baseline import baseline_score
from app.ranking.compute import FeatureStore
from app.ranking.evaluate import auc, counterfactual, evaluate, training_set
from app.ranking.model import train_model
from app.ranking.report import num, pct
from app.synthetic.generator import AGE_WEIGHTS, generate

BASE = "Base"
TIME_GOAL = 0.5  # meta da Entrega 1: reduzir o tempo pela metade
LAUNCH_DAYS = (7, 14, 21, 30, 45, 60, 90, 120, 180, 240, 300)
LAUNCH_WINDOW_DAYS = 60
CALIBRATED = "Calibrado com dados públicos"


def scenarios(base: dict[str, Any]) -> list[tuple[str, dict[str, Any]]]:
    """Nome e parâmetros de cada cenário: a base com uma premissa alterada de cada vez."""
    weights = base["accept"]

    def accept(**changes: float) -> dict[str, Any]:
        return {"accept": {**weights, **changes}}

    overrides: list[tuple[str, dict[str, Any]]] = [
        (BASE, {}),
        ("Outra semente (1)", {"seed": 1}),
        ("Outra semente (2)", {"seed": 2}),
        ("Outra semente (3)", {"seed": 3}),
        ("Distância pesa metade", accept(distance=weights["distance"] * 0.5)),
        ("Distância pesa o dobro", accept(distance=weights["distance"] * 2)),
        ("Preferência pesa metade", accept(preference=weights["preference"] * 0.5)),
        ("Preferência pesa o dobro", accept(preference=weights["preference"] * 2)),
        ("Confiabilidade pesa metade", accept(reliability=weights["reliability"] * 0.5)),
        ("Confiabilidade pesa o dobro", accept(reliability=weights["reliability"] * 2)),
        ("Aceite geral menor", accept(b0=weights["b0"] - 0.7)),
        ("Aceite geral maior", accept(b0=weights["b0"] + 0.7)),
        ("Agenda pesa um quarto", accept(not_covered=weights["not_covered"] * 0.25)),
        ("Sem viés histórico", {"historical_bias_scenario": False}),
        ("Oferta expira em 30 min", {"ttl_minutes": 30}),
        ("Oferta expira em 120 min", {"ttl_minutes": 120}),
        (CALIBRATED, public_data.calibration()),
    ]
    return [(name, {**base, **changes}) for name, changes in overrides]


def measure(
    name: str, dataset: Dataset, params: dict[str, Any], reps: int = REPS
) -> dict[str, Any]:
    """Treina, avalia e mede o fluxo de um cenário."""
    model, metrics = evaluate(dataset, params)
    flow = evaluate_flow(dataset, params, model, reps=reps)
    summary, manual, recommended = metrics["counterfactual"], flow["manual"]["test"], flow["flow"]
    return {
        "scenario": name,
        "accept_rate": sum(o.accepted for o in dataset.offers) / len(dataset.offers),
        "uncovered_manual": manual["uncovered_share"],
        "auc_model": metrics["auc_model"],
        "auc_baseline": metrics["auc_baseline"],
        "top5_model": summary["model"],
        "top5_baseline": summary["baseline"],
        "top5_oracle": summary["oracle"],
        "top5_random": summary["random"],
        "offers_manual": manual["offers_per_shift"],
        "offers_random": recommended["random"]["offers_per_shift"],
        "offers_baseline": recommended["baseline"]["offers_per_shift"],
        "offers_model": recommended["model"]["offers_per_shift"],
        "time_manual": manual["time_mean"],
        "time_random": recommended["random"]["time_mean"],
        "time_baseline": recommended["baseline"]["time_mean"],
        "time_model": recommended["model"]["time_mean"],
        "concentration_manual": flow["concentration"]["manual_offers"],
        "concentration_model": flow["concentration"]["model_top5_slots"],
    }


def time_cut(row: dict[str, Any], against: str) -> float:
    """Quanto o fluxo com o modelo reduz o tempo médio contra `against`."""
    return 1 - row["time_model"] / row[f"time_{against}"]


def summarize(rows: list[dict[str, Any]]) -> dict[str, Any]:
    """Em quantos cenários cada conclusão se mantém, e a faixa de cada ganho."""
    lifts = [row["top5_model"] - row["top5_baseline"] for row in rows]
    cuts = {
        against: [time_cut(row, against) for row in rows]
        for against in ("manual", "random", "baseline")
    }
    return {
        "n_scenarios": len(rows),
        "top5_wins": sum(lift > 0 for lift in lifts),
        "top5_lift_min": min(lifts),
        "top5_lift_max": max(lifts),
        "auc_wins": sum(row["auc_model"] > row["auc_baseline"] for row in rows),
        "time_cut": {
            against: {"min": min(values), "max": max(values)} for against, values in cuts.items()
        },
        "time_goal_met": sum(cut >= TIME_GOAL for cut in cuts["manual"]),
        "time_goal_missed": [
            row["scenario"]
            for row, cut in zip(rows, cuts["manual"], strict=True)
            if cut < TIME_GOAL
        ],
        "concentration_worse": sum(
            row["concentration_model"] > row["concentration_manual"] for row in rows
        ),
    }


def coordinator_levels(base: dict[str, Any]) -> list[dict[str, Any]]:
    """O ganho do modelo conforme o que o coordenador real já faz, medido na base."""
    return [
        {"level": label, "offers": base[f"offers_{key}"], "cut": time_cut(base, key)}
        for label, key in (
            ("Chama sem conferir a agenda (premissa atual)", "manual"),
            ("Já chama só quem pode ir, em qualquer ordem", "random"),
            ("Já escolhe tão bem quanto o baseline", "baseline"),
        )
    ]


def launch_curve(
    dataset: Dataset,
    params: dict[str, Any],
    days: tuple[int, ...] = LAUNCH_DAYS,
    window_days: int = LAUNCH_WINDOW_DAYS,
) -> list[dict[str, Any]]:
    """Simula o lançamento: no dia D, treina com o que já se sabia e testa nos dias seguintes."""
    store = FeatureStore(dataset)
    start = datetime.fromisoformat(params["start_date"])
    offers = sorted(dataset.offers, key=lambda o: (o.sent_at, o.id))
    rows = []
    for day in days:
        cutoff = start + timedelta(days=day)
        end = cutoff + timedelta(days=window_days)
        # O rótulo (aceitou e compareceu) só existe depois do plantão.
        train = [o for o in offers if dataset.shifts[o.shift_id].ends_at <= cutoff]
        test = [o for o in offers if cutoff <= o.sent_at < end]
        shifts = [s for s in dataset.shifts.values() if cutoff <= s.published_at < end]
        x_train, y_train = training_set(dataset, store, train)
        if not test or not shifts or len(set(y_train)) < 2:
            continue
        model = train_model(x_train, y_train, f"lancamento-dia-{day}")
        x_test, y_test = training_set(dataset, store, test)
        base_scores = []
        for offer, features in zip(test, x_test, strict=True):
            shift = dataset.shifts[offer.shift_id]
            hours = (shift.ends_at - shift.starts_at).total_seconds() / 3600
            radius = dataset.doctors[offer.doctor_id].max_radius_km
            base_scores.append(baseline_score(features, radius_km=radius, duration_h=hours))
        summary, _ = counterfactual(dataset, store, model, params["accept"], shifts)
        rows.append(
            {
                "day": day,
                "train_offers": len(train),
                "train_successes": sum(y_train),
                "test_shifts": len(shifts),
                "auc_model": auc([model.probability(f) for f in x_test], y_test),
                "auc_baseline": auc(base_scores, y_test),
                "top5_model": summary["model"],
                "top5_baseline": summary["baseline"],
                "lift": summary["model_minus_baseline"],
                "lift_se": summary["model_minus_baseline_se"],
            }
        )
    return rows


def label_cutoff_check(dataset: Dataset, params: dict[str, Any]) -> dict[str, Any]:
    """Quanto muda a avaliação principal se o treino usar só resultados já conhecidos no corte."""
    cutoff = datetime.fromisoformat(params["test_start"])
    store = FeatureStore(dataset)
    test = [o for o in dataset.offers if o.sent_at >= cutoff]
    shifts = [s for s in dataset.shifts.values() if s.published_at >= cutoff]
    x_test, y_test = training_set(dataset, store, test)

    def score(offers: list[Offer]) -> dict[str, float]:
        rows, labels = training_set(dataset, store, offers)
        model = train_model(rows, labels, "conferencia-do-rotulo")
        summary, _ = counterfactual(dataset, store, model, params["accept"], shifts)
        scores = [model.probability(f) for f in x_test]
        return {"auc": auc(scores, y_test), "top5": summary["model"]}

    sent = [o for o in dataset.offers if o.sent_at < cutoff]
    known = [o for o in sent if dataset.shifts[o.shift_id].ends_at <= cutoff]
    return {
        "n_sent": len(sent),
        "n_late": len(sent) - len(known),
        "published": score(sent),
        "strict": score(known),
    }


def first_lasting_win(curve: list[dict[str, Any]]) -> dict[str, Any] | None:
    """Primeiro ponto a partir do qual o modelo fica sempre à frente do baseline, se houver."""
    winner = None
    for row in reversed(curve):
        if row["lift"] <= 0:
            break
        winner = row
    return winner


def public_comparison(dataset: Dataset, params: dict[str, Any]) -> list[dict[str, Any]]:
    """Premissa do simulador, o que a amostra gerada deu e o que dizem os agregados públicos."""
    doctors = list(dataset.doctors.values())
    pediatrics = [d for d in doctors if d.specialty == "pediatria"]
    clinical = [d for d in doctors if d.specialty == "clinica_medica"]
    weights = public_data.age_weights()

    def female(group: list[Any]) -> float:
        return sum(d.gender == "F" for d in group) / len(group)

    def band(name: str) -> float:
        return sum(d.age_band == name for d in doctors) / len(doctors)

    return [
        {
            "premise": "Pediatras entre as duas especialidades",
            "assumed": params["share_pediatria"],
            "generated": len(pediatrics) / len(doctors),
            "public": public_data.share_pediatria(),
            "reading": "A premissa acerta; a amostra de 300 médicos saiu acima dela por sorteio",
        },
        {
            "premise": "Mulheres na pediatria",
            "assumed": 0.5,
            "generated": female(pediatrics),
            "public": public_data.share_female()["pediatria"],
            "reading": "O simulador erra: há bem mais mulheres na pediatria",
        },
        {
            "premise": "Mulheres na clínica médica",
            "assumed": 0.5,
            "generated": female(clinical),
            "public": public_data.share_female()["clinica_medica"],
            "reading": "Perto da premissa",
        },
        {
            "premise": "Mais jovens (simulador: 25 a 34; estudo: até 35 anos)",
            "assumed": AGE_WEIGHTS[0],
            "generated": band("25-34"),
            "public": weights[0],
            "reading": "Perto da premissa; os recortes não são idênticos",
        },
        {
            "premise": "Com 55 anos ou mais",
            "assumed": AGE_WEIGHTS[3],
            "generated": band("55+"),
            "public": weights[3],
            "reading": "O simulador erra: há quase o dobro de médicos nessa faixa",
        },
    ]


def evaluate_robustness(
    base: dict[str, Any],
    cases: list[tuple[str, dict[str, Any]]] | None = None,
    reps: int = REPS,
) -> dict[str, Any]:
    """Roda todos os cenários, a simulação de lançamento e a comparação com dados públicos."""
    rows, curve, comparison, label_check = [], [], [], {}
    for name, params in cases if cases is not None else scenarios(base):
        dataset = generate(params)
        rows.append(measure(name, dataset, params, reps))
        if name == BASE:
            curve = launch_curve(dataset, params)
            comparison = public_comparison(dataset, params)
            label_check = label_cutoff_check(dataset, params)
    return {
        "label": "simulacao",
        "test_start": base["test_start"],
        "repetitions": reps,
        "scenarios": rows,
        "summary": summarize(rows),
        "coordinator_levels": coordinator_levels(rows[0]),
        "public_comparison": comparison,
        "label_cutoff_check": label_check,
        "launch": {
            "window_days": LAUNCH_WINDOW_DAYS,
            "curve": curve,
            "first_lasting_win": first_lasting_win(curve),
        },
    }


def _points(value: float) -> str:
    return f"{'+' if value >= 0 else ''}{num(value * 100, 1)}"


def _reading(wins: int, total: int) -> str:
    return "Resiste" if wins == total else "Depende das premissas"


def _scenario_rows(rows: list[dict[str, Any]]) -> list[str]:
    return [
        f"| {r['scenario']} | {pct(r['accept_rate'])} | {num(r['offers_manual'], 2)} | "
        f"{pct(r['uncovered_manual'])} | {num(r['auc_model'])} / {num(r['auc_baseline'])} | "
        f"{pct(r['top5_model'])} / {pct(r['top5_baseline'])} | "
        f"{r['time_manual']:.0f} / {r['time_model']:.0f} | {pct(time_cut(r, 'manual'), 0)} | "
        f"{pct(r['concentration_manual'], 0)} / {pct(r['concentration_model'], 0)} |"
        for r in rows
    ]


def _launch_rows(curve: list[dict[str, Any]]) -> list[str]:
    return [
        f"| {r['day']} | {r['train_offers']} | {r['train_successes']} | "
        f"{num(r['auc_model'])} / {num(r['auc_baseline'])} | "
        f"{pct(r['top5_model'])} / {pct(r['top5_baseline'])} | "
        f"{_points(r['lift'])} | {num(r['lift_se'] * 100, 1)} |"
        for r in curve
    ]


def _launch_reading(curve: list[dict[str, Any]], winner: dict[str, Any] | None) -> str:
    if winner is None:
        return "O modelo não chega a ficar à frente do baseline de forma estável."
    text = (
        f"O modelo fica à frente do baseline a partir do dia {winner['day']}, com "
        f"{winner['train_offers']} ofertas de resultado conhecido, e não perde mais até o fim."
    )
    behind = next((row for row in curve if row["lift"] <= 0), None)
    if behind is not None:
        text += (
            f" Antes disso, perde: no dia {behind['day']}, com {behind['train_offers']} ofertas, "
            f"fica {num(abs(behind['lift']) * 100, 1)} pontos atrás."
        )
    return text


def render_robustness(metrics: dict[str, Any]) -> str:
    """Relatório em Markdown (português do Brasil) com o que resiste e o que não resiste."""
    s, rows = metrics["summary"], metrics["scenarios"]
    n, cut = s["n_scenarios"], s["time_cut"]
    levels, launch = metrics["coordinator_levels"], metrics["launch"]
    curve = launch["curve"]
    missed = ", ".join(s["time_goal_missed"]) or "nenhum"
    base = next(row for row in rows if row["scenario"] == BASE)
    calibrated = next(row for row in rows if row["scenario"] == CALIBRATED)
    check = metrics["label_cutoff_check"]
    lines = [
        "# Teste de premissas e simulação de lançamento (simulação)",
        "",
        "> **Simulação.** Os dados são sintéticos. Este teste não substitui dado real: refaz o "
        "mundo simulado com outras premissas e mostra quais conclusões dependem de quais delas. "
        "É o que define o que perguntar nas [entrevistas](../entrevistas/LEIAME.md).",
        "",
        "## O que resiste e o que não resiste",
        "",
        f"Em cada um dos {n} cenários, os dados são gerados de novo com uma premissa alterada, o "
        "modelo é treinado de novo e a avaliação se repete nas vagas de teste.",
        "",
        "| Conclusão | Resultado | Leitura |",
        "| --- | --- | --- |",
        f"| O modelo supera o baseline na chance de sucesso do top-5 | {s['top5_wins']} de {n} "
        f"cenários, de {_points(s['top5_lift_min'])} a {_points(s['top5_lift_max'])} pontos | "
        f"{_reading(s['top5_wins'], n)} |",
        f"| O modelo supera o baseline no AUC | {s['auc_wins']} de {n} cenários | "
        f"{_reading(s['auc_wins'], n)} |",
        f"| O fluxo recomendado reduz ao menos 50% o tempo do processo manual | "
        f"{s['time_goal_met']} de {n} cenários; redução de {pct(cut['manual']['min'], 0)} a "
        f"{pct(cut['manual']['max'], 0)} | {_reading(s['time_goal_met'], n)} |",
        f"| O modelo reduz o tempo contra quem já chama só quem pode ir | "
        f"De {pct(cut['random']['min'], 0)} a {pct(cut['random']['max'], 0)} | "
        "Ganho real, mas menor que contra o processo manual |",
        f"| O modelo reduz o tempo contra o baseline | "
        f"De {pct(cut['baseline']['min'], 0)} a {pct(cut['baseline']['max'], 0)} | "
        "Ganho pequeno: o baseline já captura boa parte |",
        f"| A recomendação concentra mais ofertas que o processo manual | "
        f"{s['concentration_worse']} de {n} cenários | "
        "O problema não some com outras premissas: precisa de mitigação |",
        "",
        f"A meta de 50% não se sustenta em: {missed}.",
        "",
        "## Quanto o ganho depende do coordenador real",
        "",
        "O simulador assume que o coordenador chama sem conferir a agenda. Se o real já trabalha "
        "melhor, a economia de tempo encolhe, com tudo mais igual:",
        "",
        "<!-- keep -->",
        "| Se o coordenador real... | Ofertas por vaga hoje | Tempo que o modelo economiza |",
        "| --- | ---: | ---: |",
        *[f"| {x['level']} | {num(x['offers'], 2)} | {pct(x['cut'], 0)} |" for x in levels],
        "",
        "![Ganho de tempo conforme o coordenador real](fig-robustez-coordenador.svg)",
        "",
        "É a premissa que mais pesa, e só as entrevistas a resolvem: quantos médicos o coordenador "
        "chama até alguém aceitar.",
        "",
        "## Cenários",
        "",
        "Cada par segue a ordem do título da coluna. A última coluna é a parcela que vai para os "
        "10% de médicos mais chamados: das ofertas feitas, no manual, e dos lugares do top-5, no "
        "modelo.",
        "",
        "| Cenário | Aceite (manual) | Ofertas por vaga (manual) | Sem cobertura (manual) | AUC "
        "modelo / baseline | Top-5 modelo / baseline | Tempo manual / modelo (min) | Redução | "
        "10% mais chamados manual / modelo |",
        "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
        *_scenario_rows(rows),
        "",
        "## Comparação com dados públicos",
        "",
        f"Fonte: [{public_data.SOURCE}]({public_data.SOURCE_URL}), tabelas 3, 7 e 8, lida em "
        f"{public_data.READ_ON}. São totais nacionais de dezembro de 2024, sem nenhum registro "
        "individual, e contam títulos de especialista, não plantonistas nem hospitais privados.",
        "",
        "<!-- keep -->",
        "| Dado | Premissa | Amostra gerada | Estudo | Leitura |",
        "| --- | ---: | ---: | ---: | --- |",
        *[
            f"| {r['premise']} | {pct(r['assumed'])} | {pct(r['generated'])} | {pct(r['public'])} "
            f"| {r['reading']} |"
            for r in metrics["public_comparison"]
        ],
        "",
        f'No cenário "{CALIBRATED}", essas parcelas seguem o estudo, com o meio das faixas etárias '
        "dividido em partes iguais (premissa do grupo). O modelo continua à frente do baseline "
        f"({_points(calibrated['top5_model'] - calibrated['top5_baseline'])} pontos no top-5, "
        f"contra {_points(base['top5_model'] - base['top5_baseline'])} na base) e a redução "
        f"contra o manual fica em {pct(time_cut(calibrated, 'manual'), 0)}. Era esperado: gênero "
        "não entra na fórmula de aceite, e a idade só muda a exposição histórica. Por isso os "
        "agregados públicos corrigem a composição da população, não o comportamento. O estudo "
        "quase não traz números sobre plantão: o comportamento precisa vir das entrevistas. Os "
        "erros de gênero e idade pesam na auditoria de equidade, não no ranking, que não usa "
        "essas variáveis.",
        "",
        "## Simulação de lançamento",
        "",
        "Quanto histórico o modelo precisa para superar o baseline? No dia D depois do início, o "
        "modelo é treinado só com ofertas cujo plantão já terminou, porque antes disso não se sabe "
        f"se o médico compareceu, e é testado nas vagas dos {launch['window_days']} dias "
        "seguintes.",
        "",
        "| Dia | Ofertas com resultado | Sucessos | AUC modelo / baseline | Top-5 modelo / "
        "baseline | Diferença (pontos) | Erro padrão |",
        "| ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
        *_launch_rows(curve),
        "",
        "![Modelo contra baseline no lançamento](fig-robustez-curva.svg)",
        "",
        _launch_reading(curve, launch["first_lasting_win"]),
        "",
        "Por isso o lançamento começa pelo baseline, e o modelo só entra quando superar o baseline "
        "em teste temporal com dados do próprio hospital. O volume aqui é o de 3 hospitais "
        "simulados, com cerca de um terço das ofertas em cada um: um hospital sozinho levaria "
        "cerca de três vezes mais tempo para juntar o mesmo histórico.",
        "",
        "## Limites",
        "",
        "- O teste muda os **valores** das premissas, não a **forma** do comportamento: em todos "
        "os cenários, o aceite segue a mesma fórmula, com as mesmas variáveis. Um motivo real de "
        "recusa que o simulador não tem não aparece aqui. Quem mede isso são a revisão às cegas e "
        "o piloto em paralelo.",
        "- A chance de aceite dos elegíveis é a verdadeira do simulador; no mundo real, o modelo a "
        "estima com erro.",
        f"- Os tempos usam {metrics['repetitions']} repetições por vaga e as premissas de tempo do "
        "gerador, que não têm fonte externa.",
        f"- A avaliação principal treina com ofertas enviadas antes do corte, e {check['n_late']} "
        f"de {check['n_sent']} ({pct(check['n_late'] / check['n_sent'])}) têm o plantão depois "
        "dele, quando o resultado ainda não se saberia. Refeita só com resultados conhecidos, o "
        f"AUC vai de {num(check['published']['auc'], 4)} para {num(check['strict']['auc'], 4)} "
        f"e o top-5, de {pct(check['published']['top5'], 2)} para "
        f"{pct(check['strict']['top5'], 2)}. A diferença é desprezível, e a simulação de "
        "lançamento acima já usa a regra mais rigorosa.",
        "",
    ]
    return "\n".join(lines)


def coordinator_chart(metrics: dict[str, Any]) -> str:
    """Colunas com o tempo economizado pelo modelo conforme o coordenador real."""
    values = [x["cut"] * 100 for x in metrics["coordinator_levels"]]
    return column_chart(
        "Ganho de tempo conforme o coordenador real",
        "Tempo que o modelo economiza, em simulação",
        ["Não confere a agenda", "Só chama quem pode ir", "Igual ao baseline"],
        [("Tempo economizado", values)],
        lambda value: f"{value:.0f}%",
        "Colunas com o tempo economizado pelo modelo contra um coordenador que não confere a "
        "agenda, um que chama só quem pode ir e um que escolhe tão bem quanto o baseline.",
        **COMPACT,
    )


def launch_chart(metrics: dict[str, Any]) -> str:
    """Linhas com o top-5 do modelo e do baseline em cada dia do lançamento simulado."""
    curve = metrics["launch"]["curve"]
    return line_chart(
        "Modelo contra baseline no lançamento",
        "Chance de sucesso no top-5, por dia de histórico (simulação)",
        [str(row["day"]) for row in curve],
        [
            ("Modelo", [row["top5_model"] * 100 for row in curve]),
            ("Baseline", [row["top5_baseline"] * 100 for row in curve]),
        ],
        lambda value: f"{num(value, 1)}%",
        "Linhas com a chance de sucesso no top-5 do modelo e do baseline conforme os dias de "
        "histórico: o modelo começa abaixo e depois fica acima do baseline.",
        **COMPACT,
    )
