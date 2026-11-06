"""Contestação (D8, ADR 0015): o médico contesta a própria oferta, e o coordenador responde."""

import unittest

from tests.api_fakes import COORDINATOR_A, COORDINATOR_B, Harness, bearer


class ContestacaoTests(unittest.TestCase):
    def setUp(self):
        self.h = Harness()
        self.shift_id, self.chosen, step = self.h.approved()
        self.offer_id = step["offer"]["id"]
        self.doctor = self.h.doctor_headers(step["offer"]["doctor_id"])

    def _contest(self, body=None, headers=None, offer_id=None):
        return self.h.client.post(
            f"/offers/{offer_id or self.offer_id}/contest",
            json=body or {"reason": "unfair_order", "text": "Moro mais perto do que aparece"},
            headers=headers or self.doctor,
        )

    def _answer(self, contestation_id, text="Revisamos: a distância está correta.", headers=None):
        return self.h.client.post(
            f"/contestations/{contestation_id}/answer",
            json={"text": text},
            headers=headers or self.h.coordinator,
        )

    def _audit(self, action):
        return [row for row in self.h.rest.tables["audit_log"] if row["action"] == action]

    def test_medico_contesta_a_propria_oferta(self):
        response = self._contest()
        self.assertEqual(response.status_code, 201, response.text)
        body = response.json()
        self.assertTrue(body["protocol"].startswith("CT-"))
        self.assertEqual(body["status"], "open")
        self.assertEqual(body["shift_id"], self.shift_id)
        row = self._audit("contestation_opened")[0]
        self.assertEqual(row["actor_role"], "doctor")
        self.assertEqual(row["details"]["reason"], "unfair_order")
        self.assertNotIn("text", row["details"], "o texto fica na tabela, não na trilha")

    def test_texto_vai_sem_dado_pessoal(self):
        body = {"reason": "wrong_data", "text": "Meu CRM 123456 está ativo; ligue 11 98888-7777"}
        saved = self._contest(body).json()["text"]
        self.assertIn("[CRM removido]", saved)
        self.assertNotIn("98888", saved)

    def test_so_dado_pessoal_nao_e_contestacao(self):
        response = self._contest({"reason": "other", "text": "11 98888-7777"})
        self.assertEqual(response.status_code, 422)
        self.assertEqual(response.json()["erro"], "texto_obrigatorio")

    def test_uma_contestacao_por_oferta(self):
        self._contest()
        response = self._contest()
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json()["erro"], "ja_contestada")
        self.assertEqual(len(self.h.rest.tables["contestations"]), 1)

    def test_outro_medico_nao_contesta_a_oferta_de_alguem(self):
        other = self.h.doctor_headers(self.chosen[-1])
        self.assertEqual(self._contest(headers=other).status_code, 404)

    def test_coordenador_nao_contesta(self):
        response = self._contest(headers=self.h.coordinator)
        self.assertEqual(response.status_code, 403)

    def test_motivo_fora_da_lista_e_recusado(self):
        response = self._contest({"reason": "porque_sim", "text": "Texto"})
        self.assertEqual(response.status_code, 422)

    def test_coordenador_responde_e_a_trilha_registra(self):
        contestation = self._contest().json()
        response = self._answer(contestation["id"])
        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertEqual(body["status"], "answered")
        self.assertEqual(body["answered_by"], COORDINATOR_A)
        self.assertTrue(body["answered_at"])
        row = self._audit("contestation_answered")[0]
        self.assertEqual(row["entity_id"], contestation["id"])
        self.assertEqual(row["details"]["protocol"], contestation["protocol"])

    def test_nao_se_responde_duas_vezes(self):
        contestation = self._contest().json()
        self._answer(contestation["id"])
        response = self._answer(contestation["id"], "Outra resposta")
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json()["erro"], "ja_respondida")

    def test_outra_organizacao_nao_responde(self):
        contestation = self._contest().json()
        response = self._answer(contestation["id"], headers=bearer(COORDINATOR_B))
        self.assertEqual(response.status_code, 404)

    def test_medico_nao_responde(self):
        contestation = self._contest().json()
        self.assertEqual(self._answer(contestation["id"], headers=self.doctor).status_code, 403)


if __name__ == "__main__":
    unittest.main()
