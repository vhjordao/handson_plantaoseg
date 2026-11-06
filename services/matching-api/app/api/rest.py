"""Cliente mínimo da API REST do Supabase (PostgREST), com a chave de serviço.

Toda consulta lista as colunas: `select=*` é recusado aqui, antes de sair da máquina. A chave de
serviço ignora a RLS, então esta camada é o que impede a API de ler o que não deve. O valor do
plantão fica barrado também aqui, além de não estar em nenhuma lista de colunas (Res. CFM
2.460/2026, validar com jurídico).
"""

from collections.abc import Mapping, Sequence
from typing import Any, Protocol

import httpx

PAGE_SIZE = 1000  # O Supabase devolve no máximo 1.000 linhas por chamada (`max_rows`).
FORBIDDEN_TABLES = frozenset({"shift_compensation"})
UNIQUE_VIOLATION = "23505"


class RestError(RuntimeError):
    """O banco recusou a chamada ou não respondeu. A mensagem não traz dado nem segredo."""

    def __init__(self, status: int, code: str = "") -> None:
        super().__init__(f"supabase respondeu {status} {code}".strip())
        self.status = status
        self.code = code


class RestConflict(RestError):
    """Violação de unicidade: outra chamada já fez a mesma coisa."""


class Rest(Protocol):
    def select(
        self,
        table: str,
        columns: Sequence[str],
        *,
        filters: Mapping[str, str] | None = None,
        order: str | None = None,
        limit: int | None = None,
    ) -> list[dict[str, Any]]: ...

    def insert(
        self,
        table: str,
        rows: Sequence[Mapping[str, Any]],
        *,
        returning: Sequence[str] | None = None,
    ) -> list[dict[str, Any]]: ...

    def update(
        self,
        table: str,
        values: Mapping[str, Any],
        *,
        filters: Mapping[str, str],
        returning: Sequence[str],
    ) -> list[dict[str, Any]]: ...


def column_list(columns: Sequence[str]) -> str:
    """As colunas de uma consulta. Nunca `*`: quem lê precisa dizer o que lê."""
    if not columns or any("*" in column for column in columns):
        raise ValueError("liste as colunas: select=* não é permitido")
    return ",".join(columns)


def guard_table(table: str) -> None:
    if table in FORBIDDEN_TABLES:
        raise ValueError(f"a API não acessa a tabela {table}")


def _error_code(response: httpx.Response) -> str:
    try:
        return str(response.json().get("code", ""))
    except (ValueError, AttributeError):
        return ""


class SupabaseRest:
    """Implementação real de `Rest`. Um único cliente, seguro para várias threads."""

    def __init__(
        self,
        base_url: str,
        key: str,
        *,
        transport: httpx.BaseTransport | None = None,
        timeout: float = 10.0,
    ) -> None:
        headers = {"apikey": key}
        # As chaves antigas são JWT e pedem também este cabeçalho; as novas (sb_secret_), não.
        if key.startswith("eyJ"):
            headers["Authorization"] = f"Bearer {key}"
        self._client = httpx.Client(
            base_url=base_url,
            headers=headers,
            timeout=timeout,
            transport=transport,
            limits=httpx.Limits(max_connections=30, max_keepalive_connections=10),
        )

    def close(self) -> None:
        self._client.close()

    def _send(self, method: str, table: str, **kwargs: Any) -> list[dict[str, Any]]:
        guard_table(table)
        try:
            response = self._client.request(method, f"/{table}", **kwargs)
        except httpx.HTTPError as exc:
            raise RestError(503, type(exc).__name__) from exc
        if response.status_code >= 400:
            code = _error_code(response)
            error = RestConflict if code == UNIQUE_VIOLATION else RestError
            raise error(response.status_code, code)
        return response.json() if response.content else []

    def select(
        self,
        table: str,
        columns: Sequence[str],
        *,
        filters: Mapping[str, str] | None = None,
        order: str | None = None,
        limit: int | None = None,
    ) -> list[dict[str, Any]]:
        """Lê as colunas pedidas, de página em página. Sem `order`, ordena pela primeira coluna."""
        params: dict[str, Any] = {
            "select": column_list(columns),
            "order": order or columns[0],
            **(filters or {}),
        }
        rows: list[dict[str, Any]] = []
        while True:
            page = PAGE_SIZE if limit is None else min(PAGE_SIZE, limit - len(rows))
            batch = self._send("GET", table, params={**params, "limit": page, "offset": len(rows)})
            rows += batch
            if len(batch) < page or (limit is not None and len(rows) >= limit):
                return rows

    def insert(
        self,
        table: str,
        rows: Sequence[Mapping[str, Any]],
        *,
        returning: Sequence[str] | None = None,
    ) -> list[dict[str, Any]]:
        """Insere as linhas de uma vez, em uma única transação do lado do banco."""
        if not rows:
            return []
        if returning is None:
            self._send("POST", table, json=list(rows), headers={"Prefer": "return=minimal"})
            return []
        return self._send(
            "POST",
            table,
            json=list(rows),
            params={"select": column_list(returning)},
            headers={"Prefer": "return=representation"},
        )

    def update(
        self,
        table: str,
        values: Mapping[str, Any],
        *,
        filters: Mapping[str, str],
        returning: Sequence[str],
    ) -> list[dict[str, Any]]:
        """Altera as linhas do filtro e devolve o que mudou. Sem filtro, não altera nada."""
        if not filters:
            raise ValueError("update sem filtro não é permitido")
        return self._send(
            "PATCH",
            table,
            json=dict(values),
            params={"select": column_list(returning), **filters},
            headers={"Prefer": "return=representation"},
        )
