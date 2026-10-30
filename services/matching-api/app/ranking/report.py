"""Texto em Markdown (português do Brasil) com os resultados da avaliação do ranking."""

from typing import Any

FEATURE_LABELS = {
    "specialty_match": "Especialidade (principal = 1; secundária = 0,5)",
    "distance_km": "Distância até o hospital (km)",
    "availability_overlap_hours": "Horas da vaga cobertas pela disponibilidade",
    "acceptance_rate_90d": "Taxa de aceite nos últimos 90 dias",
    "attendance_rate_90d": "Taxa de comparecimento nos últimos 90 dias",
    "hours_since_last_shift": "Horas desde o último plantão",
    "shifts_last_30d": "Plantões nos últimos 30 dias",
    "offers_received_30d": "Ofertas recebidas nos últimos 30 dias",
    "night_shift_preference_match": "Preferência de período coincide",
}
ATTRIBUTE_LABELS = {
    "gender": "Gênero",
    "age_band": "Faixa etária",
    "home_zone": "Zona de residência",
}


def num(value: float, decimals: int = 3) -> str:
    return f"{value:.{decimals}f}".replace(".", ",")


def pct(value: float, decimals: int = 1) -> str:
    return f"{value * 100:.{decimals}f}%".replace(".", ",")


def render_metrics(metrics: dict[str, Any]) -> str:
    cf = metrics["counterfactual"]
    lines = [
        "# Resultados preliminares do ranking (simulação)",
        "",
        "> **Simulação.** Os dados são sintéticos e o modelo aprende o simulador que os gerou "
        "(circularidade). Nada aqui é evidência de desempenho no mundo real. O que importa é a "
        "comparação com o baseline heurístico, nas mesmas condições.",
        "",
        f"Modelo: `{metrics['model_version']}` (regressão logística). Teste temporal: ofertas a "
        f"partir de {metrics['test_start']}; treino com as anteriores.",
        "",
        "## Avaliação observacional (AUC)",
        "",
        f"Treino: {metrics['n_train_offers']} ofertas (sucesso em "
        f"{pct(metrics['train_success_rate'])}). Teste: {metrics['n_test_offers']} ofertas "
        f"(sucesso em {pct(metrics['test_success_rate'])}). Só há resposta de quem foi chamado "
        "pelo processo manual simulado (viés de seleção).",
        "",
        "| Ranking | AUC no teste |",
        "| --- | ---: |",
        f"| Baseline heurístico (distância e disponibilidade) | {num(metrics['auc_baseline'])} |",
        f"| Modelo (regressão logística) | {num(metrics['auc_model'])} |",
        "",
        "## Avaliação contrafactual (possível só em simulação)",
        "",
        f"Para cada uma das {cf['n_shifts']:.0f} vagas do período de teste, o filtro de regras "
        f"deixou em média {cf['mean_pool']:.0f} médicos elegíveis. Como o simulador conhece a "
        "chance verdadeira de cada um aceitar e comparecer, mede-se a **chance média de sucesso "
        "dos 5 recomendados** (equivale à precisão@5 esperada).",
        "",
        "| Método | Chance média no top-5 | Em relação ao oráculo |",
        "| --- | ---: | ---: |",
        f"| Oráculo (os 5 melhores de verdade) | {pct(cf['oracle'])} | 100,0% |",
        f"| Modelo | {pct(cf['model'])} | {pct(cf['model_efficiency'])} |",
        f"| Baseline heurístico | {pct(cf['baseline'])} | {pct(cf['baseline_efficiency'])} |",
        f"| Sorteio entre elegíveis | {pct(cf['random'])} | {pct(cf['random_efficiency'])} |",
        "",
        f"Diferença modelo menos baseline: **{num(cf['model_minus_baseline'] * 100, 1)} pontos "
        f"percentuais** (erro-padrão {num(cf['model_minus_baseline_se'] * 100, 2)}), pareada por "
        "vaga.",
        "",
        "## Coeficientes do modelo (variáveis padronizadas)",
        "",
        "| Variável | Peso |",
        "| --- | ---: |",
    ]
    for item in metrics["coefficients"]:
        label = FEATURE_LABELS.get(item["feature"], item["feature"])
        lines.append(f"| {label} (`{item['feature']}`) | {num(item['weight'])} |")
    lines += [
        "",
        "Pesos positivos aumentam o score. Os pesos refletem o treino em ofertas do processo "
        "manual, que chamou também médicos sem disponibilidade; por isso a cobertura da vaga "
        "pesa muito no treino e é constante entre os elegíveis (o filtro já exige cobertura "
        "total).",
        "",
        "## Participação no top-5 em relação aos elegíveis",
        "",
        "Razão = participação no top-5 dividida pela participação entre os elegíveis (1,00 = "
        "proporcional). Atributos de auditoria, **fora** do ranking.",
        "",
        "| Atributo | Grupo | Elegíveis | Top-5 modelo | Razão modelo | Top-5 baseline | "
        "Razão baseline |",
        "| --- | --- | ---: | ---: | ---: | ---: | ---: |",
    ]
    for row in metrics["fairness"]:
        lines.append(
            f"| {ATTRIBUTE_LABELS[row['attribute']]} | {row['value']} | {pct(row['pool_share'])} "
            f"| {pct(row['model_share'])} | {num(row['model_ratio'], 2)} "
            f"| {pct(row['baseline_share'])} | {num(row['baseline_ratio'], 2)} |"
        )
    lines += [
        "",
        "A distância funciona como proxy da zona de residência: quem mora perto do hospital é "
        "recomendado mais vezes. É um critério operacional legítimo, mas precisa de "
        "monitoramento e de revisão humana (ver `docs/seguranca-ameacas.md`).",
        "",
    ]
    return "\n".join(lines)
