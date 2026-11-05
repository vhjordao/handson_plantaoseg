"""Interface do LLM do produto (Gemini, ADR 0003) e clientes de apoio.

O LLM só extrai campos de texto livre e reescreve a explicação. Não recebe ferramentas,
segredos, nome, CRM nem telefone. Toda chamada passa por esta interface, para que a falta de
chave, a falha do serviço ou uma resposta inválida caiam no caminho sem LLM.
"""

import logging
import math
import os
import time
from collections.abc import Callable, Mapping
from typing import Any, Protocol

logger = logging.getLogger("matching_api")

# Uma chamada lenta não pode prender a tela: passado o limite, a leitura sai pelas regras. Em
# 05/11/2026, com o serviço cheio, a mediana foi de 8 s e a máxima de 15 s
# (docs/teste-manual-gemini.md).
TIMEOUT_MS = 6_000
# O prazo que o SDK manda ao serviço é outra coisa: abaixo de 10 s, o Gemini responde 400
# ("Minimum allowed deadline is 10s"). Por isso ele vai à parte, e quem desiste antes somos nós.
PRAZO_MINIMO_NO_SERVICO_S = 10
# O `503` de "alta demanda" costuma voltar rápido e passar: vale uma repetição, e só uma. Se a
# falha demorou, repetir faria a tela esperar demais.
CODIGO_ALTA_DEMANDA = 503
REPETE_SE_FALHOU_EM_ATE_S = 3.0
ESPERA_ANTES_DE_REPETIR_S = 0.5
# Depois de uma falha, as próximas chamadas nem tentam. Sem isso, os cinco motivos de uma
# recomendação esperariam o limite um a um, e uma queda do serviço travaria a apresentação.
PAUSA_DEPOIS_DE_FALHA_S = 60.0
# Estável, com camada gratuita, e o único que respondeu de forma confiável na medição de
# 05/11/2026 (docs/teste-manual-gemini.md).
MODELO_PADRAO = "gemini-3.1-flash-lite"


class LLMUnavailableError(RuntimeError):
    """O LLM não está configurado ou falhou; o chamador usa o caminho sem LLM."""


class LLMClient(Protocol):
    def generate_json(self, *, system: str, user: str, schema: dict[str, Any]) -> str:
        """Devolve o texto JSON da resposta; quem chama valida o conteúdo."""
        raise NotImplementedError


class NullClient:
    """Cliente usado quando não há chave: sempre indisponível."""

    def generate_json(self, *, system: str, user: str, schema: dict[str, Any]) -> str:
        raise LLMUnavailableError("GEMINI_API_KEY não configurada")


class GeminiClient:
    """Cliente do Gemini pelo SDK oficial `google-genai`, na chamada `generateContent`.

    O formato do pedido foi conferido contra o SDK fixado (`tests/test_llm_gemini.py`), sem
    rede. A reação do modelo só se mede com a chave: `python -m app.llm.avaliacao`. A escolha
    da `generateContent` em vez da Interactions está no ADR 0003: ela não guarda o texto no
    servidor, e o Google a mantém com suporte total, sem data para acabar.
    """

    def __init__(
        self,
        api_key: str,
        model: str,
        *,
        http_client: Any = None,
        timeout_ms: int = TIMEOUT_MS,
        pausa_s: float = PAUSA_DEPOIS_DE_FALHA_S,
        clock: Callable[[], float] = time.monotonic,
        dormir: Callable[[float], None] = time.sleep,
    ) -> None:
        self._api_key = api_key
        self.model = model
        self._http_client = http_client
        self._timeout_ms = timeout_ms
        self._pausa_s = pausa_s
        self._clock = clock
        self._dormir = dormir
        self._sdk: Any = None
        self._pausado_ate = 0.0

    def preparar(self) -> None:
        """Carrega o SDK na subida da API, para a primeira chamada não pagar esse tempo."""
        self._cliente()

    def _cliente(self) -> Any:
        if self._sdk is None:
            try:
                from google import genai  # importação tardia: a CLI e o núcleo não dependem dele
                from google.genai import types
            except ImportError as exc:
                raise LLMUnavailableError("SDK google-genai não instalado") from exc
            prazo = max(PRAZO_MINIMO_NO_SERVICO_S, math.ceil(self._timeout_ms / 1000))
            options = types.HttpOptions(
                timeout=self._timeout_ms,
                headers={"X-Server-Timeout": str(prazo)},
                httpx_client=self._http_client,
            )
            # `vertexai=False` por escrito: uma variável de ambiente esquecida levaria a chamada
            # ao Google Cloud, que cobra. O projeto não gasta com o Gemini (ADR 0003).
            self._sdk = genai.Client(api_key=self._api_key, vertexai=False, http_options=options)
        return self._sdk

    def generate_json(self, *, system: str, user: str, schema: dict[str, Any]) -> str:
        if self._clock() < self._pausado_ate:
            raise LLMUnavailableError("Gemini em pausa depois de uma falha")
        client = self._cliente()
        from google.genai import types

        config = types.GenerateContentConfig(
            system_instruction=system,
            response_mime_type="application/json",
            response_json_schema=schema,
        )
        try:
            text = self._gerar(client, user, config)
        except Exception as exc:
            self._pausado_ate = self._clock() + self._pausa_s
            # Só o tipo e o código do erro: a mensagem do serviço pode repetir o texto enviado.
            motivo = " ".join(str(p) for p in (type(exc).__name__, getattr(exc, "code", "")) if p)
            logger.warning("Gemini indisponível (%s): regras por %.0f s", motivo, self._pausa_s)
            raise LLMUnavailableError(f"falha ao chamar o Gemini: {motivo}") from exc
        if text is None:  # bloqueada pelo filtro de segurança, por exemplo: não é queda do serviço
            raise LLMUnavailableError("o Gemini respondeu sem texto")
        return str(text)

    def _gerar(self, client: Any, user: str, config: Any) -> str | None:
        inicio = self._clock()
        try:
            return client.models.generate_content(
                model=self.model, contents=user, config=config
            ).text
        except Exception as exc:
            rapido = self._clock() - inicio <= REPETE_SE_FALHOU_EM_ATE_S
            if getattr(exc, "code", None) != CODIGO_ALTA_DEMANDA or not rapido:
                raise
        self._dormir(ESPERA_ANTES_DE_REPETIR_S)
        return client.models.generate_content(model=self.model, contents=user, config=config).text


def client_from_env(env: Mapping[str, str] | None = None) -> LLMClient:
    """Gemini se houver `GEMINI_API_KEY`; caso contrário, o cliente nulo."""
    source = os.environ if env is None else env
    key = source.get("GEMINI_API_KEY", "")
    if not key:
        return NullClient()
    return GeminiClient(key, source.get("LLM_MODEL_EXTRACAO", MODELO_PADRAO))
