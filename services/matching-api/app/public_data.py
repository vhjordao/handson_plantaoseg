"""Agregados públicos usados para conferir as premissas do simulador.

São só totais nacionais, sem nenhum registro individual. Os dados de dezembro de 2024 contam títulos
de especialista, não pessoas nem plantonistas. O estudo quase não traz números sobre plantão: esses
precisam de outras fontes publicadas ou de um piloto.
"""

from typing import Any

SOURCE = "Demografia Médica no Brasil 2025"
SOURCE_URL = "https://bvsms.saude.gov.br/bvs/publicacoes/demografia_medica_brasil_2025.pdf"
READ_ON = "03/11/2026"

# Tabela 3 (p. 205 e seguintes do PDF): títulos por especialidade.
TITLES = {"pediatria": 47787, "clinica_medica": 59038}
# Tabela 7 (p. 216 e 217 do PDF): títulos de mulheres.
WOMEN = {"pediatria": 36693, "clinica_medica": 32749}
# Tabela 8 (p. 219 a 221 do PDF): títulos até 35 anos e a partir de 55 anos.
UP_TO_35 = {"pediatria": 7240, "clinica_medica": 16189}
FROM_55 = {"pediatria": 17672, "clinica_medica": 11007}


def share_pediatria() -> float:
    """Parcela de pediatras entre as duas especialidades do segmento."""
    return TITLES["pediatria"] / sum(TITLES.values())


def share_female() -> dict[str, float]:
    """Parcela de mulheres em cada especialidade."""
    return {specialty: WOMEN[specialty] / TITLES[specialty] for specialty in TITLES}


def age_weights() -> list[float]:
    """Pesos das faixas 25-34, 35-44, 45-54 e 55+.

    O estudo publica "até 35" e "55 ou mais". Dividir o meio em partes iguais é premissa do grupo.
    """
    total = sum(TITLES.values())
    young = sum(UP_TO_35.values()) / total
    old = sum(FROM_55.values()) / total
    middle = (1 - young - old) / 2
    return [young, middle, middle, old]


def calibration() -> dict[str, Any]:
    """Sobrescritas dos parâmetros do gerador com os agregados públicos."""
    return {
        "share_pediatria": share_pediatria(),
        "share_female": share_female(),
        "age_weights": age_weights(),
    }
