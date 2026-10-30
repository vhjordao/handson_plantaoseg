"""Explicação da recomendação: template determinístico e reescrita opcional pelo LLM.

O template sempre funciona e só cita fatores recebidos. A reescrita pelo Gemini é opcional e
só vale se mantiver os mesmos fatos: nada de números novos, fatores inventados, dados pessoais
nem valores de pagamento. Em qualquer desvio ou falha, vale o template.
"""

import json
import re
from dataclasses import dataclass

from app.llm.client import LLMClient, LLMUnavailableError
from app.llm.guardrails import GuardrailError, normalize

MAX_EXPLANATION_CHARS = 400
FORBIDDEN_TERMS = ("r$", "pagamento", "valor", "salario", "crm", "telefone", "nome", "senha")
NUMBER = re.compile(r"\d+(?:,\d+)?")
REWRITE_SCHEMA = {
    "type": "object",
    "properties": {
        "text": {"type": "string"},
        "factors_cited": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["text", "factors_cited"],
}


@dataclass(frozen=True, slots=True)
class Explanation:
    text: str
    factors_cited: tuple[str, ...]
    source: str  # "template" ou "llm"


def fmt(value: float, decimals: int = 1) -> str:
    return f"{value:.{decimals}f}".replace(".", ",")


def _phrases(f: dict[str, float]) -> dict[str, str]:
    """Frase por variável, apenas para as que fazem sentido como motivo."""
    phrases = {
        "distance_km": f"mora a {fmt(f['distance_km'])} km do hospital",
        "acceptance_rate_90d": (
            f"tem taxa de aceite estimada de {f['acceptance_rate_90d']:.0%} nos últimos 90 dias"
        ),
        "attendance_rate_90d": (
            f"tem taxa de comparecimento estimada de {f['attendance_rate_90d']:.0%} "
            "nos últimos 90 dias"
        ),
        "availability_overlap_hours": (
            f"tem disponibilidade para {fmt(f['availability_overlap_hours'], 0)} h da vaga"
        ),
    }
    if f["night_shift_preference_match"] >= 1.0:
        phrases["night_shift_preference_match"] = "prefere o período desta vaga"
    if f["hours_since_last_shift"] >= 168:
        phrases["hours_since_last_shift"] = "está sem plantão há mais de 7 dias"
    elif f["hours_since_last_shift"] >= 24:
        phrases["hours_since_last_shift"] = (
            f"descansou {fmt(f['hours_since_last_shift'], 0)} h desde o último plantão"
        )
    # Carga recente (shifts_last_30d) nunca é motivo para recomendar: vira alerta de jornada.
    phrases["specialty_match"] = (
        "tem a especialidade principal da vaga"
        if f["specialty_match"] >= 1.0
        else "tem a especialidade da vaga como secundária"
    )
    return phrases


def explain_template(
    features: dict[str, float], contributions: dict[str, float], max_factors: int = 3
) -> Explanation:
    """Monta a justificativa a partir dos fatores que mais pesaram a favor do candidato."""
    phrases = _phrases(features)
    ranked = sorted(
        (name for name in contributions if name in phrases and contributions[name] > 0),
        key=lambda name: -contributions[name],
    )[:max_factors]
    if not ranked:
        return Explanation("Elegível pelas regras; nenhum fator se destacou.", (), "template")
    parts = [phrases[name] for name in ranked]
    joined = parts[0] if len(parts) == 1 else ", ".join(parts[:-1]) + " e " + parts[-1]
    return Explanation(f"Recomendado porque {joined}.", tuple(ranked), "template")


def validate_rewrite(raw: str, template: Explanation, allowed: set[str]) -> Explanation:
    """Aceita a reescrita do LLM só se ela não acrescentar nada ao que o template disse."""
    try:
        data = json.loads(raw)
    except (json.JSONDecodeError, TypeError) as exc:
        raise GuardrailError("json_invalido") from exc
    if not isinstance(data, dict) or set(data) != {"text", "factors_cited"}:
        raise GuardrailError("campos_inesperados")
    text, cited = data["text"], data["factors_cited"]
    if not isinstance(text, str) or not isinstance(cited, list):
        raise GuardrailError("tipos_invalidos")
    if not all(isinstance(item, str) for item in cited):
        raise GuardrailError("tipos_invalidos")
    if not text.strip() or len(text) > MAX_EXPLANATION_CHARS:
        raise GuardrailError("tamanho_invalido")
    if not set(cited) <= allowed:
        raise GuardrailError("fator_inventado")
    lowered = normalize(text)
    if any(term in lowered for term in FORBIDDEN_TERMS):
        raise GuardrailError("termo_proibido")
    if not set(NUMBER.findall(text)) <= set(NUMBER.findall(template.text)):
        raise GuardrailError("numero_inventado")
    return Explanation(text.strip(), tuple(cited), "llm")


def explain(
    features: dict[str, float],
    contributions: dict[str, float],
    client: LLMClient | None = None,
) -> tuple[Explanation, str | None]:
    """Explicação final e o motivo do fallback, se o LLM foi tentado e não valeu."""
    template = explain_template(features, contributions)
    if client is None or not template.factors_cited:
        return template, None
    allowed = set(template.factors_cited)
    try:
        raw = client.generate_json(
            system=(
                "Reescreva a justificativa em português do Brasil, em até duas frases, "
                "mantendo exatamente os mesmos fatos e números. Não acrescente informação. "
                "Responda somente JSON com text e factors_cited."
            ),
            user=json.dumps(
                {"justificativa": template.text, "fatores": sorted(allowed)}, ensure_ascii=False
            ),
            schema=REWRITE_SCHEMA,
        )
        return validate_rewrite(raw, template, allowed), None
    except LLMUnavailableError:
        return template, "llm_indisponivel"
    except GuardrailError as exc:
        return template, exc.code
