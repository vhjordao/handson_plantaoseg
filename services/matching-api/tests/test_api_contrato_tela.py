"""Fase 2 do roteiro (ADR 0015): o que a tela do coordenador passou a pedir à API.

Leitura com origem e trecho, contribuições e evidência, justificativa da exceção, pular e desfazer,
"Esta explicação ajudou?", estado da decisão, política e ficha do modelo. Tudo em simulação.
"""

import json
import unittest
from datetime import date
from pathlib import Path

from app.api.service import MODEL_CARD_PATH
from app.llm.extraction import extract, llm_readings, read_by_rules, rules_readings
from app.llm.guardrails import ShiftFields, normalize, sanitize_text
from app.privacy import remove_personal_data, without_marks
from app.ranking.features import RANKING_FEATURES
from tests.api_fakes import COORDINATOR_A, COORDINATOR_B, JUSTIFICATION, Harness, bearer

WEB_WORLD = Path(__file__).resolve().parents[3] / "apps" / "web" / "lib" / "demo" / "mundo.json"
PEDIDO = "Preciso de pediatra amanhã à noite no Hospital Modelo Centro, urgência alta"


def _slice(text: str, span: dict | None) -> str | None:
    """Recorta por posição UTF-16, como a tela faz com `String.slice`."""
    if span is None:
        return None
    encoded = text.encode("utf-16-le")
    return encoded[span["start"] * 2 : span["end"] * 2].decode("utf-16-le")


class LeituraComOrigemTests(unittest.TestCase):
    def setUp(self):
        self.h = Harness()

    def _readings(self, text: str) -> dict[str, dict]:
        response = self.h.client.post(
            "/shifts/extract", json={"text": text}, headers=self.h.coordinator
        )
        self.assertEqual(response.status_code, 200, response.text)
        return {item["key"]: item for item in response.json()["readings"]}

    def test_cada_campo_diz_de_onde_veio_e_onde_esta_no_texto(self):
        readings = self._readings(PEDIDO)
        self.assertEqual(readings["specialty"]["origin"], "found")
        self.assertEqual(_slice(PEDIDO, readings["specialty"]["span"]), "pediatra")
        self.assertEqual(readings["unit_id"]["origin"], "found")
        self.assertEqual(_slice(PEDIDO, readings["unit_id"]["span"]), "Modelo Centro")
        # "amanhã" e "noite" são deduções: a data e o horário não estão escritos.
        self.assertEqual(readings["starts_at"]["origin"], "inferred")
        self.assertEqual(_slice(PEDIDO, readings["starts_at"]["span"]), "amanhã")
        self.assertEqual(_slice(PEDIDO, readings["ends_at"]["span"]), "noite")
        self.assertEqual(readings["urgency"]["origin"], "found")
        self.assertEqual(_slice(PEDIDO, readings["urgency"]["span"]), "urgência alta")

    def test_data_e_horas_escritas_sao_achadas(self):
        readings = self._readings("Pediatria, Modelo Sul, 12/11 19h às 7h")
        self.assertEqual(readings["starts_at"]["origin"], "found")
        self.assertEqual(readings["ends_at"]["origin"], "found")
        self.assertEqual(readings["urgency"], {"key": "urgency", "origin": "missing", "span": None})

    def test_posicao_inexata_fica_sem_trecho(self):
        # A ligadura "ﬁ" vira duas letras ao normalizar: a posição deixaria de ser exata.
        readings = self._readings("ﬁca a vaga: pediatra amanhã à noite, Modelo Norte")
        self.assertEqual(readings["specialty"]["origin"], "found")
        self.assertIsNone(readings["specialty"]["span"])

    def test_emoji_conta_como_a_tela_conta(self):
        text = "😀 pediatra amanhã à noite, Modelo Norte"
        readings = self._readings(text)
        self.assertEqual(_slice(text, readings["specialty"]["span"]), "pediatra")

    def test_campo_do_llm_que_difere_das_regras_vira_deduzido_sem_trecho(self):
        clean = sanitize_text(PEDIDO)
        reading = read_by_rules(normalize(clean), date(2026, 3, 2), {})
        rules = rules_readings(PEDIDO, clean, reading)
        llm = ShiftFields(None, "pediatria", None, None, "medium")
        mixed = llm_readings(llm, rules, reading.fields)
        self.assertEqual(mixed["specialty"], rules["specialty"])
        self.assertEqual((mixed["urgency"].origin, mixed["urgency"].span), ("inferred", None))
        self.assertEqual(mixed["unit_id"].origin, "missing")

    def test_valores_lidos_nao_mudaram(self):
        result = extract(PEDIDO, date(2026, 3, 2), {})
        self.assertEqual(result.fields.specialty, "pediatria")
        self.assertEqual(result.fields.urgency, "high")
        self.assertEqual(set(result.readings), set(result.fields.__slots__))


class RecomendacaoCompletaTests(unittest.TestCase):
    def setUp(self):
        self.h = Harness()
        shift_id = self.h.publish()
        response = self.h.client.post(
            f"/shifts/{shift_id}/recommendations", headers=self.h.coordinator
        )
        self.assertEqual(response.status_code, 201, response.text)
        self.body = response.json()

    def test_candidato_traz_contribuicoes_das_variaveis_do_ranking(self):
        for candidate in self.body["candidates"]:
            self.assertEqual(set(candidate["contributions"]), set(RANKING_FEATURES))
            self.assertIn("explanation_fallback", candidate)
        self.assertTrue(self.body["generated_at"])

    def test_exclusao_traz_evidencia_numerica_sem_dado_pessoal(self):
        with_evidence = [e for e in self.body["exclusions"] if e["evidence"]]
        self.assertTrue(with_evidence)
        for exclusion in with_evidence:
            self.assertTrue(exclusion["evidence"].endswith("."))
            self.assertNotIn("SIM-", exclusion["evidence"])

    def test_contribuicoes_e_evidencia_ficam_gravadas(self):
        saved = self.h.rest.tables["recommendations"]
        self.assertTrue(all(set(row["contributions"]) == set(RANKING_FEATURES) for row in saved))
        evidences = [row["evidence"] for row in self.h.rest.tables["recommendation_exclusions"]]
        self.assertTrue(any(evidences))


class JustificativaDaExcecaoTests(unittest.TestCase):
    def setUp(self):
        self.h = Harness()
        self.shift_id = self.h.publish()
        response = self.h.client.post(
            f"/shifts/{self.shift_id}/recommendations", headers=self.h.coordinator
        )
        candidates = response.json()["candidates"]
        self.with_alert = [c["doctor_id"] for c in candidates if c["alerts"]]
        self.without_alert = [c["doctor_id"] for c in candidates if not c["alerts"]]
        self.assertTrue(self.with_alert and self.without_alert, "a vaga de exemplo tem os dois")

    def _approve(self, doctor_ids, justification=None):
        body = {"doctor_ids": doctor_ids}
        if justification is not None:
            body["justification"] = justification
        return self.h.client.post(
            f"/shifts/{self.shift_id}/approve", json=body, headers=self.h.coordinator
        )

    def test_alerta_sem_justificativa_e_recusado_e_nada_sai(self):
        response = self._approve(self.with_alert[:1])
        self.assertEqual(response.status_code, 422)
        self.assertEqual(response.json()["erro"], "justificativa_obrigatoria")
        self.assertEqual(self.h.offers_of(self.shift_id), [])

    def test_so_dado_pessoal_nao_justifica(self):
        response = self._approve(self.with_alert[:1], "CRM 123456 tel 11 99999-8888")
        self.assertEqual(response.status_code, 422)

    def test_justificativa_vai_para_a_trilha_sem_dado_pessoal(self):
        text = "Combinado com a direção; contato 11 99999-8888 e CRM 123456"
        response = self._approve(self.with_alert[:1], text)
        self.assertEqual(response.status_code, 200, response.text)
        approval = next(
            row
            for row in self.h.rest.tables["audit_log"]
            if row["action"] == "recommendation_approved"
        )
        exception = approval["details"]["excecao"]
        self.assertTrue(exception["alertas"])
        self.assertIn("[telefone removido]", exception["justificativa"])
        self.assertIn("[CRM removido]", exception["justificativa"])
        self.assertNotIn("99999", exception["justificativa"])

    def test_sem_alerta_nao_pede_justificativa(self):
        response = self._approve(self.without_alert[:1])
        self.assertEqual(response.status_code, 200, response.text)
        approval = next(
            row
            for row in self.h.rest.tables["audit_log"]
            if row["action"] == "recommendation_approved"
        )
        self.assertNotIn("excecao", approval["details"])


class PularTests(unittest.TestCase):
    def setUp(self):
        self.h = Harness()
        self.shift_id, self.doctors = self.h.recommended()

    def _post(self, path, body, headers=None):
        return self.h.client.post(
            f"/shifts/{self.shift_id}/{path}", json=body, headers=headers or self.h.coordinator
        )

    def _rows(self, action):
        return [row for row in self.h.rest.tables["audit_log"] if row["action"] == action]

    def test_pular_tira_o_nome_sem_cancelar_a_vaga(self):
        response = self._post(
            "skip", {"doctor_id": self.doctors[0], "reason": "Ligou 11 98888-7777"}
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["skipped"], [self.doctors[0]])
        row = self._rows("recommendation_rejected")[0]
        self.assertEqual(row["entity_type"], "recommendation")
        self.assertEqual(row["entity_id"], f"{self.shift_id}:{self.doctors[0]}")
        self.assertEqual(row["details"]["rank"], 1)
        self.assertNotIn("98888", row["details"]["reason"])
        shift = next(s for s in self.h.rest.tables["shifts"] if s["id"] == self.shift_id)
        self.assertEqual(shift["status"], "open")

    def test_pular_duas_vezes_grava_uma_linha(self):
        self._post("skip", {"doctor_id": self.doctors[0]})
        self._post("skip", {"doctor_id": self.doctors[0]})
        self.assertEqual(len(self._rows("recommendation_rejected")), 1)

    def test_nome_pulado_nao_pode_ser_aprovado(self):
        self._post("skip", {"doctor_id": self.doctors[0]})
        response = self._post(
            "approve", {"doctor_ids": self.doctors[:2], "justification": JUSTIFICATION}
        )
        self.assertEqual(response.status_code, 422)
        self.assertEqual(response.json()["erro"], "medico_pulado")

    def test_desfazer_o_pulo_libera_o_nome_e_a_trilha_guarda_as_duas_linhas(self):
        self._post("skip", {"doctor_id": self.doctors[0]})
        response = self._post("unskip", {"doctor_id": self.doctors[0]})
        self.assertEqual(response.json()["skipped"], [])
        self.assertEqual(len(self._rows("recommendation_rejected")), 1)
        self.assertEqual(len(self._rows("recommendation_restored")), 1)
        self.assertEqual(self._post("unskip", {"doctor_id": self.doctors[0]}).status_code, 200)
        self.assertEqual(len(self._rows("recommendation_restored")), 1)

    def test_so_se_pula_quem_foi_recomendado(self):
        response = self._post("skip", {"doctor_id": "d0000000-0000-4000-8000-000000000099"})
        self.assertEqual(response.status_code, 422)
        self.assertEqual(response.json()["erro"], "fora_da_recomendacao")

    def test_depois_da_aprovacao_nao_se_pula(self):
        self._post("approve", {"doctor_ids": self.doctors[:2], "justification": JUSTIFICATION})
        response = self._post("skip", {"doctor_id": self.doctors[3]})
        self.assertEqual(response.status_code, 409)

    def test_outra_organizacao_nao_ve_nem_pula(self):
        other = bearer(COORDINATOR_B)
        self.assertEqual(self._post("skip", {"doctor_id": self.doctors[0]}, other).status_code, 404)
        response = self.h.client.get(f"/shifts/{self.shift_id}/decision", headers=other)
        self.assertEqual(response.status_code, 404)

    def test_feedback_vai_para_a_trilha(self):
        response = self._post(
            "feedback",
            {"doctor_id": self.doctors[1], "helpful": False, "comment": "faltou a distância"},
        )
        self.assertEqual(response.status_code, 201, response.text)
        row = self._rows("explanation_feedback")[0]
        self.assertEqual(row["details"]["helpful"], False)
        self.assertEqual(row["details"]["rank"], 2)
        self.assertEqual(row["details"]["comment"], "faltou a distância")


class EstadoDaDecisaoTests(unittest.TestCase):
    def test_antes_e_depois_da_aprovacao(self):
        h = Harness()
        shift_id, doctors = h.recommended()
        before = h.client.get(f"/shifts/{shift_id}/decision", headers=h.coordinator).json()
        self.assertIsNone(before["approved_doctor_ids"])
        h.client.post(
            f"/shifts/{shift_id}/approve",
            json={"doctor_ids": doctors[:3], "justification": JUSTIFICATION},
            headers=h.coordinator,
        )
        after = h.client.get(f"/shifts/{shift_id}/decision", headers=h.coordinator).json()
        self.assertEqual(after["approved_doctor_ids"], doctors[:3])
        self.assertEqual(after["decided_by"], COORDINATOR_A)
        self.assertTrue(after["decided_at"])


class PoliticaEFichaTests(unittest.TestCase):
    def setUp(self):
        self.h = Harness()

    def test_coordenador_le_a_politica_da_propria_organizacao(self):
        body = self.h.client.get("/policy", headers=self.h.coordinator).json()
        self.assertEqual(body["offer_ttl_minutes"], 2)  # o prazo curto dos testes
        self.assertTrue(body["simulacao"])

    def test_ficha_e_a_do_modelo_ativo(self):
        body = self.h.client.get("/model-card", headers=self.h.coordinator).json()
        self.assertEqual(body["version"], self.h.service.model_version)
        names = {item["feature"] for item in body["features_used"]}
        self.assertEqual(names, set(RANKING_FEATURES))

    def test_medico_nao_le_politica_nem_ficha(self):
        _, doctors = self.h.recommended()
        headers = self.h.doctor_headers(doctors[0])
        self.assertEqual(self.h.client.get("/policy", headers=headers).status_code, 403)
        self.assertEqual(self.h.client.get("/model-card", headers=headers).status_code, 403)

    def test_ficha_da_api_e_a_mesma_da_demonstracao(self):
        api = json.loads(MODEL_CARD_PATH.read_text(encoding="utf-8"))
        web = json.loads(WEB_WORLD.read_text(encoding="utf-8"))["fichaModelo"]
        self.assertEqual(api["version"], web["versao"])
        self.assertEqual(
            [(i["feature"], i["weight"]) for i in api["features_used"]],
            [(i["fator"], i["peso"]) for i in web["variaveisUsadas"]],
        )
        self.assertEqual(api["limits"], web["limites"])
        self.assertEqual(
            [m["value"] for m in api["metrics"]], [m["valor"] for m in web["metricas"]]
        )


class PrivacidadeTests(unittest.TestCase):
    def test_padroes_iguais_aos_da_tela(self):
        cases = {
            "ligue 11 99999-8888": "[telefone removido]",
            "CRM-SP 123.456": "[CRM removido]",
            "SIM-SP-014": "[CRM removido]",
            "fulano@exemplo.com": "[e-mail removido]",
            "123.456.789-00": "[número removido]",
            "1234567890123": "[número removido]",
        }
        for text, mark in cases.items():
            with self.subTest(text=text):
                self.assertIn(mark, remove_personal_data(text))

    def test_intervalo_de_anos_nao_e_telefone(self):
        self.assertEqual(remove_personal_data("de 2025-2026"), "de 2025-2026")

    def test_sem_marcas_sobra_o_que_foi_escrito(self):
        self.assertEqual(without_marks("[CRM removido] ok  [telefone removido]"), "ok")


if __name__ == "__main__":
    unittest.main()
