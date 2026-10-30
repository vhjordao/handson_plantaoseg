"""Interface do LLM do produto (Gemini, ADR 0003) e clientes de apoio.

O LLM só extrai campos de texto livre e reescreve a explicação. Não recebe ferramentas,
segredos, nome, CRM nem telefone. Toda chamada passa por esta interface, para que a falta de
chave, a falha do serviço ou uma resposta inválida caiam no caminho sem LLM.
"""

import os
from collections.abc import Mapping
from typing import Any, Protocol


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
    """Cliente do Gemini pelo SDK oficial `google-genai`.

    ATENÇÃO: **não foi executado contra o serviço real** (sem chave em 30/10/2026). A
    interface do SDK para saída estruturada precisa ser conferida na documentação antes do
    uso (ADR 0003, pendências). Os testes do projeto usam clientes falsos e cobrem a
    validação, o fallback e a injeção; não cobrem o comportamento do modelo.
    """

    def __init__(self, api_key: str, model: str) -> None:
        self._api_key = api_key
        self._model = model

    def generate_json(self, *, system: str, user: str, schema: dict[str, Any]) -> str:
        try:
            from google import genai  # importação tardia: o SDK é opcional
            from google.genai import types
        except ImportError as exc:
            raise LLMUnavailableError("SDK google-genai não instalado") from exc
        try:
            client = genai.Client(api_key=self._api_key)
            config = types.GenerateContentConfig(
                system_instruction=system,
                response_mime_type="application/json",
                response_json_schema=schema,
            )
            response = client.models.generate_content(
                model=self._model, contents=user, config=config
            )
            return str(response.text)
        except Exception as exc:
            raise LLMUnavailableError(f"falha ao chamar o Gemini: {type(exc).__name__}") from exc


def client_from_env(env: Mapping[str, str] | None = None) -> LLMClient:
    """Gemini se houver `GEMINI_API_KEY`; caso contrário, o cliente nulo."""
    source = os.environ if env is None else env
    key = source.get("GEMINI_API_KEY", "")
    if not key:
        return NullClient()
    return GeminiClient(key, source.get("LLM_MODEL_EXTRACAO", "gemini-3.5-flash-lite"))
