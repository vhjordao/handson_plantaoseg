"""Explicação: template só cita fatores recebidos; reescrita do LLM só vale se não inventar nada."""

import json
import unittest

from app.explain import explain, explain_template, validate_rewrite
from app.llm.client import LLMUnavailableError
from app.llm.guardrails import GuardrailError
from app.ranking.features import CONTEXT_VARIABLES, RANKING_FEATURES

FEATURES = {
    "specialty_match": 1.0,
    "distance_km": 4.2,
    "availability_overlap_hours": 12.0,
    "acceptance_rate_90d": 0.71,
    "attendance_rate_90d": 0.9,
    "hours_since_last_shift": 40.0,
    "night_shift_preference_match": 1.0,
    "shifts_last_30d": 11.0,
    "offers_received_30d": 6.0,
}
CONTRIBUTIONS = {
    "specialty_match": 0.0,
    "distance_km": 0.9,
    "availability_overlap_hours": 0.0,
    "acceptance_rate_90d": 0.5,
    "attendance_rate_90d": -0.1,
    "hours_since_last_shift": 0.2,
    "night_shift_preference_match": 0.3,
    "shifts_last_30d": 2.0,  # o maior de todos, mas nunca pode virar motivo
}


class FakeClient:
    def __init__(self, response: str) -> None:
        self.response = response

    def generate_json(self, *, system, user, schema):
        return self.response


class DownClient:
    def generate_json(self, *, system, user, schema):
        raise LLMUnavailableError("fora do ar")


def rewrite(text: str, cited: list[str]) -> str:
    return json.dumps({"text": text, "factors_cited": cited})


class TemplateTests(unittest.TestCase):
    def test_cita_so_fatores_recebidos_e_com_contribuicao_positiva(self):
        explanation = explain_template(FEATURES, CONTRIBUTIONS)
        self.assertEqual(explanation.source, "template")
        self.assertTrue(set(explanation.factors_cited) <= set(FEATURES))
        self.assertNotIn("attendance_rate_90d", explanation.factors_cited)  # contribuição negativa
        self.assertLessEqual(len(explanation.factors_cited), 3)

    def test_ordena_pelo_peso_e_formata_em_portugues(self):
        explanation = explain_template(FEATURES, CONTRIBUTIONS)
        self.assertEqual(explanation.factors_cited[0], "distance_km")
        self.assertIn("4,2 km", explanation.text)
        self.assertIn("71%", explanation.text)

    def test_carga_recente_nunca_e_motivo(self):
        explanation = explain_template(FEATURES, CONTRIBUTIONS)
        self.assertNotIn("shifts_last_30d", explanation.factors_cited)
        self.assertNotIn("plantões nos últimos 30 dias", explanation.text)

    def test_variaveis_de_contexto_nunca_aparecem(self):
        contributions = dict.fromkeys((*RANKING_FEATURES, *CONTEXT_VARIABLES), 1.0)
        explanation = explain_template(FEATURES, contributions)
        self.assertFalse(set(explanation.factors_cited) & set(CONTEXT_VARIABLES))

    def test_sem_fator_de_destaque(self):
        explanation = explain_template(FEATURES, dict.fromkeys(RANKING_FEATURES, 0.0))
        self.assertEqual(explanation.factors_cited, ())
        self.assertIn("Elegível pelas regras", explanation.text)


class ReescritaDoLlmTests(unittest.TestCase):
    def setUp(self):
        self.template = explain_template(FEATURES, CONTRIBUTIONS)
        self.allowed = set(self.template.factors_cited)

    def good(self) -> str:
        return rewrite(
            "Mora a 4,2 km e tem taxa de aceite estimada de 71% nos últimos 90 dias.",
            ["distance_km", "acceptance_rate_90d"],
        )

    def test_reescrita_fiel_e_aceita(self):
        result, fallback = explain(FEATURES, CONTRIBUTIONS, FakeClient(self.good()))
        self.assertEqual(result.source, "llm")
        self.assertIsNone(fallback)

    def test_reescritas_que_acrescentam_algo_caem_no_template(self):
        bad = {
            "numero_inventado": rewrite("Mora a 9,9 km do hospital.", ["distance_km"]),
            "fator_inventado": rewrite("Mora perto.", ["distance_km", "age_band"]),
            "menciona_valor": rewrite("Aceitou pelo valor de R$ 2.000.", ["distance_km"]),
            "menciona_pagamento": rewrite("Bom pagamento, mora a 4,2 km.", ["distance_km"]),
            "dado_pessoal": rewrite("O CRM dele é ótimo, mora a 4,2 km.", ["distance_km"]),
            "campo_extra": json.dumps({"text": "ok", "factors_cited": [], "score": 1}),
            "texto_longo": rewrite("a" * 500, ["distance_km"]),
            "texto_vazio": rewrite("   ", ["distance_km"]),
            "tipos_errados": json.dumps({"text": 1, "factors_cited": "distance_km"}),
            "nao_e_json": "Claro, aqui vai a explicação reescrita!",
        }
        for name, output in bad.items():
            with self.subTest(saida=name):
                with self.assertRaises(GuardrailError):
                    validate_rewrite(output, self.template, self.allowed)
                result, fallback = explain(FEATURES, CONTRIBUTIONS, FakeClient(output))
                self.assertEqual(result, self.template)
                self.assertIsNotNone(fallback)

    def test_llm_fora_do_ar_usa_o_template(self):
        result, fallback = explain(FEATURES, CONTRIBUTIONS, DownClient())
        self.assertEqual(result, self.template)
        self.assertEqual(fallback, "llm_indisponivel")

    def test_sem_cliente_nao_ha_fallback_a_explicar(self):
        result, fallback = explain(FEATURES, CONTRIBUTIONS, None)
        self.assertEqual(result.source, "template")
        self.assertIsNone(fallback)


if __name__ == "__main__":
    unittest.main()
