"""Análise exploratória dos dados sintéticos: tabelas, correlações, viés de exposição e texto.

Gera `docs/analise/README.md` e as figuras em SVG. Tudo é simulação: os padrões descrevem o
simulador (premissas do projeto), não hospitais ou médicos reais.
"""

import math
import re
from collections import Counter
from pathlib import Path
from typing import Any

from app.charts import column_chart
from app.llm.extraction import extract_by_rules
from app.llm.guardrails import detect_injection, normalize
from app.models import Dataset, Offer
from app.ranking.compute import FeatureStore
from app.ranking.evaluate import offer_features
from app.ranking.features import CONTEXT_VARIABLES, RANKING_FEATURES
from app.ranking.report import FEATURE_LABELS, num, pct
from app.synthetic.quality import summary_stats

WEEKDAYS = ("segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo")
STOPWORDS = {
    "para", "preciso", "plantao", "urgencia", "como", "dele", "dela", "todos", "todas",
    "sobre", "esse", "essa", "isso", "seus", "suas", "pelo", "pela", "aqui", "mais",
}  # fmt: skip
FIELD_PATTERNS = {
    "horário (19h às 7h)": r"\d{1,2}\s*h?\s*(?:as|a|ate|-)\s*\d{1,2}",
    "data (dia da semana, dd/mm ou hoje)": (
        r"\b(segunda|terca|quarta|quinta|sexta|sesta|sabado|domingo|seg|qua|qui|sex|sab|dom)\b"
        r"|\bter(?=\s+\d)|\d{1,2}/\d{1,2}|\bhoje\b"
    ),
    "especialidade": r"pediat|clinic",
    "unidade (Centro, Norte, Sul)": r"\b(centro|norte|sul)\b",
    "urgência": r"urg",
}


def pearson(xs: list[float], ys: list[float]) -> float:
    n = len(xs)
    mean_x, mean_y = sum(xs) / n, sum(ys) / n
    sxx = sum((x - mean_x) ** 2 for x in xs)
    syy = sum((y - mean_y) ** 2 for y in ys)
    sxy = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, ys, strict=True))
    return sxy / math.sqrt(sxx * syy) if sxx > 0 and syy > 0 else 0.0


def _rate(offers: list[Offer]) -> float:
    return sum(o.accepted for o in offers) / len(offers) if offers else 0.0


def _rate_cell(offers: list[Offer]) -> str:
    return f"{pct(_rate(offers))} ({len(offers)})"


def _bin_rows(
    pairs: list[tuple[Offer, float]], edges: list[tuple[str, float, float]]
) -> list[tuple[str, int, float]]:
    rows = []
    for label, low, high in edges:
        chosen = [o for o, value in pairs if low <= value < high]
        rows.append((label, len(chosen), _rate(chosen)))
    return rows


def _table(header: list[str], rows: list[list[str]], right: tuple[int, ...] = ()) -> str:
    align = ["---:" if i in right else "---" for i in range(len(header))]
    lines = ["| " + " | ".join(header) + " |", "| " + " | ".join(align) + " |"]
    lines += ["| " + " | ".join(row) + " |" for row in rows]
    return "\n".join(lines)


def _share_table(dataset: Dataset, attribute: str) -> list[dict[str, Any]]:
    doctors = Counter(getattr(d, attribute) for d in dataset.doctors.values())
    offers: Counter = Counter()
    accepted: Counter = Counter()
    for offer in dataset.offers:
        group = getattr(dataset.doctors[offer.doctor_id], attribute)
        offers[group] += 1
        accepted[group] += offer.accepted
    rows = []
    for group in sorted(doctors):
        doctor_share = doctors[group] / len(dataset.doctors)
        offer_share = offers[group] / len(dataset.offers)
        rows.append(
            {
                "group": group,
                "doctor_share": doctor_share,
                "offer_share": offer_share,
                "ratio": offer_share / doctor_share,
                "acceptance": accepted[group] / offers[group] if offers[group] else 0.0,
            }
        )
    return rows


def _extraction_by_style(dataset: Dataset) -> dict[str, dict[str, Any]]:
    fields = ("unit", "specialty", "start", "end", "urgency")
    stats: dict[str, dict[str, Any]] = {}
    for request in dataset.requests:
        found = extract_by_rules(request.raw_text, request.created_at.date(), dataset.units)
        got = (found.unit_id, found.specialty, found.starts_at, found.ends_at, found.urgency)
        truth = (
            request.gt_unit_id,
            request.gt_specialty,
            request.gt_starts_at,
            request.gt_ends_at,
            request.gt_urgency,
        )
        entry = stats.setdefault(
            request.style,
            {"n": 0, "all_ok": 0, "ok": Counter(), "blank": Counter(), "wrong": Counter()},
        )
        entry["n"] += 1
        entry["all_ok"] += got == truth
        for name, value, expected in zip(fields, got, truth, strict=True):
            if value == expected:
                entry["ok"][name] += 1
            elif value is None:
                entry["blank"][name] += 1
            else:
                entry["wrong"][name] += 1
    return stats


def write_analysis(dataset: Dataset, params: dict[str, Any], out_dir: Path) -> None:
    """Calcula a análise e grava o relatório e as figuras em `out_dir`."""
    out_dir.mkdir(parents=True, exist_ok=True)
    store = FeatureStore(dataset)
    offers = sorted(dataset.offers, key=lambda o: o.sent_at)
    feats = [offer_features(dataset, store, o) for o in offers]
    stats = summary_stats(dataset)
    md: list[str] = [
        "# Análise exploratória dos dados sintéticos",
        "",
        "> **Simulação.** Os dados são sintéticos e os padrões abaixo vêm das premissas do "
        "simulador (dicionário de dados, seção 6), não de hospitais ou médicos reais. Servem "
        "para entender o conjunto, orientar o modelo e mostrar o risco de viés. Gerado por "
        "`python -m app.cli analyze`.",
        "",
        "## 1. Panorama",
        "",
        _table(
            ["Indicador", "Valor"],
            [
                ["Médicos", str(stats["doctors"])],
                ["Vagas publicadas", str(stats["shifts"])],
                ["Ofertas enviadas", str(stats["offers"])],
                ["Ofertas por vaga", num(stats["offers_per_shift"], 2)],
                ["Taxa de aceite das ofertas", pct(stats["acceptance_rate"])],
                ["Taxa de sucesso (aceitou e compareceu)", pct(stats["success_rate"])],
                ["Vagas sem cobertura", pct(stats["uncovered_share"])],
                [
                    "Aceites que violam a jornada (processo manual)",
                    pct(stats["violation_share_of_accepted"]),
                ],
                [
                    "Mediana até preencher a vaga (simulado, em minutos)",
                    f"{stats['median_minutes_to_fill']:.0f}",
                ],
            ],
            right=(1,),
        ),
        "",
        "Os plantões têm sempre 12 h e horários fixos (19h às 7h e 7h às 19h). Por isso o "
        "intervalo entre plantões do mesmo médico é 0 (colado) ou 12 h ou mais, e o descanso "
        "mínimo de 11 h não chega a ser a regra que mais barra nos dados; o limite de 24 h "
        "contínuas é o que aparece nas violações.",
        "",
    ]

    # 2. Vagas por dia da semana e período
    rows = []
    for index, name in enumerate(WEEKDAYS):
        night = [
            s
            for s in dataset.shifts.values()
            if s.starts_at.weekday() == index and s.period == "night"
        ]
        day = [
            s
            for s in dataset.shifts.values()
            if s.starts_at.weekday() == index and s.period == "day"
        ]
        rows.append([name, str(len(night)), str(len(day))])
    md += [
        "## 2. Vagas por dia da semana",
        "",
        "Vagas diurnas só existem aos sábados e domingos, por desenho do segmento (ADR 0001).",
        "",
        _table(["Dia da semana", "Noturnas (19h)", "Diurnas (7h)"], rows, right=(1, 2)),
        "",
    ]

    # 3. O que explica o aceite
    distance_edges = [
        ("0 a 5 km", 0, 5), ("5 a 10 km", 5, 10), ("10 a 15 km", 10, 15),
        ("15 a 20 km", 15, 20), ("20 km ou mais", 20, 10_000),
    ]  # fmt: skip
    by_distance = _bin_rows(
        [(o, f["distance_km"]) for o, f in zip(offers, feats, strict=True)], distance_edges
    )
    rest_edges = [
        ("colado (0 h)", 0, 0.5), ("menos de 11 h", 0.5, 11), ("11 a 23 h", 11, 24),
        ("24 a 71 h", 24, 72), ("72 a 167 h", 72, 168), ("sem plantão recente", 168, 169),
    ]  # fmt: skip
    by_rest = _bin_rows(
        [(o, f["hours_since_last_shift"]) for o, f in zip(offers, feats, strict=True)], rest_edges
    )
    (out_dir / "fig1-aceite-por-distancia.svg").write_text(
        column_chart(
            "Taxa de aceite cai com a distância",
            "Ofertas aceitas por faixa de distância até o hospital (simulação)",
            [r[0] for r in by_distance],
            [("Taxa de aceite", [r[2] for r in by_distance])],
            lambda v: pct(v, 0),
            "Colunas com a taxa de aceite das ofertas por faixa de distância.",
        ),
        encoding="utf-8",
    )
    (out_dir / "fig2-aceite-por-descanso.svg").write_text(
        column_chart(
            "Taxa de aceite por tempo desde o último plantão",
            "Ofertas aceitas por faixa de horas desde o plantão anterior (simulação)",
            [r[0] for r in by_rest if r[1] > 0],
            [("Taxa de aceite", [r[2] for r in by_rest if r[1] > 0])],
            lambda v: pct(v, 0),
            "Colunas com a taxa de aceite das ofertas por faixa de descanso.",
        ),
        encoding="utf-8",
    )
    match_rows: dict[tuple[str, bool], list[Offer]] = {}
    for offer, f in zip(offers, feats, strict=True):
        period = dataset.shifts[offer.shift_id].period
        match_rows.setdefault((period, f["night_shift_preference_match"] >= 1.0), []).append(offer)
    (out_dir / "fig3-aceite-por-preferencia.svg").write_text(
        column_chart(
            "Preferência de período muda o aceite",
            "Taxa de aceite por período da vaga e preferência do médico (simulação)",
            ["Vaga noturna", "Vaga diurna"],
            [
                (
                    "Preferência coincide",
                    [_rate(match_rows.get((p, True), [])) for p in ("night", "day")],
                ),
                ("Não coincide", [_rate(match_rows.get((p, False), [])) for p in ("night", "day")]),
            ],
            lambda v: pct(v, 0),
            "Colunas agrupadas com a taxa de aceite quando a preferência coincide ou não.",
        ),
        encoding="utf-8",
    )
    successes = [float(o.y_success) for o in offers]
    correlations = sorted(
        (
            (name, pearson([f[name] for f in feats], successes))
            for name in (*RANKING_FEATURES, *CONTEXT_VARIABLES)
        ),
        key=lambda item: -abs(item[1]),
    )
    md += [
        "## 3. O que explica o aceite",
        "",
        "![Taxa de aceite por faixa de distância](fig1-aceite-por-distancia.svg)",
        "",
        _table(
            ["Distância", "Ofertas", "Taxa de aceite"],
            [[label, str(n), pct(rate)] for label, n, rate in by_distance],
            right=(1, 2),
        ),
        "",
        "![Taxa de aceite por descanso](fig2-aceite-por-descanso.svg)",
        "",
        _table(
            ["Horas desde o último plantão", "Ofertas", "Taxa de aceite"],
            [[label, str(n), pct(rate) if n else "sem ofertas"] for label, n, rate in by_rest],
            right=(1, 2),
        ),
        "",
        "![Taxa de aceite por preferência de período](fig3-aceite-por-preferencia.svg)",
        "",
        _table(
            ["Período da vaga", "Preferência coincide", "Não coincide"],
            [
                [
                    "Noturna" if p == "night" else "Diurna",
                    _rate_cell(match_rows.get((p, True), [])),
                    _rate_cell(match_rows.get((p, False), [])),
                ]
                for p in ("night", "day")
            ],
            right=(1, 2),
        ),
        "",
        "### Correlação de cada variável com o sucesso (aceitou e compareceu)",
        "",
        "Correlação de Pearson entre a variável, calculada no instante da oferta, e o rótulo "
        "`y_success`. Correlação não é causa, e aqui a causa é o próprio simulador.",
        "",
        _table(
            ["Variável", "Uso", "Correlação"],
            [
                [
                    FEATURE_LABELS.get(name, name) + f" (`{name}`)",
                    "contexto, fora do ranking" if name in CONTEXT_VARIABLES else "ranking",
                    num(value),
                ]
                for name, value in correlations
            ],
            right=(2,),
        ),
        "",
        "`shifts_last_30d` tem correlação positiva com o sucesso porque médicos confiáveis aceitam "
        "mais plantões (confundimento), embora o simulador penalize a sobrecarga. Por isso a "
        "carga recente ficou fora do ranking e vira alerta de jornada.",
        "",
    ]

    # 4. Exposição e viés
    zone_rows = _share_table(dataset, "home_zone")
    age_rows = _share_table(dataset, "age_band")
    gender_rows = _share_table(dataset, "gender")
    for slug, title, rows_, label in (
        (
            "fig4-exposicao-por-zona.svg",
            "Quem recebe as ofertas, por zona de residência",
            zone_rows,
            "Zona",
        ),
        (
            "fig5-exposicao-por-faixa-etaria.svg",
            "Quem recebe as ofertas, por faixa etária",
            age_rows,
            "Faixa etária",
        ),
    ):
        (out_dir / slug).write_text(
            column_chart(
                title,
                "Participação nas ofertas do processo manual e entre os médicos (simulação)",
                [str(r["group"]) for r in rows_],
                [
                    ("Entre os médicos", [r["doctor_share"] for r in rows_]),
                    ("Nas ofertas", [r["offer_share"] for r in rows_]),
                ],
                lambda v: pct(v, 0),
                f"Colunas agrupadas: participação por {label.lower()} entre médicos e ofertas.",
            ),
            encoding="utf-8",
        )

    def accept_range(rows_: list[dict[str, Any]]) -> str:
        values = [r["acceptance"] for r in rows_]
        return f"{pct(min(values))} a {pct(max(values))}"

    def share_md(rows_: list[dict[str, Any]], label: str) -> str:
        return _table(
            [label, "Entre os médicos", "Nas ofertas", "Razão", "Taxa de aceite do grupo"],
            [
                [
                    str(r["group"]),
                    pct(r["doctor_share"]),
                    pct(r["offer_share"]),
                    num(r["ratio"], 2),
                    pct(r["acceptance"]),
                ]
                for r in rows_
            ],
            right=(1, 2, 3, 4),
        )

    md += [
        "## 4. Exposição das ofertas e risco de viés",
        "",
        "O processo manual simulado liga o `HISTORICAL_BIAS_SCENARIO`: médicos de zonas mais "
        "centrais e de certas faixas etárias recebem mais ofertas, **sem** que o aceite "
        "dependa do grupo em si. É o risco do exemplo de recrutamento do professor: um modelo "
        "treinado no histórico herdaria essa exposição desigual. Razão = participação nas ofertas "
        "dividida "
        "pela participação entre os médicos (1,00 = proporcional).",
        "",
        "![Exposição por zona de residência](fig4-exposicao-por-zona.svg)",
        "",
        share_md(zone_rows, "Zona de residência"),
        "",
        "![Exposição por faixa etária](fig5-exposicao-por-faixa-etaria.svg)",
        "",
        share_md(age_rows, "Faixa etária"),
        "",
        share_md(gender_rows, "Gênero"),
        "",
        "A zona também pesa porque os médicos mais próximos do hospital são chamados mais vezes "
        "(efeito de proximidade, legítimo) e a zona central fica perto de um dos três hospitais; "
        "por isso a razão por zona mistura proximidade e o cenário de viés.",
        "",
        f"A taxa de aceite por grupo vai de {accept_range(gender_rows)} por gênero, "
        f"{accept_range(age_rows)} por faixa etária e {accept_range(zone_rows)} por zona. "
        "O simulador não usa o grupo para decidir o aceite, só distância, fadiga, preferência e "
        "confiabilidade; as diferenças por zona acompanham a distância até os hospitais, que é "
        "justamente o canal pelo qual a zona funciona como proxy.",
        "",
    ]

    # 5. Pedidos em texto livre
    requests = dataset.requests
    by_style = Counter(r.style for r in requests)
    lengths = {style: [len(r.raw_text) for r in requests if r.style == style] for style in by_style}
    normal = [r for r in requests if not r.is_adversarial]
    terms = Counter(
        word
        for r in normal
        for word in re.findall(r"[a-z]{4,}", normalize(r.raw_text))
        if word not in STOPWORDS
    )
    presence_rows = []
    for style in ("formal", "abreviado", "com_erros", "ambiguo"):
        texts = [normalize(r.raw_text) for r in requests if r.style == style]
        presence_rows.append(
            [style]
            + [
                pct(sum(1 for t in texts if re.search(p, t)) / len(texts), 0)
                for p in FIELD_PATTERNS.values()
            ]
        )
    (out_dir / "fig6-tamanho-dos-pedidos.svg").write_text(
        column_chart(
            "Tamanho médio dos pedidos por estilo",
            "Caracteres por pedido em texto livre (simulação)",
            list(by_style),
            [("Caracteres", [sum(v) / len(v) for v in lengths.values()])],
            lambda v: f"{v:.0f}",
            "Colunas com o tamanho médio dos pedidos por estilo de escrita.",
        ),
        encoding="utf-8",
    )
    extraction = _extraction_by_style(dataset)
    ext_rows = []
    for style in ("formal", "abreviado", "com_erros", "ambiguo", "adversarial"):
        e = extraction[style]
        n = e["n"]
        ext_rows.append(
            [
                style,
                str(n),
                pct(e["all_ok"] / n, 0),
                pct(sum(e["blank"].values()) / (5 * n), 0),
                pct(sum(e["wrong"].values()) / (5 * n), 0),
            ]
        )
    adversarial = [r for r in requests if r.is_adversarial]
    caught = sum(1 for r in adversarial if detect_injection(r.raw_text))
    false_alarms = sum(1 for r in normal if detect_injection(r.raw_text))
    md += [
        "## 5. Pedidos de vaga em texto livre (análise textual)",
        "",
        f"São {len(requests)} pedidos gerados a partir de modelos, em 5 estilos. O texto é "
        "**entrada hostil**: parte dos pedidos é adversarial, com um dos 10 tipos de ataque de "
        "injeção de prompt.",
        "",
        "![Tamanho médio dos pedidos por estilo](fig6-tamanho-dos-pedidos.svg)",
        "",
        _table(
            ["Estilo", "Pedidos", "Caracteres (média)", "Mínimo", "Máximo"],
            [
                [s, str(by_style[s]), f"{sum(v) / len(v):.0f}", str(min(v)), str(max(v))]
                for s, v in lengths.items()
            ],
            right=(1, 2, 3, 4),
        ),
        "",
        "### Que informação aparece em cada estilo",
        "",
        _table(
            ["Estilo", *FIELD_PATTERNS],
            presence_rows,
            right=tuple(range(1, 1 + len(FIELD_PATTERNS))),
        ),
        "",
        "O estilo ambíguo omite de propósito especialidade, horário ou unidade; é onde a "
        "conferência humana dos campos extraídos mais importa.",
        "",
        "### Termos mais frequentes (pedidos não adversariais)",
        "",
        _table(
            ["Termo", "Ocorrências"],
            [[term, str(count)] for term, count in terms.most_common(10)],
            right=(1,),
        ),
        "",
        "### Extração por regras contra o gabarito (linha de base para o Gemini)",
        "",
        'Comparação dos 5 campos (unidade, especialidade, início, fim, urgência). "Em branco" '
        'é o campo que o extrator deixou para o coordenador preencher; "errado" é o campo com '
        "valor diferente do gabarito. Como os textos nascem de modelos, o acerto das regras é "
        "otimista (circularidade): o desempenho em texto real tende a ser pior.",
        "",
        _table(
            ["Estilo", "Pedidos", "Todos os campos certos", "Campos em branco", "Campos errados"],
            ext_rows,
            right=(1, 2, 3, 4),
        ),
        "",
        f"Detecção de injeção de prompt: {caught} de {len(adversarial)} pedidos adversariais "
        f"sinalizados; {false_alarms} falsos positivos entre {len(normal)} pedidos normais.",
        "",
        "## 6. Limites",
        "",
        "- Tudo descreve o simulador; nenhum número é evidência de mercado nem substitui as "
        "entrevistas planejadas.",
        "- Só se observa a resposta de quem foi chamado (viés de seleção).",
        "- Os textos de vaga são gerados de modelos; a extração em texto real é uma incógnita.",
        "- As figuras são estáticas; cada uma tem a tabela com os mesmos números logo abaixo.",
        "",
    ]
    (out_dir / "README.md").write_text("\n".join(md), encoding="utf-8")
