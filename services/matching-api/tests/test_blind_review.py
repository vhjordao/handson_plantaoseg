"""Revisão às cegas: as listas não entregam a origem nem expõem dado pessoal."""

import unittest
from datetime import datetime

from app.blind_review import build_cases, doctor_code, render_answer_key, render_cases
from app.ranking.compute import FeatureStore
from app.ranking.evaluate import eligible_pool
from tests.helpers import small_dataset, small_model, small_params

N = 6


class RevisaoAsCegasTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.dataset = small_dataset()
        cls.cases = build_cases(cls.dataset, small_model(), small_params(), n_cases=N)
        cls.text = render_cases(cls.cases)

    def test_mesma_semente_mesmos_casos(self):
        again = build_cases(self.dataset, small_model(), small_params(), n_cases=N)
        self.assertEqual(render_cases(again), self.text)

    def test_cada_caso_tem_duas_listas_de_cinco_que_diferem(self):
        self.assertEqual(len(self.cases), N)
        for case in self.cases:
            self.assertEqual(len(case.list_a), 5)
            self.assertEqual(len(case.list_b), 5)
            self.assertLessEqual(case.shared, 3)

    def test_a_origem_das_listas_fica_equilibrada(self):
        from_model = sum(case.a_source == "modelo" for case in self.cases)
        self.assertEqual(from_model, N // 2)

    def test_os_casos_alternam_especialidade_e_hospital(self):
        shifts = [self.dataset.shifts[case.shift_id] for case in self.cases]
        self.assertEqual({s.specialty for s in shifts}, {"clinica_medica", "pediatria"})
        self.assertEqual(len({s.unit_id for s in shifts}), len(self.dataset.units))

    def test_cada_caso_fica_inteiro_em_uma_pagina(self):
        self.assertEqual(self.text.count("<!-- bloco -->"), N)
        self.assertEqual(self.text.count("<!-- fim-bloco -->"), N)

    def test_a_folha_do_coordenador_nao_entrega_a_origem(self):
        cleaned = self.text.lower().replace("hospital modelo", "")  # nome fictício da unidade
        for word in ("baseline", "modelo", "ranking", "score", "probabilidade"):
            self.assertNotIn(word, cleaned, word)

    def test_nenhum_dado_pessoal_aparece(self):
        for doctor in self.dataset.doctors.values():
            self.assertNotIn(doctor.name_sim, self.text)
            self.assertNotIn(doctor.crm_sim, self.text)
            self.assertNotIn(doctor.phone_sim, self.text)

    def test_nenhuma_variavel_protegida_ou_de_pagamento_aparece(self):
        lowered = self.text.lower()
        for word in ("gênero", "faixa etária", "zona", "valor do plantão", "pagamento"):
            self.assertNotIn(word, lowered, word)

    def test_todos_os_candidatos_listados_sao_elegiveis_para_a_vaga(self):
        store = FeatureStore(self.dataset)
        for case in self.cases:
            shift = self.dataset.shifts[case.shift_id]
            pool = eligible_pool(self.dataset, store, shift)
            eligible = {doctor_code(doctor.id) for doctor, _ in pool}
            for row in (*case.list_a, *case.list_b):
                self.assertIn(row.code, eligible)

    def test_as_vagas_sao_do_periodo_de_teste_e_nao_se_repetem(self):
        test_start = datetime.fromisoformat(small_params()["test_start"])
        ids = [case.shift_id for case in self.cases]
        self.assertEqual(len(set(ids)), N)
        for shift_id in ids:
            self.assertGreaterEqual(self.dataset.shifts[shift_id].published_at, test_start)

    def test_a_folha_nao_mostra_a_data_nem_o_id_da_vaga(self):
        self.assertNotRegex(self.text, r"\d{4}-\d{2}-\d{2}")
        for case in self.cases:
            self.assertNotIn(case.shift_id[:8], self.text)

    def test_gabarito_diz_a_origem_de_cada_lista_e_como_calcular(self):
        key = render_answer_key(self.cases)
        self.assertIn("Não abra antes", key)
        self.assertIn("60%", key)
        for case in self.cases:
            self.assertIn(f"| {case.number} | {case.a_source} | {case.b_source} |", key)
            self.assertNotEqual(case.a_source, case.b_source)


if __name__ == "__main__":
    unittest.main()
