"""Validação do JWT do Supabase. O JWT diz quem é; o papel e a organização vêm de `profiles`.

Só aceita ES256, o algoritmo das chaves deste projeto. Listar o algoritmo aqui, em vez de confiar
no cabeçalho do token, fecha a troca de algoritmo e o `alg: none`.
"""

import time
from collections.abc import Callable
from threading import Lock
from typing import Any, Protocol
from uuid import UUID

import httpx
import jwt

from app.api.errors import ApiError

ALGORITHMS = ["ES256"]
AUDIENCE = "authenticated"
LEEWAY_SECONDS = 5
JWKS_MIN_REFRESH_SECONDS = 60.0


class KeySource(Protocol):
    def key_for(self, kid: str) -> Any | None: ...


class JwksKeys:
    """Chaves públicas do Supabase. Um `kid` desconhecido relê a lista, no máximo 1 vez por minuto.

    Sem esse limite, cada token inventado viraria uma chamada ao Supabase.
    """

    def __init__(
        self,
        fetch: Callable[[], dict[str, Any]],
        *,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self._fetch = fetch
        self._clock = clock
        self._lock = Lock()
        self._keys: dict[str, Any] = {}
        self._last_fetch: float | None = None

    @classmethod
    def from_url(cls, url: str) -> "JwksKeys":
        def fetch() -> dict[str, Any]:
            response = httpx.get(url, timeout=5.0)
            response.raise_for_status()
            return response.json()

        return cls(fetch)

    def refresh(self) -> None:
        document = self._fetch()
        self._keys = {
            key["kid"]: jwt.PyJWK.from_dict(key) for key in document.get("keys", []) if "kid" in key
        }
        self._last_fetch = self._clock()

    def key_for(self, kid: str) -> Any | None:
        with self._lock:
            if kid in self._keys:
                return self._keys[kid]
            recent = (
                self._last_fetch is not None
                and self._clock() - self._last_fetch < JWKS_MIN_REFRESH_SECONDS
            )
            if not recent:
                self.refresh()
            return self._keys.get(kid)


class TokenVerifier:
    def __init__(self, supabase_url: str, keys: KeySource) -> None:
        self._issuer = f"{supabase_url}/auth/v1"
        self._keys = keys

    def user_id(self, token: str) -> str:
        """Devolve o ID do usuário de um token válido. Qualquer dúvida vira 401, sem detalhe."""
        invalid = ApiError(401, "token_invalido", "Faça login de novo.")
        try:
            kid = jwt.get_unverified_header(token).get("kid")
            key = self._keys.key_for(kid) if isinstance(kid, str) else None
            if key is None:
                raise invalid
            claims = jwt.decode(
                token,
                key=key,
                algorithms=ALGORITHMS,
                audience=AUDIENCE,
                issuer=self._issuer,
                leeway=LEEWAY_SECONDS,
                options={"require": ["exp", "sub", "aud", "iss"]},
            )
            return str(UUID(claims["sub"]))
        except (jwt.PyJWTError, ValueError, TypeError) as exc:
            raise invalid from exc
