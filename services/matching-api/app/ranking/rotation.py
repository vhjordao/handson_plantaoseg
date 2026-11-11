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


# O lugar de oportunidade (experimento da zona, `app/zone.py`): ainda não está na API.
OPPORTUNITY_POSITION = 3
OPPORTUNITY_REACH = 0.30


def with_opportunity_slot(
    ordered: Sequence[T],
    *,
    score: Callable[[T], float],
    key: Callable[[T], str],
    exposure: Mapping[str, int],
    position: int = OPPORTUNITY_POSITION,
    reach: float = OPPORTUNITY_REACH,
    only: Callable[[T], bool] | None = None,
) -> list[T]:
    """Reserva um lugar da lista (1 é o primeiro) para quem tem menos exposição e ainda tem chance.

    Entre os que estão do lugar `position` em diante e a até `reach` de chance prevista do melhor,
    vai para esse lugar o menos exposto; no empate, o de maior score e, depois, o de menor id. Quem
    estava no lugar sai um degrau para baixo, e ninguém sai da lista. Não olha zona, idade, gênero
    nem pagamento: só a contagem de aparições e a chance prevista. `only`, se vier, limita a escolha
    a quem passa no teste (o experimento usa a distância, que já é variável do ranking).
    """
    result = list(ordered)
    index = position - 1
    if index <= 0 or index >= len(result):
        return result
    best = score(result[0])
    candidates = [
        i
        for i in range(index, len(result))
        if score(result[i]) >= best - reach and (only is None or only(result[i]))
    ]
    if not candidates:
        return result
    chosen = min(
        candidates,
        key=lambda i: (exposure.get(key(result[i]), 0), -score(result[i]), key(result[i])),
    )
    if chosen != index:
        result.insert(index, result.pop(chosen))
    return result
