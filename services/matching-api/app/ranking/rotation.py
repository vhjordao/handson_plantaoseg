"""Rodízio entre equivalentes: a política contra a concentração das ofertas (roteiro, passo 7.2).

O experimento do passo 7.1 (`app/concentration.py`) escolheu o rodízio com margem de 10 pontos:
a ordem continua sendo a do modelo, mas, entre os elegíveis cuja chance prevista fica a até 10
pontos da melhor ainda disponível, vai primeiro quem apareceu menos no top-5 nos últimos 7 dias.
Ninguém passa à frente de alguém mais de 10 pontos melhor, e ninguém sai da lista: o rodízio só
reordena. O experimento e a API usam esta mesma função, para o que roda ser o que foi medido.

A exposição é uma contagem de aparições no top-5; não usa valor do plantão, pagamento nem dado
pessoal.
"""

from collections.abc import Callable, Mapping, Sequence
from datetime import timedelta
from typing import TypeVar

T = TypeVar("T")

# A política escolhida no experimento (docs/resultados/metricas-concentracao.md).
ROTATION_DELTA = 0.10
ROTATION_WINDOW = timedelta(days=7)
# Conta como exposição aparecer entre os 5 primeiros, o mesmo top-5 do experimento.
EXPOSURE_TOP = 5


def rotate(
    ordered: Sequence[T],
    *,
    score: Callable[[T], float],
    key: Callable[[T], str],
    exposure: Mapping[str, int],
    delta: float = ROTATION_DELTA,
) -> list[T]:
    """Reordena uma lista já na ordem do modelo (maior score primeiro).

    A cada lugar, entre os que estão a até `delta` do melhor restante, vai o menos exposto; no
    empate, o de maior score e, depois, o de menor id. Sem exposição, devolve a ordem do modelo.
    """
    remaining = list(ordered)
    result: list[T] = []
    while remaining:
        best = score(remaining[0])
        equivalents = [item for item in remaining if score(item) >= best - delta]
        pick = min(
            equivalents, key=lambda item: (exposure.get(key(item), 0), -score(item), key(item))
        )
        result.append(pick)
        remaining.remove(pick)
    return result
