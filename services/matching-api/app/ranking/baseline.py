"""Ranking baseline heurístico: o que uma coordenação faria "no olho".

Mais perto do hospital e com a janela de disponibilidade cobrindo a vaga. Não usa histórico
de aceite, comparecimento nem carga recente. É a linha de base contra a qual o modelo é medido.
"""


def baseline_score(features: dict[str, float], *, radius_km: float, duration_h: float) -> float:
    closeness = max(0.0, 1.0 - features["distance_km"] / max(radius_km, 1e-9))
    coverage = min(1.0, features["availability_overlap_hours"] / max(duration_h, 1e-9))
    return 0.7 * closeness + 0.3 * coverage
