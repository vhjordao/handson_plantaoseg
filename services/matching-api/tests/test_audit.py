"""Trilha de auditoria: só inserção, encadeada por hash, sem dado pessoal."""

import json
import tempfile
import unittest
from datetime import datetime
from pathlib import Path

from app.audit import AuditLog

NOW = datetime(2026, 10, 1, 9)


def add(log: AuditLog, action: str = "shift_published", **details):
    return log.append(
        now=NOW,
        actor_role="coordinator",
        actor_pseudo_id="coord-1",
        action=action,
        entity_type="shift",
        entity_id="vaga-1",
        model_version="logreg-v1",
        details=details,
    )


class AuditoriaTests(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self._tmp.cleanup)
        self.path = Path(self._tmp.name) / "audit.jsonl"
        self.log = AuditLog(self.path)

    def test_cadeia_integra_e_numerada(self):
        for action in ("shift_published", "extraction_confirmed", "recommendation_approved"):
            add(self.log, action)
        self.assertEqual(self.log.verify(), (True, 3))
        lines = self.path.read_text(encoding="utf-8").splitlines()
        self.assertEqual([json.loads(line)["seq"] for line in lines], [1, 2, 3])

    def test_registros_antigos_nunca_mudam(self):
        add(self.log)
        first = self.path.read_text(encoding="utf-8")
        add(self.log, "extraction_confirmed")
        self.assertTrue(self.path.read_text(encoding="utf-8").startswith(first))

    def test_alteracao_de_um_registro_quebra_a_cadeia(self):
        add(self.log)
        add(self.log, "extraction_confirmed")
        tampered = self.path.read_text(encoding="utf-8").replace("coord-1", "outra-pessoa", 1)
        self.path.write_text(tampered, encoding="utf-8")
        self.assertEqual(self.log.verify()[0], False)

    def test_remocao_do_primeiro_registro_quebra_a_cadeia(self):
        for _ in range(3):
            add(self.log)
        lines = self.path.read_text(encoding="utf-8").splitlines(keepends=True)
        self.path.write_text("".join(lines[1:]), encoding="utf-8")
        self.assertEqual(self.log.verify()[0], False)

    def test_nao_aceita_dado_pessoal(self):
        for key in ("name_sim", "crm_sim", "phone_sim", "Name", "email"):
            with self.subTest(campo=key), self.assertRaises(ValueError):
                add(self.log, **{key: "x"})
        self.assertFalse(self.path.exists())

    def test_nao_aceita_acao_ou_papel_desconhecidos(self):
        with self.assertRaises(ValueError):
            add(self.log, "apagar_tudo")
        with self.assertRaises(ValueError):
            self.log.append(
                now=NOW, actor_role="admin", actor_pseudo_id="x", action="shift_published",
                entity_type="shift", entity_id="v",
            )

    def test_trilha_inexistente_e_integra_e_vazia(self):
        self.assertEqual(self.log.verify(), (True, 0))


if __name__ == "__main__":
    unittest.main()
