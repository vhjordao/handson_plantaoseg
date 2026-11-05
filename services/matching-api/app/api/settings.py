"""Configuração da API, lida do ambiente. Os segredos ficam só no `.env` do servidor."""

import os
from collections.abc import Mapping
from dataclasses import dataclass

MIN_SECRET_CHARS = 32


class ConfigError(RuntimeError):
    """Falta configuração, ou ela é insegura: a API não sobe."""


def _required(env: Mapping[str, str], name: str) -> str:
    value = env.get(name, "").strip()
    if not value:
        raise ConfigError(f"defina {name}")
    return value


@dataclass(frozen=True, slots=True)
class Settings:
    supabase_url: str
    service_key: str
    webhook_secret: str
    cors_origins: tuple[str, ...]
    expose_docs: bool
    cascade_url: str = ""
    reescrever_motivos: bool = False

    @classmethod
    def from_env(cls, env: Mapping[str, str] | None = None) -> "Settings":
        source = os.environ if env is None else env
        secret = _required(source, "N8N_WEBHOOK_SECRET")
        if len(secret) < MIN_SECRET_CHARS or secret.startswith("dev-only"):
            raise ConfigError("N8N_WEBHOOK_SECRET fraco: gere com `openssl rand -hex 32`")
        origins = tuple(
            origin.strip()
            for origin in source.get("API_CORS_ORIGINS", "").split(",")
            if origin.strip()
        )
        if "*" in origins:
            raise ConfigError("API_CORS_ORIGINS não aceita *: liste os endereços da web")
        cascade_url = source.get("N8N_CASCADE_URL", "").strip()
        if cascade_url and not cascade_url.startswith(("http://", "https://")):
            raise ConfigError("N8N_CASCADE_URL precisa ser um endereço http")
        return cls(
            supabase_url=_required(source, "SUPABASE_URL").rstrip("/"),
            service_key=_required(source, "SUPABASE_SERVICE_ROLE_KEY"),
            webhook_secret=secret,
            cors_origins=origins,
            expose_docs=source.get("API_DOCS", "") == "1",
            cascade_url=cascade_url,
            reescrever_motivos=source.get("LLM_REESCREVER_MOTIVOS", "") == "1",
        )
