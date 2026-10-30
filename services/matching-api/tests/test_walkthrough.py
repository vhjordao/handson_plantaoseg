"""Exemplo trabalhado: as contas mostradas batem com o que o sistema calcula."""

import re
import tempfile
import unittest
from datetime import date
from pathlib import Path

from app.walkthrough import render_walkthrough
from tests.helpers import small_dataset, small_model

TEXT = (
    "Preciso de um pediatra para o plantão noturno de sábado, 19h às 7h, "
    "Hospital Modelo Centro, urgência alta"
)


class ExemploTrabalhadoTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        cls.addClassCleanup(cls.tmp.cleanup)
        cls.markdown = render_walkthrough(
            small_dataset(), small_model(), TEXT, date(2026, 3, 20), Path(cls.tmp.name) / "a.jsonl"
        )

    def test_tem_os_seis_passos_e_o_aviso_de_simulacao(self):
        for step in range(1, 7):
            self.assertIn(f"## Passo {step}.", self.markdown)
        self.assertIn("**Simulação.**", self.markdown)

    def test_conta_do_score_bate_com_o_que_o_sistema_mostra(self):
        found = re.search(r"= \*\*(\d,\d{3})\*\* \(o sistema mostrou (\d,\d{3})\)", self.markdown)
        self.assertIsNotNone(found)
        self.assertEqual(found.group(1), found.group(2))

    def test_trilha_integra_e_sem_dado_pessoal(self):
        self.assertIn("íntegra", self.markdown)
        self.assertIn("nenhum nome, CRM ou telefone", self.markdown)

    def test_aprovacao_automatica_e_declarada_como_demonstracao(self):
        self.assertIn("apenas para a demonstração", self.markdown)


if __name__ == "__main__":
    unittest.main()
