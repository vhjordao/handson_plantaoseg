"""Exemplo do dicionário: os nomes existem, os valores batem e nada identifica ninguém."""

import unittest
from dataclasses import fields

from app.datadict import dictionary_rows, render_dictionary
from app.models import Compensation, Doctor, Offer, Shift
from app.ranking.features import RANKING_FEATURES
from tests.helpers import small_dataset

TABLES = {"doctors": Doctor, "shifts": Shift, "offers": Offer, "shift_compensation": Compensation}


class ExemploDoDicionarioTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.dataset = small_dataset()
        cls.rows = dictionary_rows(cls.dataset)
        cls.by_name = {row["name"]: row for row in cls.rows}
        cls.text = render_dictionary(cls.dataset)

    def test_tem_as_colunas_que_o_professor_pediu(self):
        header = self.text.split("\n")[6]
        for column in ("Variável", "Tipo", "Descrição", "Valores possíveis"):
            self.assertIn(column, header)

    def test_todas_as_variaveis_do_ranking_estao_na_tabela(self):
        listed = [row["name"] for row in self.rows if row["role"] == "feature"]
        self.assertEqual(listed, list(RANKING_FEATURES))

    def test_cada_coluna_existe_na_tabela_indicada(self):
        for row in self.rows:
            if row["table"] in TABLES:
                names = {field.name for field in fields(TABLES[row["table"]])}
                self.assertIn(row["name"], names)

    def test_valores_de_enum_estao_no_dominio_e_somam_o_total(self):
        for name, total in (
            ("crm_status", len(self.dataset.doctors)),
            ("specialty", len(self.dataset.doctors)),
            ("urgency", len(self.dataset.shifts)),
            ("status", len(self.dataset.shifts)),
            ("response", len(self.dataset.offers)),
        ):
            row = self.by_name[name]
            parts = [part.split(": ") for part in row["seen"].split("; ")]
            for value, _ in parts:
                self.assertIn(value, row["domain"])
            self.assertEqual(sum(int(amount.replace(".", "")) for _, amount in parts), total)

    def test_nao_lista_dado_pessoal_simulado_nem_gabarito(self):
        for hidden in ("name_sim", "crm_sim", "phone_sim", "reliability", "home_lat"):
            self.assertNotIn(hidden, self.text)
        doctor = next(iter(self.dataset.doctors.values()))
        self.assertNotIn(doctor.name_sim, self.text)

    def test_marca_o_que_nunca_entra_no_ranking(self):
        self.assertEqual(self.by_name["gender"]["role"], "auditoria")
        self.assertEqual(self.by_name["amount_brl_sim"]["role"], "restrito-econômico")
        self.assertIn("nunca entram", self.text)
        self.assertIn("**Simulação.**", self.text)


if __name__ == "__main__":
    unittest.main()
