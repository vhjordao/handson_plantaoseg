"""Probabilidade verdadeira de aceite e comparecimento no simulador.

Esta é a "verdade" do mundo simulado. O gerador a usa para sortear as respostas e a
avaliação contrafactual a usa para medir o ranking. O modelo de ranking nunca a vê, só as
variáveis de `RANKING_FEATURES`; a confiabilidade latente do médico fica em `doctors_latent`.
Por isso o modelo aprende o simulador (circularidade) e as métricas valem só como simulação.
"""

import math
from typing import Any


def sigmoid(x: float) -> float:
    if x >= 0:
        return 1.0 / (1.0 + math.exp(-x))
    z = math.exp(x)
    return z / (1.0 + z)


def p_accept(
    accept: dict[str, Any],
    *,
    distance_km: float,
    preference_match: float,
    reliability: float,
    covered: bool,
    hours_since_last: float,
    shifts_last_30d: float,
    urgency: str,
    specialty_match: float,
) -> float:
    z = accept["b0"]
    z += accept["distance"] * distance_km
    z += accept["preference"] * preference_match
    z += accept["reliability"] * (reliability - 0.5)
    if not covered:
        z += accept["not_covered"]
    if hours_since_last <= 0:
        z += accept["contiguous"]
    elif hours_since_last < 11:
        z += accept["rest_lt_11"]
    elif hours_since_last < 24:
        z += accept["rest_lt_24"]
    z += accept["load_30d"] * max(0.0, shifts_last_30d - 8.0)
    if urgency == "high":
        z += accept["urgency_high"]
    if specialty_match < 1.0:
        z += accept["secondary_specialty"]
    return sigmoid(z)


def p_attend(reliability: float) -> float:
    """Chance de comparecer depois de aceitar: entre 90% e 99%."""
    return 0.90 + 0.09 * reliability


def p_success(accept: dict[str, Any], *, reliability: float, **state: Any) -> float:
    """Chance de aceitar e comparecer (o alvo do ranking)."""
    return p_accept(accept, reliability=reliability, **state) * p_attend(reliability)
