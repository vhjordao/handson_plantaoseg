"""Tira CRM, telefone, e-mail e número de documento dos textos livres que vão para a trilha.

É a segunda barreira. A primeira é a tela, que conhece os nomes dos médicos e os apaga antes de
enviar (`apps/web/lib/api/demo/privacidade.ts`). A API nunca lê nome de médico, então aqui só
entram os padrões: os mesmos da tela, para o texto sair igual nos dois modos.

É melhor esforço, não garantia: prefere apagar a mais a deixar passar, e o aviso "Não digite dados
reais" continua valendo na tela.
"""

import re

MARK_CRM = "[CRM removido]"
MARK_PHONE = "[telefone removido]"
MARK_EMAIL = "[e-mail removido]"
MARK_NUMBER = "[número removido]"

MAX_FREE_TEXT = 1000  # `LIMITE_TEXTO_LIVRE` da tela
MIN_JUSTIFICATION = 10  # `MIN_CARACTERES_JUSTIFICATIVA` da tela, contado sem as marcas

_EMAIL = re.compile(r"[\w.%+-]+@[\w-]+(?:\.[\w-]+)+")
_CPF_CNPJ = re.compile(
    r"\b[0-9]{3}\.[0-9]{3}\.[0-9]{3}-[0-9]{2}\b|\b[0-9]{2}\.[0-9]{3}\.[0-9]{3}/[0-9]{4}-[0-9]{2}\b"
)
# "CRM 123456", "CRM-SP 123.456", "CRM/SP: 123456-SP", "CRM nº 123456" e o pseudo-CRM das
# personas ("SIM-SP-014"). A UF depois do número só entra colada por "/" ou "-".
_CRM = re.compile(
    r"\b(?:SIM-[A-Z]{2}-[0-9]{3,}|CRM[\s:/.-]*(?:[A-Z]{2}\b[\s:/.-]*)?(?:n[º°o]?\.?\s*)?"
    r"[0-9][0-9.]*[0-9](?:[/-][A-Z]{2}\b)?)",
    re.IGNORECASE,
)
# Telefone com DDD (e +55) opcionais, e o de 8 ou 9 dígitos sem DDD. Um intervalo de anos
# ("2025-2026") não conta como telefone.
_PHONE = re.compile(
    r"(?:\+?55[\s-]?)?\(?\b[0-9]{2}\)?[\s-]?[0-9]{4,5}[\s-]?[0-9]{4}\b"
    r"|\b(?!(?:19|20)[0-9]{2}[\s-](?:19|20)[0-9]{2}\b)[0-9]{4,5}[\s-][0-9]{4}\b"
)
_LONG_NUMBER = re.compile(r"[0-9]{8,}")
_MARKS = re.compile(r"\[(?:nome|CRM|telefone|e-mail|número) removido\]")


def remove_personal_data(text: str) -> str:
    """O texto sem CRM, e-mail, telefone nem número de documento, na mesma ordem da tela."""
    cleaned = _EMAIL.sub(MARK_EMAIL, text)
    cleaned = _CPF_CNPJ.sub(MARK_NUMBER, cleaned)
    cleaned = _CRM.sub(MARK_CRM, cleaned)
    cleaned = _PHONE.sub(MARK_PHONE, cleaned)
    return _LONG_NUMBER.sub(MARK_NUMBER, cleaned)


def without_marks(text: str) -> str:
    """O que sobra sem as marcas de remoção: é o que a pessoa escreveu de fato."""
    return re.sub(r"\s+", " ", _MARKS.sub("", text)).strip()
