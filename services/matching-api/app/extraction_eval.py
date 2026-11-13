"""A leitura do pedido pelo Gemini funciona bem? Comparação com as regras, com gabarito.

O teste manual de 05/11 (`docs/teste-manual-gemini.md`) leu só 3 pedidos normais: serviu para
escolher o modelo e ver os ataques, mas não mede quanto o Gemini acerta. Aqui se mede, em dois
conjuntos com a resposta certa conhecida:

* **Sintético:** pedidos do gerador (formal, abreviado e com erros de digitação), com o gabarito
  que o gerador guardou. É o conjunto em que as regras têm vantagem: o texto vem de modelos de
  frase que as próprias regras conhecem (circularidade, declarada em `app/synthetic/texts.py`).
* **Natural:** pedidos escritos à mão, fora dos modelos de frase, em linguagem de coordenador
  (gírias, datas relativas, informação faltando, hospital e especialidade que não existem). O
  gabarito só marca o campo que o texto permite afirmar, e marca `None` onde o certo é não
  inventar. É o conjunto que diz se o Gemini acrescenta algo às regras.

Quatro leituras por pedido: as **regras** sozinhas, o **Gemini** sozinho (só os pedidos que ele
respondeu e que passaram na validação) e o **sistema**, que é o que a API faz (Gemini quando vale,
regras quando não), sem limite de tempo e com o limite de 6 s da API. Os ataques ficam de fora,
porque o texto suspeito nem chega ao modelo (`docs/solucao-ia.md`, seção 4).

Tudo com texto sintético ou escrito para o teste, na camada gratuita. O conjunto é pequeno e a
medição é de um momento só: vale como indício, não como taxa.
"""

import random
import statistics
import time
from collections.abc import Callable
from datetime import date, datetime
from typing import Any

from app.llm.avaliacao import UNIDADES
from app.llm.client import TIMEOUT_MS, LLMClient, LLMUnavailableError
from app.llm.extraction import (
    EXTRACTION_SCHEMA,
    build_system_prompt,
    build_user_prompt,
    extract_by_rules,
)
from app.llm.guardrails import (
    GuardrailError,
    ShiftFields,
    detect_injection,
    sanitize_text,
    validate_extraction,
)
from app.models import Dataset, Unit

FIELDS = ("unit_id", "specialty", "starts_at", "ends_at", "urgency")
FIELD_LABELS = {
    "unit_id": "Unidade",
    "specialty": "Especialidade",
    "starts_at": "Início",
    "ends_at": "Fim",
    "urgency": "Urgência",
}
STYLES = ("formal", "abreviado", "com_erros")
STYLE_LABELS = {"formal": "Formal", "abreviado": "Abreviado", "com_erros": "Com erros de digitação"}
METHODS = ("regras", "gemini", "sistema", "sistema_api")
METHOD_LABELS = {
    "regras": "Regras",
    "gemini": "Gemini (só o que ele respondeu)",
    "sistema": "Sistema sem limite de tempo (Gemini, ou regras se falhar)",
    "sistema_api": "Sistema com o limite da API (6 s)",
}
PER_STYLE = 12
SEED = 20261113
TODAY_NATURAL = date(2026, 10, 1)  # quinta-feira, a mesma da demonstração
PAUSE_S = 6.5  # abaixo do limite de 15 pedidos por minuto da camada gratuita


def _at(day: int, hour: int) -> datetime:
    return datetime(2026, 10, day, hour)


# (id, texto, gabarito). Só entram no gabarito os campos que o texto permite afirmar; `None`
# marca o que o texto não diz ou não existe no sistema, e o certo é não inventar. Hoje é
# quinta, 01/10/2026. O texto foi escrito para o teste, fora dos modelos de frase do gerador.
NATURAL_CASES: tuple[tuple[str, str, dict[str, Any]], ...] = (
    (
        "N01",
        "Pessoal, preciso de pediatra pro Centro amanhã à noite, das 19 às 7. Urgente!",
        {
            "unit_id": "centro",
            "specialty": "pediatria",
            "starts_at": _at(2, 19),
            "ends_at": _at(3, 7),
            "urgency": "high",
        },
    ),
    (
        "N02",
        "Furou o clínico do Norte no sábado, plantão diurno 7h-19h",
        {
            "unit_id": "norte",
            "specialty": "clinica_medica",
            "starts_at": _at(3, 7),
            "ends_at": _at(3, 19),
        },
    ),
    (
        "N03",
        "Alguém pro Sul na segunda de dia, 7 às 19, clínica médica, sem urgência",
        {
            "unit_id": "sul",
            "specialty": "clinica_medica",
            "starts_at": _at(5, 7),
            "ends_at": _at(5, 19),
            "urgency": "low",
        },
    ),
    (
        "N04",
        "Hospital Modelo Centro precisa de pediatra hoje 19h até 7h da manhã, urgência alta",
        {
            "unit_id": "centro",
            "specialty": "pediatria",
            "starts_at": _at(1, 19),
            "ends_at": _at(2, 7),
            "urgency": "high",
        },
    ),
    (
        "N05",
        "pediatra plantão 12h noturno dom Norte",
        {"unit_id": "norte", "specialty": "pediatria"},
    ),
    (
        "N06",
        "Preciso cobrir quinta que vem, clínico, Sul, 19-7, urgência média",
        {
            "unit_id": "sul",
            "specialty": "clinica_medica",
            "starts_at": _at(8, 19),
            "ends_at": _at(9, 7),
            "urgency": "medium",
        },
    ),
    (
        "N07",
        "Urgente!! pediatra Centro agora à noite",
        {"unit_id": "centro", "specialty": "pediatria", "urgency": "high"},
    ),
    (
        "N08",
        "Falta médico no Norte sábado.",
        {"unit_id": "norte", "specialty": None, "urgency": None},
    ),
    (
        "N09",
        "Boa tarde, tem como arrumar um pediatra para o fim de semana no Sul?",
        {"unit_id": "sul", "specialty": "pediatria", "urgency": None},
    ),
    (
        "N10",
        "plantão de terça, 19h às 07h, pediatria, H. Modelo Norte, urgência baixa",
        {
            "unit_id": "norte",
            "specialty": "pediatria",
            "starts_at": _at(6, 19),
            "ends_at": _at(7, 7),
            "urgency": "low",
        },
    ),
    (
        "N11",
        "Vaga aberta: clínica médica, Centro, quarta-feira, diurno das 7 às 19. Sem pressa.",
        {
            "unit_id": "centro",
            "specialty": "clinica_medica",
            "starts_at": _at(7, 7),
            "ends_at": _at(7, 19),
            "urgency": "low",
        },
    ),
    (
        "N12",
        "Preciso de um pediatra",
        {
            "unit_id": None,
            "specialty": "pediatria",
            "starts_at": None,
            "ends_at": None,
            "urgency": None,
        },
    ),
    (
        "N13",
        "me ajuda a cobrir o plantão do dia 12/10, 19h às 7h, clínico, Centro, alta",
        {
            "unit_id": "centro",
            "specialty": "clinica_medica",
            "starts_at": _at(12, 19),
            "ends_at": _at(13, 7),
            "urgency": "high",
        },
    ),
    (
        "N14",
        "plantão noturno de sexta no Norte, pediatria, entra 19h sai 7h",
        {
            "unit_id": "norte",
            "specialty": "pediatria",
            "starts_at": _at(2, 19),
            "ends_at": _at(3, 7),
            "urgency": None,
        },
    ),
    (
        "N15",
        "Pediatra, Sul, hoje, 7h às 19h, urgencia alta pf",
        {
            "unit_id": "sul",
            "specialty": "pediatria",
            "starts_at": _at(1, 7),
            "ends_at": _at(1, 19),
            "urgency": "high",
        },
    ),
    (
        "N16",
        "Clínico médico para amanhã de manhã, Centro, urgência média",
        {"unit_id": "centro", "specialty": "clinica_medica", "urgency": "medium"},
    ),
    (
        "N17",
        "Quem pode cobrir o Sul na madrugada de domingo? Precisa ser pediatra.",
        {"unit_id": "sul", "specialty": "pediatria", "urgency": None},
    ),
    (
        "N18",
        "Sábado e domingo à noite, pediatra, Norte",
        {"unit_id": "norte", "specialty": "pediatria", "urgency": None},
    ),
    (
        "N19",
        "urgencia alta - pediatria - centro - sex 19h/7h",
        {
            "unit_id": "centro",
            "specialty": "pediatria",
            "starts_at": _at(2, 19),
            "ends_at": _at(3, 7),
            "urgency": "high",
        },
    ),
    (
        "N20",
        "Preciso urgente de médico clínico. Não sei ainda qual hospital nem o horário.",
        {
            "unit_id": None,
            "specialty": "clinica_medica",
            "starts_at": None,
            "ends_at": None,
            "urgency": "high",
        },
    ),
    (
        "N21",
        "Cobrir o plantão da próxima segunda, 19h às 7h, pediatra, Norte, urgência baixa",
        {
            "unit_id": "norte",
            "specialty": "pediatria",
            "starts_at": _at(5, 19),
            "ends_at": _at(6, 7),
            "urgency": "low",
        },
    ),
    (
        "N22",
        "Clínica médica no HM Sul, quarta, plantão diurno 7-19, urgência média",
        {
            "unit_id": "sul",
            "specialty": "clinica_medica",
            "starts_at": _at(7, 7),
            "ends_at": _at(7, 19),
            "urgency": "medium",
        },
    ),
    (
        "N23",
        "Preciso de pediatra no Hospital Modelo Leste amanhã 19h às 7h",
        {"unit_id": None, "specialty": "pediatria", "starts_at": _at(2, 19), "ends_at": _at(3, 7)},
    ),
    (
        "N24",
        "cardiologista para o Centro sábado à noite",
        {"unit_id": "centro", "specialty": None},
    ),
)


def _iso(value: Any) -> Any:
    return value.isoformat() if isinstance(value, datetime) else value


def _dict(fields: ShiftFields | None) -> dict[str, Any] | None:
    if fields is None:
        return None
    return {name: _iso(getattr(fields, name)) for name in FIELDS}


def score(expected: dict[str, Any], got: ShiftFields | None) -> dict[str, Any] | None:
    """Quantos campos do gabarito saíram certos, e quantos o método inventou onde era `None`."""
    if got is None:
        return None
    wrong = [name for name, value in expected.items() if getattr(got, name) != value]
    invented = [
        name for name, value in expected.items() if value is None and getattr(got, name) is not None
    ]
    return {
        "right": len(expected) - len(wrong),
        "total": len(expected),
        "wrong": wrong,
        "invented": invented,
        "all_right": not wrong,
    }


def score_view(expected: dict[str, Any], fields: dict[str, Any] | None) -> dict[str, Any] | None:
    """O mesmo que `score`, sobre os campos já em texto (como ficam no JSON publicado)."""
    if fields is None:
        return None
    wrong = [name for name, value in expected.items() if fields[name] != value]
    invented = [
        name for name, value in expected.items() if value is None and fields[name] is not None
    ]
    return {
        "right": len(expected) - len(wrong),
        "total": len(expected),
        "wrong": wrong,
        "invented": invented,
        "all_right": not wrong,
    }


def system_with_api_limit(row: dict[str, Any]) -> dict[str, Any] | None:
    """O que a API entregaria: o Gemini só vale se respondeu a tempo; senão, as regras.

    A medição deixa o Gemini levar até 30 s, para ver o que ele faz; a API desiste em 6 s e usa as
    regras (`TIMEOUT_MS`). Esta é a leitura que o coordenador veria na tela.
    """
    gemini = row["gemini"]
    in_time = gemini["fields"] is not None and gemini["ms"] <= TIMEOUT_MS
    use_gemini = in_time and not row["flags"]
    return score_view(row["expected"], gemini["fields"] if use_gemini else row["regras"]["fields"])


def ask_gemini(
    client: LLMClient, text: str, today: date, units: dict[str, Unit]
) -> tuple[ShiftFields | None, str, int, str]:
    """Uma leitura pelo Gemini, como a API faz. Devolve campos, estado, demora e a resposta."""
    start = time.perf_counter()
    try:
        raw = client.generate_json(
            system=build_system_prompt(today, units),
            user=build_user_prompt(sanitize_text(text)),
            schema=EXTRACTION_SCHEMA,
        )
    except LLMUnavailableError as exc:
        return None, "sem_resposta", round((time.perf_counter() - start) * 1000), str(exc)[:160]
    ms = round((time.perf_counter() - start) * 1000)
    try:
        return validate_extraction(raw, units, today), "ok", ms, " ".join(raw.split())[:300]
    except GuardrailError as exc:
        return None, f"barrada_{exc.code}", ms, " ".join(raw.split())[:300]


def synthetic_sample(
    dataset: Dataset, per_style: int = PER_STYLE, seed: int = SEED
) -> list[dict[str, Any]]:
    """Pedidos do gerador, sem ataques, `per_style` de cada estilo, sempre os mesmos."""
    rng = random.Random(seed)
    cases = []
    for style in STYLES:
        pool = sorted(
            (r for r in dataset.requests if r.style == style and not r.is_adversarial),
            key=lambda r: r.id,
        )
        for request in rng.sample(pool, min(per_style, len(pool))):
            expected = {
                "unit_id": request.gt_unit_id,
                "specialty": request.gt_specialty,
                "starts_at": request.gt_starts_at,
                "ends_at": request.gt_ends_at,
                "urgency": request.gt_urgency,
            }
            cases.append(
                {
                    "id": request.id,
                    "set": "sintetico",
                    "style": style,
                    "text": request.raw_text,
                    "today": request.created_at.date(),
                    "expected": expected,
                    "units": dataset.units,
                }
            )
    return cases


def _case_list(dataset: Dataset | None, per_style: int, seed: int) -> list[dict[str, Any]]:
    cases = synthetic_sample(dataset, per_style, seed) if dataset is not None else []
    for cid, text, expected in NATURAL_CASES:
        cases.append(
            {
                "id": cid,
                "set": "natural",
                "style": "natural",
                "text": text,
                "today": TODAY_NATURAL,
                "expected": expected,
                "units": UNIDADES,
            }
        )
    return cases


def _expected_view(expected: dict[str, Any]) -> dict[str, Any]:
    return {name: _iso(value) for name, value in expected.items()}


def run_cases(
    cases: list[dict[str, Any]],
    client: LLMClient,
    *,
    pause_s: float = PAUSE_S,
    sleep: Callable[[float], None] = time.sleep,
    progress: Callable[[str], None] | None = None,
) -> list[dict[str, Any]]:
    """Roda os métodos em cada pedido e guarda tudo o que serve para auditar depois."""
    results = []
    for index, case in enumerate(cases):
        text, today, units, expected = case["text"], case["today"], case["units"], case["expected"]
        flags = detect_injection(text)
        rules = extract_by_rules(text, today, units)
        if index and pause_s:
            sleep(pause_s)
        fields, status, ms, raw = ask_gemini(client, text, today, units)
        # A API só chama o Gemini se o texto não tiver sinal de injeção.
        system = rules if flags or fields is None else fields
        row = {
            "id": case["id"],
            "set": case["set"],
            "style": case["style"],
            "text": text,
            "today": today.isoformat(),
            "expected": _expected_view(expected),
            "flags": list(flags),
            "regras": {"fields": _dict(rules), "score": score(expected, rules)},
            "gemini": {
                "status": status,
                "ms": ms,
                "raw": raw,
                "fields": _dict(fields),
                "score": score(expected, fields),
            },
            "sistema": {"score": score(expected, system)},
        }
        row["sistema_api"] = {"score": system_with_api_limit(row)}
        results.append(row)
        if progress:
            ok = row["gemini"]["score"] and row["gemini"]["score"]["all_right"]
            state = "certo" if ok else (status if status != "ok" else "errou")
            progress(f"{case['id']}: Gemini {state}")
    return results


def _aggregate(rows: list[dict[str, Any]], method: str) -> dict[str, Any]:
    scored = [r[method]["score"] for r in rows if r[method]["score"] is not None]
    per_field: dict[str, list[int]] = {name: [0, 0] for name in FIELDS}
    for row in rows:
        score_ = row[method]["score"]
        if score_ is None:
            continue
        for name in row["expected"]:
            per_field[name][1] += 1
            per_field[name][0] += name not in score_["wrong"]
    return {
        "cases": len(rows),
        "answered": len(scored),
        "all_right": sum(s["all_right"] for s in scored),
        "fields_right": sum(s["right"] for s in scored),
        "fields_total": sum(s["total"] for s in scored),
        "invented": sum(len(s["invented"]) for s in scored),
        "per_field": per_field,
    }


def summarize(results: list[dict[str, Any]]) -> dict[str, Any]:
    sets: dict[str, Any] = {}
    for group in ("sintetico", "natural"):
        rows = [r for r in results if r["set"] == group]
        if not rows:
            continue
        entry: dict[str, Any] = {
            "n": len(rows),
            "methods": {m: _aggregate(rows, m) for m in METHODS},
        }
        if group == "sintetico":
            entry["by_style"] = {
                style: {
                    "n": sum(r["style"] == style for r in rows),
                    "methods": {
                        m: _aggregate([r for r in rows if r["style"] == style], m) for m in METHODS
                    },
                }
                for style in STYLES
            }
        sets[group] = entry
    answered = sorted(r["gemini"]["ms"] for r in results if r["gemini"]["status"] != "sem_resposta")
    status_count: dict[str, int] = {}
    for row in results:
        status_count[row["gemini"]["status"]] = status_count.get(row["gemini"]["status"], 0) + 1
    latency = None
    if answered:
        latency = {
            "median_ms": round(statistics.median(answered)),
            "p95_ms": answered[min(len(answered) - 1, int(0.95 * len(answered)))],
            "max_ms": answered[-1],
            "within_product_limit": sum(ms <= TIMEOUT_MS for ms in answered),
            "answered": len(answered),
        }
    return {"sets": sets, "status": status_count, "latency": latency}


def evaluate_extraction(
    dataset: Dataset | None,
    client: LLMClient,
    *,
    model: str,
    run_date: date,
    per_style: int = PER_STYLE,
    seed: int = SEED,
    pause_s: float = PAUSE_S,
    sleep: Callable[[float], None] = time.sleep,
    progress: Callable[[str], None] | None = None,
) -> dict[str, Any]:
    cases = _case_list(dataset, per_style, seed)
    results = run_cases(cases, client, pause_s=pause_s, sleep=sleep, progress=progress)
    summary = summarize(results)
    return {
        "meta": {
            "model": model,
            "run_date": run_date.isoformat(),
            "seed": seed,
            "per_style": per_style,
            "cases": len(results),
            "natural_today": TODAY_NATURAL.isoformat(),
            "product_limit_ms": TIMEOUT_MS,
            "pause_s": pause_s,
        },
        **summary,
        "cases": results,
    }


def _pc(part: int, whole: int) -> str:
    return "n/d" if whole == 0 else f"{100 * part / whole:.0f}%".replace(".", ",")


def _cell(part: int, whole: int) -> str:
    return f"{part} de {whole} ({_pc(part, whole)})"


def _mark(entry: dict[str, Any]) -> str:
    score_ = entry["score"]
    if score_ is None:
        return "sem leitura"
    return (
        "certo"
        if score_["all_right"]
        else "errou: " + ", ".join(FIELD_LABELS[name] for name in score_["wrong"])
    )


def _set_table(entry: dict[str, Any]) -> list[str]:
    lines = [
        "| Método | Lidos | Pedidos 100% certos | Campos certos | Inventou (certo era `None`) |",
        "| --- | ---: | ---: | ---: | ---: |",
    ]
    for method in METHODS:
        agg = entry["methods"][method]
        lines.append(
            f"| {METHOD_LABELS[method]} | {agg['answered']} de {agg['cases']} "
            f"| {_cell(agg['all_right'], agg['answered'])} "
            f"| {_cell(agg['fields_right'], agg['fields_total'])} | {agg['invented']} |"
        )
    return lines


def _field_table(entry: dict[str, Any]) -> list[str]:
    lines = [
        "| Campo | Regras | Gemini | Sistema | Sistema (6 s) |",
        "| --- | ---: | ---: | ---: | ---: |",
    ]
    for name in FIELDS:
        cells = []
        for method in METHODS:
            right, total = entry["methods"][method]["per_field"][name]
            cells.append(_cell(right, total))
        lines.append(f"| {FIELD_LABELS[name]} | " + " | ".join(cells) + " |")
    return lines


def render_extraction(metrics: dict[str, Any]) -> str:
    meta, sets = metrics["meta"], metrics["sets"]
    latency = metrics["latency"]
    lines = [
        "# Leitura do pedido pelo Gemini contra as regras (simulação)",
        "",
        "> **Texto sintético ou escrito para o teste; camada gratuita.** O conjunto é pequeno e a "
        f"medição é de um momento só ({meta['run_date']}, modelo `{meta['model']}`): vale como "
        "indício, não como taxa. Gerado por `python -m app.cli extraction`.",
        "",
        "## Pergunta",
        "",
        "O teste manual de 05/11 ([teste-manual-gemini.md](../teste-manual-gemini.md)) leu só 3 "
        "pedidos normais: serviu para escolher o modelo e ver os ataques, mas não mede quanto o "
        "Gemini acerta. Este experimento mede isso e compara com as regras, que são a linha de "
        "base e o caminho de segurança.",
        "",
        "## Como foi feito",
        "",
        f"- **Sintético ({sets['sintetico']['n']} pedidos):** {meta['per_style']} de cada estilo "
        "(formal, abreviado e com erros de digitação), sorteados do conjunto de 400 pedidos do "
        f"gerador com a semente {meta['seed']}, sem os ataques. O gabarito é o que o gerador "
        "guardou. As regras têm vantagem aqui, porque o texto vem de modelos de frase que elas "
        "conhecem."
        if "sintetico" in sets
        else "- **Sintético:** não rodado.",
        f"- **Natural ({sets['natural']['n']} pedidos):** escritos à mão, fora dos modelos de "
        "frase, em linguagem de coordenador: gírias, datas relativas (\"quinta que vem\"), "
        "informação faltando, hospital que não existe e especialidade que o sistema não tem. O "
        "gabarito marca só o campo que o texto permite afirmar e marca `None` onde o certo é não "
        "inventar. Quem escreveu os textos foi o Claude Code, não coordenadores reais.",
        "- **Quatro leituras:** as **regras** sozinhas; o **Gemini** sozinho, só nos pedidos que "
        "ele respondeu e que passaram na validação do código; o **sistema**, que é o que a API "
        "faz (Gemini quando vale, regras quando o Gemini não responde ou a resposta é barrada); e "
        f"o **sistema com o limite da API**, em que o Gemini só vale se respondeu em até "
        f"{meta['product_limit_ms'] // 1000} s. A medição deixou o Gemini levar até 30 s, para ver "
        "o que ele faz; a API desiste em 6 s e usa as regras, e é isso que o coordenador veria.",
        "- **Campo certo:** igual ao gabarito, inclusive `None` (não inventar). **Pedido 100% "
        "certo:** todos os campos do gabarito certos.",
        f"- **Pausa de {meta['pause_s']} s entre pedidos**, para ficar abaixo do limite por minuto "
        "da camada gratuita.",
        "",
    ]
    if "natural" in sets:
        lines += ["## Resultado: pedidos naturais", ""]
        lines += _set_table(sets["natural"]) + [""] + _field_table(sets["natural"]) + [""]
    if "sintetico" in sets:
        lines += ["## Resultado: pedidos sintéticos", ""]
        lines += _set_table(sets["sintetico"]) + [""] + _field_table(sets["sintetico"]) + [""]
        lines += [
            "### Por estilo (pedidos 100% certos)",
            "",
            "| Estilo | Pedidos | Regras | Gemini | Sistema |",
            "| --- | ---: | ---: | ---: | ---: |",
        ]
        for style in STYLES:
            block = sets["sintetico"]["by_style"][style]
            cells = [
                _cell(block["methods"][m]["all_right"], block["methods"][m]["answered"])
                for m in METHODS
            ]
            lines.append(f"| {STYLE_LABELS[style]} | {block['n']} | " + " | ".join(cells) + " |")
        lines.append("")
    status = metrics["status"]
    lines += [
        "## O serviço",
        "",
        "- Estado de cada chamada ao Gemini: "
        + ", ".join(f"{name.replace('_', ' ')}: {count}" for name, count in sorted(status.items()))
        + ".",
    ]
    if latency:
        lines.append(
            f"- Demora das {latency['answered']} chamadas que tiveram resposta: mediana de "
            f"{latency['median_ms']} ms, 95% até {latency['p95_ms']} ms, máxima de "
            f"{latency['max_ms']} ms. {latency['within_product_limit']} delas dentro do limite da "
            f"API ({meta['product_limit_ms']} ms); as demais teriam caído nas regras na tela."
        )
    lines += ["", "## Pedido a pedido (naturais)", ""]
    lines += [
        "| Caso | Texto | Regras | Gemini | Sistema (6 s) |",
        "| --- | --- | --- | --- | --- |",
    ]
    for row in metrics["cases"]:
        if row["set"] != "natural":
            continue
        text = row["text"].replace("|", "\\|")
        lines.append(
            f"| {row['id']} | {text} | {_mark(row['regras'])} | {_mark(row['gemini'])} "
            f"| {_mark(row['sistema_api'])} |"
        )
    wrong = [
        r
        for r in metrics["cases"]
        if r["set"] == "sintetico"
        and r["gemini"]["score"]
        and not r["gemini"]["score"]["all_right"]
    ]
    lines += ["", "## Onde o Gemini errou nos pedidos sintéticos", ""]
    if not wrong:
        lines.append("Nenhum pedido sintético com resposta errada.")
    else:
        lines += ["| Estilo | Texto | Errou em | Resposta |", "| --- | --- | --- | --- |"]
        for row in wrong:
            text = row["text"].replace("|", "\\|")
            fields = ", ".join(FIELD_LABELS[n] for n in row["gemini"]["score"]["wrong"])
            raw = row["gemini"]["raw"].replace("|", "\\|")
            style = STYLE_LABELS.get(row["style"], row["style"])
            lines.append(f"| {style} | {text} | {fields} | {raw} |")
    lines += [
        "",
        "## Limites",
        "",
        f"- **Pequeno e de um momento só:** {meta['cases']} pedidos, uma rodada. Uma diferença de "
        "um ou dois pedidos não é uma diferença. O serviço também varia: o 503 de alta demanda "
        "apareceu em 05/11.",
        "- **O gabarito natural é nosso:** os 24 textos e as respostas certas foram escritos por "
        "quem projetou as regras (com o Claude Code), o que favorece as regras em alguns casos e "
        "o Gemini em outros. Não substituem pedidos de coordenadores reais.",
        "- **O sintético é circular:** o texto vem de modelos de frase que as regras conhecem.",
        "- **O coordenador sempre confere os campos** antes de seguir; este experimento mede "
        "quanto ele teria de corrigir, e não o risco de uma decisão errada.",
        "",
    ]
    return "\n".join(lines)
