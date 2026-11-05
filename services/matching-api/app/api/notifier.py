"""Avisa o n8n de que a cascata de uma vaga começou (ADR 0013).

O aviso sai uma vez por vaga, depois da aprovação, e só leva o ID da vaga: o n8n pergunta o resto à
API, em `POST /internal/cascade/{id}/advance`. Como a aprovação já está gravada quando ele sai, uma
falha aqui nunca volta para o coordenador. Ela fica no log, e a oferta vencida espera alguém chamar
`advance`, como antes de existir o workflow.
"""

import logging
import time
from collections.abc import Callable

import httpx

logger = logging.getLogger("matching_api")

ATTEMPTS = 3
PAUSE_SECONDS = 2.0
TIMEOUT_SECONDS = 3.0


class CascadeNotifier:
    def __init__(
        self,
        url: str,
        secret: str,
        *,
        transport: httpx.BaseTransport | None = None,
        sleep: Callable[[float], None] = time.sleep,
    ) -> None:
        self._url = url
        self._headers = {"X-Internal-Secret": secret}
        self._client = httpx.Client(timeout=TIMEOUT_SECONDS, transport=transport)
        self._sleep = sleep

    def cascade_started(self, shift_id: str) -> bool:
        """Devolve se o n8n recebeu. Repetir é seguro: a API só avança uma vez por prazo vencido."""
        for attempt in range(1, ATTEMPTS + 1):
            try:
                response = self._client.post(
                    self._url, json={"shift_id": shift_id}, headers=self._headers
                )
                response.raise_for_status()
                return True
            except httpx.HTTPError as exc:
                # Só o tipo do erro: a mensagem do httpx poderia trazer a URL ou a resposta.
                logger.warning(
                    "aviso ao n8n falhou (tentativa %d de %d, vaga %s): %s",
                    attempt,
                    ATTEMPTS,
                    shift_id,
                    type(exc).__name__,
                )
            if attempt < ATTEMPTS:
                self._sleep(PAUSE_SECONDS)
        logger.error("o n8n não recebeu o aviso da vaga %s: ela não avança sozinha", shift_id)
        return False
