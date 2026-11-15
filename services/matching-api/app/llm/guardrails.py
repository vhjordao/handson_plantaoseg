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

# (código, padrão aplicado ao texto preparado para a detecção: sem caracteres invisíveis, com as
# letras de outros alfabetos trocadas pelas latinas, sem acento e em minúsculas). A lista nasceu
# com os 10 ataques do gerador e foi ampliada em 15/11/2026 com uma bateria de ataques novos
# (`app/redteam.py`), que o detector antigo pegava só 2 de 35.
INJECTION_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = tuple(
    (code, re.compile(pattern))
    for code, pattern in (
        ("ignorar_instrucoes", r"(ignor\w*|desconsider\w*|esquec\w*)\s+(todas\s+)?(as\s+)?"
         r"(regras|instrucoes|anteriores|previous|prior|orientacoes)"
         r"|(ignor\w*|desconsider\w*|esquec\w*)\s+(tudo|o que|the above|all|everything)"
         r"|nao siga\s+(as\s+|os\s+)?(orientacoes|instrucoes|regras)"
         r"|\bnovas?\s+instruc|\boverride\b|instrucoes anteriores|(estao|foram)\s+cancelad"
         r"|a partir de agora,?\s+(voce|responda|ignore|aja|seja|so)\b"),
        ("vazar_segredo", r"\b(chave|api[ _-]?key|senha|token|segredo|secret)\b|variaveis? de amb"),
        ("pagamento", r"r\$|valor do plantao|menor valor|ordene por valor|pagamento|remuneracao"
         r"|cobra\w*\s+menos|mais barat|desconto|aceitar menos|\bpreco\b"),
        ("forjar_campos", r"\{\s*[\"']|[\"']\s*(unit|specialty|starts_at|ends_at|urgency|approved)"
         r"\s*[\"']\s*:"),
        ("papel_falso", r"voce agora e|you are now|aja como|finja|pretend|\bact as\b"
         r"|administrador do sistema|modo (desenvolvedor|administrador|deus)|developer mode"
         r"|\bdan\b|sem (limites|restricoes)|assistente sem"),
        ("sem_revisao", r"sem (revisao|aprovacao)|aprove (todas|tudo|o primeiro|automaticamente)"
         r"|autorizou tudo"),
        ("dados_pessoais", r"(liste|mostre|informe|envie|mande)\s+(o\s+|a\s+)?"
         r"(nome|crm|telefone|lista de medicos|contato)"),
        ("vazar_prompt", r"system prompt|prompt do sistema|instrucoes iniciais|\b(seu|teu)\s+prompt"
         r"|repita\s+(palavra por palavra|suas|as suas|o que)|regras\s+(internas|ocultas)"
         r"|hidden rules|configuracao interna"),
        ("idioma_trocado", r"answer in english|reveal |disregard|ignore previous"
         r"|ignore (all|the above|everything)|output the|from now on"),
        ("delimitador_falso", r"</?\s*pedido\s*>|<\|\s*im_(start|end)\s*\|>"
         r"|\[/?\s*(system|inst|sistema)\s*\]|#{2,}\s*(instruc|system|sistema)"
         r"|(^|[\n.!?;]\s*)(sistema|system|assistente|assistant|usuario|user)\s*:"),
        ("codificacao", r"base64|rot13|decodifiqu|\bdecode\b"),
        ("favorecimento", r"(priorize|prioriza|prefira|chame primeiro|chamar primeiro|escolha)\s+"
         r"(a\s+|o\s+|ao\s+|para\s+)?(dr|dra|doutor|doutora)\b"
         r"|amig\w*\s+d[ao]\s+(diretor|diretoria|chefe|gestor)|independente\w* da ordem"),
        ("criterio_discriminatorio", r"\bso\s+(quero\s+)?(homens|mulheres|jovens|brancos|brancas)\b"
         r"|\b(nao|evite|evitar|sem)\s+(chame\s+|chamar\s+|quero\s+)?(ninguem\s+)?(\w+\s+){0,2}"
         r"(mulheres|homens|gravid\w*|gestante\w*|idos\w*|negr\w*|deficien\w*|mais de \d+ anos)\b"
         r"|\b(nao chame|nao chamar|evite|sem)\s+(ninguem\s+)?(da|de|do)\s+zona\b"),
        ("link_externo", r"https?://|www\."),
        ("codigo_malicioso", r"<\s*/?\s*(script|iframe|img|svg|object|embed)\b|javascript:"
         r"|\bon\w+\s*=|drop\s+table|union\s+select|;\s*--|\{\{|\$\{"),
    )
)

# Letras de outros alfabetos que se passam por latinas (cirílico e grego), para "Іgnоre" não
# escapar do padrão de "ignore". Só para a detecção: a leitura do pedido usa o texto como veio.
CONFUSABLES = str.maketrans(
    "аеорсухіјѕԁԛԝАЕОРСТХІЈЅВНКМαεορτυνικΑΕΟΡΤΥΝΙΚΒΗΜ",
    "aeopcyxijsdqwAEOPCTXIJSBHKMaeoptyvikAEOPTYNIKBHM",
)
# Números e símbolos no lugar de letras ("1gn0r3"), só para a forma compacta abaixo: aplicados ao
# texto todo, transformariam "19h às 7h" em letras.
LEET = str.maketrans("013457@$", "oieastas")
# Palavras de ataque procuradas no texto sem espaços nem pontuação, para pegar "i g n o r e" e
# "i.g.n.o.r.e". São longas de propósito: um pedido normal não as forma por acaso.
COMPACT_KEYWORDS = (
    "ignoreasregras", "ignoretodas", "ignoreasinstrucoes", "ignoreprevious", "ignoretudo",
    "desconsidereasregras", "desconsideretudo", "systemprompt", "promptdosistema",
    "voceagorae", "youarenow", "mododesenvolvedor", "developermode", "jailbreak",
)  # fmt: skip
# Um bloco longo de base64 no meio do pedido (o texto codificado escapa dos padrões). Precisa ter
# maiúscula, minúscula e algum dígito ou símbolo: uma palavra longa ou "xxxx..." não é base64.
BASE64_BLOCK = re.compile(r"[A-Za-z0-9+/]{24,}={0,2}")


def _looks_like_base64(block: str) -> bool:
    return all(re.search(p, block) for p in (r"[a-z]", r"[A-Z]", r"[0-9+/]"))


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


def detection_text(raw: str) -> str:
    """O texto preparado para a detecção: sem invisíveis, letras latinas, sem acento, minúsculo."""
    text = unicodedata.normalize("NFKC", raw)
    text = CONTROL_CHARS.sub("", text).translate(CONFUSABLES)
    return normalize(text)


def detect_injection(raw: str) -> list[str]:
    """Códigos dos sinais de injeção de prompt encontrados no texto bruto."""
    flags: list[str] = []
    if len(raw) > MAX_TEXT_CHARS:
        flags.append("texto_longo")
    if CONTROL_CHARS.search(raw):
        flags.append("caracteres_controle")
    text = detection_text(raw)
    flags += [code for code, pattern in INJECTION_PATTERNS if pattern.search(text)]
    encoded = any(_looks_like_base64(m.group()) for m in BASE64_BLOCK.finditer(raw))
    if encoded and "codificacao" not in flags:
        flags.append("codificacao")
    # A forma compacta só conta quando revela o que os padrões não viram: "i g n o r e",
    # "1gn0r3". Um "Ignore todas as regras" já foi sinalizado e não é ofuscação.
    compact = re.sub(r"[^a-z0-9]", "", text.translate(LEET))
    if not flags and any(word in compact for word in COMPACT_KEYWORDS):
        flags.append("ofuscacao")
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
