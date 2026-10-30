"""Contrato das variáveis do ranking.

Esta lista é a única fonte das variáveis que o ranking pode usar. Duas famílias
ficam de fora por desenho:

* campos econômicos (pagamento, valor, remuneração), por causa da Res. CFM
  2.460/2026 (validar com jurídico);
* atributos protegidos (gênero, idade, raça, origem), por causa do risco de
  discriminação (Res. CFM 2.454/2026 e LGPD; validar com jurídico).

O teste `tests/test_neutralidade_economica.py` falha se alguém violar isso, e
ele roda na CI. Toda mudança na lista passa por `validar_features`.

Histórico: em 30/10/2026 `shifts_last_30d` e `offers_received_30d` saíram do ranking e viraram
variáveis de contexto. A avaliação em simulação mostrou que elas não melhoram o top-5 (71,2%
sem elas contra 71,3% com elas); `shifts_last_30d` ganhava peso positivo por confundimento
(quem é confiável aceita mais plantões), o que levaria a recomendar o mais sobrecarregado, e
`offers_received_30d` mede exposição e pode realimentar viés de seleção.
"""

import re
import unicodedata
from collections.abc import Iterable

RANKING_FEATURES: tuple[str, ...] = (
    "specialty_match",
    "distance_km",
    "availability_overlap_hours",
    "acceptance_rate_90d",
    "attendance_rate_90d",
    "hours_since_last_shift",
    "night_shift_preference_match",
)

# Calculadas junto, mas FORA do ranking: servem a alertas de jornada, à avaliação e à análise.
CONTEXT_VARIABLES: tuple[str, ...] = (
    "shifts_last_30d",
    "offers_received_30d",
)

# Trechos que, em qualquer posição do nome, indicam campo econômico.
ECONOMIC_STEMS: tuple[str, ...] = (
    "pay",
    "pagament",
    "valor",
    "remuner",
    "salar",
    "cashback",
    "comiss",
    "commission",
)

# Palavras inteiras (o nome é separado por "_") que indicam campo econômico.
ECONOMIC_WORDS: frozenset[str] = frozenset(
    {"amount", "price", "preco", "fee", "bonus", "hourly", "value", "cost", "custo", "brl", "usd"}
)

# Palavras inteiras que indicam atributo protegido.
PROTECTED_WORDS: frozenset[str] = frozenset(
    {
        "gender", "genero", "sex", "sexo", "age", "idade", "race", "raca", "cor",
        "ethnicity", "etnia", "origin", "origem", "birth", "nascimento", "religion",
        "religiao", "nationality", "nacionalidade", "disability", "deficiencia",
        "orientation", "orientacao",
    }
)  # fmt: skip


def _normalizar(nome: str) -> str:
    """Minúsculas e sem acentos, para pegar `preço` e `PREÇO` como `preco`."""
    sem_acento = unicodedata.normalize("NFKD", nome).encode("ascii", "ignore").decode()
    return sem_acento.lower()


def violacoes_neutralidade(features: Iterable[str]) -> list[str]:
    """Devolve uma mensagem por variável que viola a neutralidade ou usa atributo protegido."""
    achados: list[str] = []
    for nome in features:
        normalizado = _normalizar(nome)
        palavras = set(re.split(r"[^a-z0-9]+", normalizado)) - {""}
        if any(trecho in normalizado for trecho in ECONOMIC_STEMS) or palavras & ECONOMIC_WORDS:
            achados.append(f"{nome}: campo econômico (Res. CFM 2.460/2026)")
        elif palavras & PROTECTED_WORDS:
            achados.append(f"{nome}: atributo protegido")
    return achados


def validar_features(features: Iterable[str]) -> None:
    """Levanta ValueError se alguma variável for proibida no ranking."""
    achados = violacoes_neutralidade(features)
    if achados:
        raise ValueError("Variáveis proibidas no ranking: " + "; ".join(achados))
