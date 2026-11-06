"""Sem aprovação não há oferta, e a cascata só chama quem o coordenador aprovou."""

import unittest
from unittest.mock import patch
from uuid import uuid4

from tests.api_fakes import COORDINATOR_B, JUSTIFICATION, WEBHOOK_SECRET, Harness, bearer


class SemAprovacaoNaoHaOfertaTests(unittest.TestCase):
    def setUp(self):
        self.h = Harness()

    def advance(self, shift_id, secret=WEBHOOK_SECRET):
        return self.h.client.post(
            f"/internal/cascade/{shift_id}/advance", headers=self.h.internal(secret)
        )

    def test_vaga_publicada_nao_avanca(self):
        shift_id = self.h.publish()
        response = self.advance(shift_id)
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json()["erro"], "sem_aprovacao")
        self.assertEqual(self.h.offers_of(shift_id), [])

    def test_vaga_recomendada_nao_avanca(self):
        shift_id, _ = self.h.recommended()
        for _ in range(3):
            self.assertEqual(self.advance(shift_id).status_code, 409)
        self.assertEqual(self.h.offers_of(shift_id), [])
        self.assertNotIn("offer_sent", self.h.audit_actions())

    def test_vaga_rejeitada_nao_avanca(self):
        shift_id, _ = self.h.recommended()
        self.h.client.post(f"/shifts/{shift_id}/reject", headers=self.h.coordinator)
        self.assertEqual(self.advance(shift_id).json()["action"], "nada_a_fazer")
        self.assertEqual(self.h.offers_of(shift_id), [])

    def test_aprovar_sem_recomendacao_e_recusado(self):
        shift_id = self.h.publish()
        response = self.h.client.post(
            f"/shifts/{shift_id}/approve",
            json={"doctor_ids": [str(uuid4())]},
            headers=self.h.coordinator,
        )
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json()["erro"], "sem_recomendacao")
        self.assertEqual(self.h.offers_of(shift_id), [])

    def test_aprovar_quem_nao_foi_recomendado_e_recusado(self):
        shift_id, doctors = self.h.recommended()
        outsider = next(
            row["id"] for row in self.h.rest.tables["doctors"] if row["id"] not in doctors
        )
        response = self.h.client.post(
            f"/shifts/{shift_id}/approve",
            json={"doctor_ids": [doctors[0], outsider]},
            headers=self.h.coordinator,
        )
        self.assertEqual(response.status_code, 422)
        self.assertEqual(response.json()["erro"], "fora_da_recomendacao")
        self.assertEqual(self.h.offers_of(shift_id), [])
        self.assertNotIn("recommendation_approved", self.h.audit_actions())

    def test_lista_vazia_e_repetida_sao_recusadas(self):
        shift_id, doctors = self.h.recommended()
        for ids in ([], [doctors[0], doctors[0]]):
            response = self.h.client.post(
                f"/shifts/{shift_id}/approve", json={"doctor_ids": ids}, headers=self.h.coordinator
            )
            self.assertEqual(response.status_code, 422, ids)
        self.assertEqual(self.h.offers_of(shift_id), [])

    def test_coordenador_de_outra_organizacao_nao_aprova(self):
        shift_id, doctors = self.h.recommended()
        response = self.h.client.post(
            f"/shifts/{shift_id}/approve",
            json={"doctor_ids": doctors[:1]},
            headers=bearer(COORDINATOR_B),
        )
        self.assertEqual(response.status_code, 404)
        self.assertEqual(self.h.offers_of(shift_id), [])

    def test_medico_nao_aprova(self):
        shift_id, doctors = self.h.recommended()
        response = self.h.client.post(
            f"/shifts/{shift_id}/approve",
            json={"doctor_ids": doctors[:1]},
            headers=self.h.doctor_headers(doctors[0]),
        )
        self.assertEqual(response.status_code, 403)
        self.assertEqual(self.h.offers_of(shift_id), [])

    def test_o_segredo_do_n8n_nao_aprova_nem_cria_oferta(self):
        shift_id, doctors = self.h.recommended()
        response = self.h.client.post(
            f"/shifts/{shift_id}/approve",
            json={"doctor_ids": doctors[:1]},
            headers=self.h.internal(),
        )
        self.assertEqual(response.status_code, 401)
        self.assertEqual(self.h.offers_of(shift_id), [])


class SegredoInternoTests(unittest.TestCase):
    def setUp(self):
        self.h = Harness()
        self.shift_id, _, _ = self.h.approved()

    def test_sem_segredo_ou_errado_e_401(self):
        path = f"/internal/cascade/{self.shift_id}/advance"
        self.assertEqual(self.h.client.post(path).status_code, 401)
        wrong = self.h.internal("errado")
        self.assertEqual(self.h.client.post(path, headers=wrong).status_code, 401)
        self.assertEqual(self.h.client.post(path, headers=self.h.coordinator).status_code, 401)

    def test_recarga_pede_o_segredo(self):
        self.assertEqual(self.h.client.post("/internal/reload").status_code, 401)
        response = self.h.client.post("/internal/reload", headers=self.h.internal())
        self.assertEqual(response.status_code, 200)
        self.assertGreater(response.json()["counts"]["doctors"], 0)


class CascataTests(unittest.TestCase):
    def setUp(self):
        self.h = Harness()
        self.shift_id, self.chosen, self.first = self.h.approved()

    def advance(self):
        return self.h.client.post(
            f"/internal/cascade/{self.shift_id}/advance", headers=self.h.internal()
        )

    def respond(self, offer_id, doctor_id, response, **extra):
        return self.h.client.post(
            f"/offers/{offer_id}/respond",
            json={"response": response, **extra},
            headers=self.h.doctor_headers(doctor_id),
        )

    def test_aprovar_chama_so_o_primeiro(self):
        self.assertEqual(self.first["action"], "oferta_enviada")
        self.assertEqual(self.first["shift_status"], "offered")
        offers = self.h.offers_of(self.shift_id)
        self.assertEqual(len(offers), 1)
        self.assertEqual(offers[0]["doctor_id"], self.chosen[0])
        self.assertEqual(offers[0]["sequence_no"], 1)
        self.assertEqual(offers[0]["selection_source"], "system_recommendation")
        self.assertEqual(
            self.h.audit_actions(self.shift_id),
            [
                "shift_published",
                "recommendation_generated",
                "recommendation_approved",
                "offer_sent",
            ],
        )

    def test_a_ordem_e_a_que_o_coordenador_escolheu(self):
        h = Harness()
        shift_id, doctors = h.recommended()
        chosen = [doctors[2], doctors[0]]
        step = h.client.post(
            f"/shifts/{shift_id}/approve",
            json={"doctor_ids": chosen, "justification": JUSTIFICATION},
            headers=h.coordinator,
        ).json()
        self.assertEqual(step["offer"]["doctor_id"], chosen[0])

    def test_segunda_aprovacao_e_recusada(self):
        response = self.h.client.post(
            f"/shifts/{self.shift_id}/approve",
            json={"doctor_ids": self.chosen},
            headers=self.h.coordinator,
        )
        self.assertEqual(response.status_code, 409)
        self.assertEqual(len(self.h.offers_of(self.shift_id)), 1)

    def test_antes_do_prazo_o_n8n_so_espera(self):
        for _ in range(2):
            body = self.advance().json()
            self.assertEqual(body["action"], "aguardar")
            self.assertEqual(body["offer"]["expires_at"], self.first["offer"]["expires_at"])
        self.assertEqual(len(self.h.offers_of(self.shift_id)), 1)

    def test_prazo_vencido_expira_e_chama_o_proximo(self):
        self.h.clock.forward(self.first["offer"]["ttl_minutes"])
        body = self.advance().json()
        self.assertEqual(body["action"], "oferta_enviada")
        self.assertEqual(body["offer"]["doctor_id"], self.chosen[1])
        self.assertEqual(body["offer"]["sequence_no"], 2)
        offers = self.h.offers_of(self.shift_id)
        self.assertEqual([row["response"] for row in offers], ["expired", "pending"])
        self.assertIsNone(offers[0]["responded_at"])
        self.assertIn("offer_expired", self.h.audit_actions(self.shift_id))

    def test_aceitar_fecha_a_vaga_e_para_a_cascata(self):
        response = self.respond(self.first["offer"]["id"], self.chosen[0], "accepted")
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["shift_status"], "filled")
        self.assertIsNone(body["next"])
        self.assertEqual(body["offer"]["response"], "accepted")
        self.h.clock.forward(600)
        self.assertEqual(self.advance().json()["action"], "nada_a_fazer")
        self.assertEqual(len(self.h.offers_of(self.shift_id)), 1)
        shift = next(r for r in self.h.rest.tables["shifts"] if r["id"] == self.shift_id)
        self.assertEqual(shift["status"], "filled")
        self.assertIsNotNone(shift["filled_at"])
        self.assertIn("offer_accepted", self.h.audit_actions(self.shift_id))

    def test_recusar_chama_o_proximo_na_hora(self):
        body = self.respond(
            self.first["offer"]["id"], self.chosen[0], "declined", decline_reason="distance"
        ).json()
        self.assertEqual(body["next"]["action"], "oferta_enviada")
        self.assertEqual(body["next"]["offer"]["doctor_id"], self.chosen[1])
        stored = self.h.offers_of(self.shift_id)[0]
        self.assertEqual(stored["decline_reason"], "distance")
        self.assertIn("offer_declined", self.h.audit_actions(self.shift_id))

    def test_todos_recusam_e_a_vaga_fica_descoberta(self):
        step = self.first
        for doctor_id in self.chosen:
            body = self.respond(step["offer"]["id"], doctor_id, "declined").json()
            step = body["next"]
        self.assertEqual(step["action"], "sem_candidatos")
        self.assertEqual(step["shift_status"], "uncovered")
        self.assertIn("shift_uncovered", self.h.audit_actions(self.shift_id))
        self.assertEqual(self.advance().json()["action"], "nada_a_fazer")

    def test_a_cascata_nunca_chama_quem_nao_foi_aprovado(self):
        step = self.first
        called = []
        for _ in self.chosen:
            called.append(step["offer"]["doctor_id"])
            self.h.clock.forward(step["offer"]["ttl_minutes"])
            step = self.advance().json()
        self.assertEqual(called, self.chosen)
        self.assertEqual(step["action"], "sem_candidatos")

    def test_medico_so_responde_a_propria_oferta(self):
        response = self.respond(self.first["offer"]["id"], self.chosen[1], "accepted")
        self.assertEqual(response.status_code, 404)
        self.assertEqual(self.h.offers_of(self.shift_id)[0]["response"], "pending")

    def test_oferta_vencida_nao_aceita_resposta(self):
        self.h.clock.forward(self.first["offer"]["ttl_minutes"])
        response = self.respond(self.first["offer"]["id"], self.chosen[0], "accepted")
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json()["erro"], "oferta_expirada")

    def test_responder_duas_vezes_e_recusado(self):
        offer_id = self.first["offer"]["id"]
        self.assertEqual(self.respond(offer_id, self.chosen[0], "declined").status_code, 200)
        again = self.respond(offer_id, self.chosen[0], "accepted")
        self.assertEqual(again.status_code, 409)
        self.assertEqual(again.json()["erro"], "oferta_ja_fechada")

    def test_motivo_so_vale_para_recusa_e_de_lista_fechada(self):
        offer_id = self.first["offer"]["id"]
        doctor = self.chosen[0]
        self.assertEqual(
            self.respond(offer_id, doctor, "accepted", decline_reason="distance").status_code, 422
        )
        self.assertEqual(
            self.respond(offer_id, doctor, "declined", decline_reason="pagamento").status_code, 422
        )

    def _book_elsewhere(self, doctor_id):
        """O médico ganha, por fora da cascata, um plantão no mesmo horário desta vaga."""
        other = self.h.publish()
        offer = self.h.repository.add_offer(
            shift_id=other,
            doctor_id=doctor_id,
            sequence_no=99,
            ttl_minutes=60,
            now=self.h.clock.now,
        )
        now = self.h.clock.now
        closed = self.h.repository.close_offer(offer.id, response="accepted", responded_at=now)
        self.h.clock.forward(1)
        self.h.world.put_offer(closed)

    def test_quem_ganhou_outro_plantao_nao_aceita_este(self):
        self._book_elsewhere(self.chosen[0])
        response = self.respond(self.first["offer"]["id"], self.chosen[0], "accepted")
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json()["erro"], "conflito_de_agenda")
        self.assertEqual(self.h.offers_of(self.shift_id)[0]["response"], "pending")

    def test_a_cascata_refaz_as_regras_e_pula_quem_nao_passa_mais(self):
        self._book_elsewhere(self.chosen[1])
        self.h.clock.forward(self.first["offer"]["ttl_minutes"])
        body = self.advance().json()
        self.assertEqual(body["offer"]["doctor_id"], self.chosen[2])
        self.assertEqual(body["skipped"][0]["doctor_id"], self.chosen[1])
        self.assertEqual(body["skipped"][0]["rule_code"], "schedule_conflict")

    def test_oferta_duplicada_o_banco_recusa_e_a_api_devolve_409(self):
        # Outra chamada mandou a segunda oferta logo depois de esta ler a lista.
        stale = self.h.repository.offers_of_shift(self.shift_id)
        self.h.rest.tables["offers"].append(
            {
                **self.h.offers_of(self.shift_id)[0],
                "id": str(uuid4()),
                "doctor_id": self.chosen[2],
                "sequence_no": 2,
            }
        )
        self.h.clock.forward(self.first["offer"]["ttl_minutes"])
        with patch.object(self.h.repository, "offers_of_shift", return_value=stale):
            response = self.advance()
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json()["erro"], "conflito")
        self.assertEqual(len(self.h.offers_of(self.shift_id)), 2)

    def test_a_trilha_nao_recebe_dado_pessoal(self):
        self.respond(self.first["offer"]["id"], self.chosen[0], "declined")
        for row in self.h.rest.tables["audit_log"]:
            self.assertFalse({"name", "name_sim", "crm", "crm_sim", "phone"} & set(row["details"]))


if __name__ == "__main__":
    unittest.main()
