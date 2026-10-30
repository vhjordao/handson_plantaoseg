"""Guardrails: o texto da vaga é entrada hostil e a saída do LLM é dado não confiável.

Defesa em camadas, todas em código determinístico:

1. a entrada é limpa (caracteres de controle, tamanho, marcadores) e inspecionada;
2. texto com sinais de injeção nunca chega ao LLM;
3. a saída do LLM só vale se passar por um esquema fechado (chaves exatas, valores de listas
   fixas, datas coerentes); qualquer desvio cai no caminho por regras.
"""

import json
import re
import unicodedata
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Any

from app.models import Unit

MAX_TEXT_CHARS = 500
SPECIALTIES = ("clinica_medica", "pediatria")
URGENCIES = ("low", "medium", "high")
EXTRACTION_KEYS = ("unit", "specialty", "starts_at", "ends_at", "urgency")
CONTROL_CHARS = re.compile(r"[\x00-\x08\x0b-\x1f\x7f​-‏ -‮⁠﻿]")

# (código, padrão aplicado ao texto sem acento e em minúsculas)
INJECTION_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = tuple(
    (code, re.compile(pattern))
    for code, pattern in (
        ("ignorar_instrucoes", r"(ignor\w*|desconsider\w*|esqueca)\s+(todas\s+)?(as\s+)?"
         r"(regras|instrucoes|anteriores|previous|prior)"),
        ("vazar_segredo", r"\b(chave|api[ _-]?key|senha|token|segredo|secret)\b|variaveis? de amb"),
        ("pagamento", r"r\$|valor do plantao|menor valor|ordene por valor|pagamento|remuneracao"),
        ("forjar_campos", r"\{\s*\"|\"\s*(unit|specialty|starts_at|approved)\s*\"\s*:"),
        ("papel_falso", r"voce agora e|you are now|aja como|finja ser|administrador do sistema"),
        ("sem_revisao", r"sem (revisao|aprovacao)|aprove (todas|tudo)"),
        ("dados_pessoais", r"(liste|mostre|informe)\s+(o\s+)?(nome|crm|telefone)"),
        ("vazar_prompt", r"system prompt|prompt do sistema|instrucoes iniciais"),
        ("idioma_trocado", r"answer in english|reveal |disregard|ignore previous"),
    )
)


class GuardrailError(ValueError):
    """A entrada ou a saída violou uma regra; `code` identifica qual."""

    def __init__(self, code: str, detail: str = "") -> None:
        super().__init__(f"{code}: {detail}" if detail else code)
        self.code = code


@dataclass(frozen=True, slots=True)
class ShiftFields:
    """Campos extraídos de um pedido de vaga (qualquer campo pode faltar)."""

    unit_id: str | None
    specialty: str | None
    starts_at: datetime | None
    ends_at: datetime | None
    urgency: str | None

    def missing(self) -> list[str]:
        names = ("unit_id", "specialty", "starts_at", "ends_at", "urgency")
        return [name for name in names if getattr(self, name) is None]

    def missing_required(self) -> list[str]:
        """Campos sem os quais não há como filtrar candidatos (a urgência é opcional)."""
        names = ("unit_id", "specialty", "starts_at", "ends_at")
        return [name for name in names if getattr(self, name) is None]


def normalize(text: str) -> str:
    """Minúsculas e sem acentos."""
    decomposed = unicodedata.normalize("NFKD", text)
    return "".join(c for c in decomposed if not unicodedata.combining(c)).lower()


def sanitize_text(text: str) -> str:
    """Remove caracteres de controle e marcadores do prompt e limita o tamanho."""
    cleaned = CONTROL_CHARS.sub("", text)
    cleaned = cleaned.replace("<pedido>", "").replace("</pedido>", "")
    return cleaned[:MAX_TEXT_CHARS].strip()


def detect_injection(raw: str) -> list[str]:
    """Códigos dos sinais de injeção de prompt encontrados no texto bruto."""
    flags: list[str] = []
    if len(raw) > MAX_TEXT_CHARS:
        flags.append("texto_longo")
    if CONTROL_CHARS.search(raw):
        flags.append("caracteres_controle")
    normalized = normalize(raw)
    flags += [code for code, pattern in INJECTION_PATTERNS if pattern.search(normalized)]
    return flags


def _parse_datetime(value: Any) -> datetime | None:
    if value is None:
        return None
    if not isinstance(value, str):
        raise GuardrailError("data_invalida")
    try:
        parsed = datetime.fromisoformat(value)
    except ValueError as exc:
        raise GuardrailError("data_invalida") from exc
    if parsed.tzinfo is not None:
        raise GuardrailError("data_invalida", "fuso horário não esperado")
    return parsed


def validate_extraction(raw: str, units: dict[str, Unit], today: date) -> ShiftFields:
    """Valida a saída do LLM contra o esquema fechado e devolve os campos."""
    try:
        data = json.loads(raw)
    except (json.JSONDecodeError, TypeError) as exc:
        raise GuardrailError("json_invalido") from exc
    if not isinstance(data, dict):
        raise GuardrailError("formato_invalido")
    if set(data) != set(EXTRACTION_KEYS):
        diff = sorted(set(data) ^ set(EXTRACTION_KEYS))
        raise GuardrailError("campos_inesperados", ",".join(diff))
    unit_id = None
    if data["unit"] is not None:
        by_name = {u.name: u.id for u in units.values()}
        if not isinstance(data["unit"], str) or data["unit"] not in by_name:
            raise GuardrailError("unidade_desconhecida")
        unit_id = by_name[data["unit"]]
    specialty, urgency = data["specialty"], data["urgency"]
    if specialty is not None and specialty not in SPECIALTIES:
        raise GuardrailError("especialidade_invalida")
    if urgency is not None and urgency not in URGENCIES:
        raise GuardrailError("urgencia_invalida")
    starts, ends = _parse_datetime(data["starts_at"]), _parse_datetime(data["ends_at"])
    if (starts is None) != (ends is None):
        raise GuardrailError("intervalo_incompleto")
    if starts is not None and ends is not None:
        if ends <= starts:
            raise GuardrailError("intervalo_invalido")
        if ends - starts > timedelta(hours=24):
            raise GuardrailError("duracao_invalida")
        if not today - timedelta(days=1) <= starts.date() <= today + timedelta(days=60):
            raise GuardrailError("data_fora_da_janela")
    return ShiftFields(unit_id, specialty, starts, ends, urgency)
