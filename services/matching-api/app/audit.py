"""Trilha de auditoria somente de inserção, encadeada por hash.

Cada linha do arquivo JSONL guarda o hash da linha anterior; alterar ou apagar uma linha
quebra a cadeia e `verify` acusa. A API só oferece `append` (o arquivo é aberto em modo de
acréscimo). A trilha não aceita campos de dado pessoal: só IDs pseudônimos.
"""

import hashlib
import json
from datetime import datetime
from pathlib import Path
from typing import Any

FORBIDDEN_DETAIL_KEYS = frozenset(
    {"name", "name_sim", "crm", "crm_sim", "phone", "phone_sim", "email", "cpf"}
)
ACTIONS = frozenset(
    {
        "shift_published",
        "extraction_confirmed",
        "recommendation_generated",
        "explanation_generated",
        "recommendation_approved",
        "recommendation_rejected",
    }
)
GENESIS = "0" * 64


class AuditLog:
    def __init__(self, path: Path) -> None:
        self.path = path

    def _last(self) -> tuple[int, str]:
        if not self.path.exists():
            return 0, GENESIS
        last = None
        with self.path.open(encoding="utf-8") as handle:
            for line in handle:
                if line.strip():
                    last = json.loads(line)
        return (last["seq"], last["hash"]) if last else (0, GENESIS)

    def append(
        self,
        *,
        now: datetime,
        actor_role: str,
        actor_pseudo_id: str,
        action: str,
        entity_type: str,
        entity_id: str,
        model_version: str | None = None,
        details: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        if action not in ACTIONS:
            raise ValueError(f"ação de auditoria desconhecida: {action}")
        if actor_role not in ("coordinator", "doctor", "system"):
            raise ValueError(f"papel desconhecido: {actor_role}")
        details = details or {}
        if FORBIDDEN_DETAIL_KEYS & {key.lower() for key in details}:
            raise ValueError("a trilha de auditoria não aceita dado pessoal")
        seq, previous = self._last()
        record: dict[str, Any] = {
            "seq": seq + 1,
            "occurred_at": now.strftime("%Y-%m-%dT%H:%M:%S"),
            "actor_role": actor_role,
            "actor_pseudo_id": actor_pseudo_id,
            "action": action,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "model_version": model_version,
            "details": details,
            "prev_hash": previous,
        }
        record["hash"] = self._digest(record)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.path.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(record, ensure_ascii=False, sort_keys=True) + "\n")
        return record

    @staticmethod
    def _digest(record: dict[str, Any]) -> str:
        body = {key: value for key, value in record.items() if key != "hash"}
        payload = json.dumps(body, ensure_ascii=False, sort_keys=True)
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()

    def verify(self) -> tuple[bool, int]:
        """Confere a cadeia inteira. Devolve (íntegra?, número de registros)."""
        if not self.path.exists():
            return True, 0
        previous, count = GENESIS, 0
        with self.path.open(encoding="utf-8") as handle:
            for line in handle:
                if not line.strip():
                    continue
                record = json.loads(line)
                count += 1
                if (
                    record["prev_hash"] != previous
                    or record["seq"] != count
                    or record["hash"] != self._digest(record)
                ):
                    return False, count
                previous = record["hash"]
        return True, count
