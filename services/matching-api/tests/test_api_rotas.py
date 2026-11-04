"""Rotas da API: quem pode o quê, o formato das respostas e o que cada chamada grava."""

import unittest
from datetime import timedelta

from app.api.tempo import local_from_db
from app.ranking.features import RANKING_FEATURES
from tests.api_fakes import (
    ADMIN_A,
    COORDINATOR_B,
    DEMO_SHIFT,
    NO_PROFILE,
    ORG_B,
    UNIT_B,
    Harness,
    bearer,
    make_token,
)

PEDIDO = (
    "Preciso de um pediatra para o plantão noturno de sexta, 19h às 7h, "
    "Hospital Modelo Centro, urgência alta"
)


class AcessoTests(unittest.TestCase):
    def setUp(self):
        self.h = Harness()

    def test_health_nao_pede_login_nem_traz_dado(self):
        response = self.h.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(set(response.json()), {"status", "model_version", "simulacao"})
        self.assertTrue(response.json()["simulacao"])

    def test_sem_token_e_401_e_avisa_o_esquema(self):
        response = self.h.client.get("/me")
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["erro"], "token_ausente")
        self.assertEqual(response.headers["www-authenticate"], "Bearer")

    def test_token_invalido_e_401(self):
        response = self.h.client.get("/me", headers={"Authorization": "Bearer nao-e-um-jwt"})
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["erro"], "token_invalido")

    def test_sem_perfil_nao_ha_acesso(self):
        for path, method in (("/me", "get"), ("/shifts/extract", "post")):
            response = self.h.client.request(
                method, path, headers=bearer(NO_PROFILE), json={"text": "x"}
            )
            self.assertEqual(response.status_code, 403, path)
            self.assertEqual(response.json()["erro"], "sem_perfil")

    def test_papel_e_organizacao_vem_do_perfil_e_nao_do_jwt(self):
        headers = bearer(
            COORDINATOR_B,
            role="admin",
            app_metadata={"role": "admin", "organization_id": "outra"},
            organization_id="outra",
        )
        body = self.h.client.get("/me", headers=headers).json()
        self.assertEqual(body["role"], "coordinator")
        self.assertEqual(body["organization_id"], ORG_B)

    def test_token_de_medico_que_se_diz_coordenador_nao_passa(self):
        doctor_id = next(iter(self.h.rest.tables["doctors"]))["id"]
        user = self.h.doctor_headers(doctor_id)["Authorization"].split()[1]
        forged = {"Authorization": f"Bearer {user}"}
        response = self.h.client.post("/shifts/extract", json={"text": PEDIDO}, headers=forged)
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()["erro"], "so_coordenador")

    def test_mudanca_de_papel_vale_na_hora(self):
        headers = bearer(ADMIN_A)
        self.assertEqual(self.h.client.get("/me", headers=headers).json()["role"], "admin")
        self.h.rest.tables["profiles"] = [
            row for row in self.h.rest.tables["profiles"] if row["id"] != ADMIN_A
        ]
        self.assertEqual(self.h.client.get("/me", headers=headers).status_code, 403)

    def test_coordenador_nao_responde_oferta(self):
        shift_id, _, step = self.h.approved()
        response = self.h.client.post(
            f"/offers/{step['offer']['id']}/respond",
            json={"response": "accepted"},
            headers=self.h.coordinator,
        )
        self.assertEqual(response.status_code, 403)
        self.assertEqual(self.h.offers_of(shift_id)[0]["response"], "pending")

    def test_documentacao_fechada_por_padrao(self):
        for path in ("/docs", "/openapi.json", "/redoc"):
            self.assertEqual(self.h.client.get(path).status_code, 404, path)

    def test_documentacao_abre_so_quando_pedida(self):
        self.assertEqual(Harness(docs=True).client.get("/openapi.json").status_code, 200)


class ExtracaoTests(unittest.TestCase):
    def setUp(self):
        self.h = Harness()

    def test_extrai_os_campos_sem_gravar_nada(self):
        response = self.h.client.post(
            "/shifts/extract", json={"text": PEDIDO}, headers=self.h.coordinator
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["extracted"]["specialty"], "pediatria")
        self.assertEqual(body["extracted"]["urgency"], "high")
        self.assertEqual(body["source"], "regras")
        self.assertEqual(body["flags"], [])
        self.assertTrue(body["simulacao"])
        self.assertFalse([call for call in self.h.rest.calls if call[0] != "select"])

    def test_so_enxerga_as_unidades_da_propria_organizacao(self):
        response = self.h.client.post(
            "/shifts/extract", json={"text": PEDIDO}, headers=bearer(COORDINATOR_B)
        )
        self.assertEqual(response.json()["extracted"]["unit_id"], UNIT_B)

    def test_campo_faltando_aparece_para_o_coordenador_completar(self):
        response = self.h.client.post(
            "/shifts/extract", json={"text": "Preciso de alguém"}, headers=self.h.coordinator
        )
        self.assertEqual(
            set(response.json()["missing_required"]),
            {"unit_id", "specialty", "starts_at", "ends_at"},
        )


class PublicacaoTests(unittest.TestCase):
    def setUp(self):
        self.h = Harness()

    def post(self, **overrides):
        return self.h.client.post(
            "/shifts", json=self.h.publish_body(**overrides), headers=self.h.coordinator
        )

    def test_publica_a_vaga_sem_chamar_ninguem(self):
        response = self.post()
        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertEqual(body["status"], "open")
        self.assertEqual(self.h.offers_of(body["id"]), [])
        self.assertEqual(self.h.audit_actions(body["id"]), ["shift_published"])
        self.assertIn("extraction_confirmed", self.h.audit_actions())

    def test_grava_periodo_e_fim_de_semana_calculados(self):
        body = self.post().json()
        self.assertEqual(body["is_weekend"], DEMO_SHIFT.starts_at.weekday() >= 5)
        self.assertEqual(body["period"], DEMO_SHIFT.period)

    def test_unidade_de_outra_organizacao_nao_existe(self):
        response = self.post(unit_id=UNIT_B)
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()["erro"], "unidade_nao_encontrada")

    def test_intervalo_invalido_e_recusado(self):
        start = DEMO_SHIFT.starts_at
        for ends in (start, start - timedelta(hours=1), start + timedelta(hours=25)):
            response = self.post(ends_at=ends.isoformat())
            self.assertEqual(response.status_code, 422, ends)

    def test_data_fora_da_janela_e_recusada(self):
        for days in (-3, 90):
            start = DEMO_SHIFT.published_at + timedelta(days=days)
            response = self.post(
                starts_at=start.isoformat(), ends_at=(start + timedelta(hours=12)).isoformat()
            )
            self.assertEqual(response.status_code, 422, days)
            self.assertEqual(response.json()["erro"], "data_fora_da_janela")

    def test_hora_com_fuso_vira_hora_local(self):
        start = DEMO_SHIFT.starts_at
        utc = (start + timedelta(hours=3)).isoformat() + "Z"
        end_utc = (DEMO_SHIFT.ends_at + timedelta(hours=3)).isoformat() + "Z"
        body = self.post(starts_at=utc, ends_at=end_utc).json()
        self.assertEqual(body["starts_at"], start.isoformat())
        stored = next(row for row in self.h.rest.tables["shifts"] if row["id"] == body["id"])
        self.assertEqual(local_from_db(stored["starts_at"]), start)

    def test_especialidade_e_urgencia_so_de_lista_fechada(self):
        self.assertEqual(self.post(specialty="cardiologia").status_code, 422)
        self.assertEqual(self.post(urgency="maxima").status_code, 422)


class RecomendacaoTests(unittest.TestCase):
    def setUp(self):
        self.h = Harness()
        self.shift_id = self.h.publish()

    def post(self, headers=None):
        return self.h.client.post(
            f"/shifts/{self.shift_id}/recommendations", headers=headers or self.h.coordinator
        )

    def test_devolve_top_5_ordenado_com_motivo_e_excluidos(self):
        response = self.post()
        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertTrue(0 < len(body["candidates"]) <= 5)
        scores = [item["score"] for item in body["candidates"]]
        self.assertEqual(scores, sorted(scores, reverse=True))
        self.assertEqual(
            [item["rank"] for item in body["candidates"]],
            list(range(1, len(body["candidates"]) + 1)),
        )
        for item in body["candidates"]:
            self.assertEqual(set(item["features"]), set(RANKING_FEATURES))
            self.assertTrue(item["explanation"]["text"])
            self.assertEqual(item["explanation"]["source"], "template")
        self.assertEqual(
            sum(body["excluded_by_rule"].values()),
            len(body["exclusions"]),
        )
        self.assertEqual(
            body["pool_size"], body["eligible_count"] + len(body["exclusions"])
        )
        self.assertTrue(body["simulacao"])

    def test_nao_envia_oferta(self):
        self.post()
        self.assertEqual(self.h.offers_of(self.shift_id), [])
        self.assertNotIn("offer_sent", self.h.audit_actions())

    def test_grava_recomendacao_explicacao_exclusao_e_trilha(self):
        body = self.post().json()
        tables = self.h.rest.tables
        self.assertEqual(len(tables["recommendations"]), len(body["candidates"]))
        self.assertEqual(len(tables["explanations"]), len(body["candidates"]))
        self.assertEqual(len(tables["recommendation_exclusions"]), len(body["exclusions"]))
        actions = self.h.audit_actions(self.shift_id)
        self.assertIn("recommendation_generated", actions)
        audit = tables["audit_log"][-1 - len(body["candidates"])]
        self.assertEqual(audit["action"], "recommendation_generated")
        self.assertEqual(audit["entity_id"], self.shift_id)
        self.assertEqual(audit["model_version"], body["model_version"])

    def test_segunda_recomendacao_e_recusada_sem_duplicar(self):
        first = self.post().json()
        response = self.post()
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json()["erro"], "ja_recomendada")
        self.assertEqual(
            len(self.h.rest.tables["recommendations"]), len(first["candidates"])
        )

    def test_vaga_de_outra_organizacao_nao_existe(self):
        response = self.post(bearer(COORDINATOR_B))
        self.assertEqual(response.status_code, 404)
        self.assertEqual(self.h.rest.tables["recommendations"], [])

    def test_id_que_nao_e_uuid_nao_chega_no_banco(self):
        before = len(self.h.rest.calls)
        response = self.h.client.post(
            "/shifts/1;drop table shifts/recommendations", headers=self.h.coordinator
        )
        self.assertIn(response.status_code, (404, 422))
        self.assertFalse(
            [call for call in self.h.rest.calls[before:] if call[1] != "profiles"],
            "só a leitura do perfil pode ter acontecido",
        )


class SemElegiveisTests(unittest.TestCase):
    def setUp(self):
        self.h = Harness()
        for row in self.h.rest.tables["doctors"]:
            row["crm_status"] = "suspended"
        self.h.world.load()
        self.shift_id = self.h.publish()

    def post(self):
        return self.h.client.post(
            f"/shifts/{self.shift_id}/recommendations", headers=self.h.coordinator
        )

    def test_nenhum_elegivel_responde_lista_vazia_com_a_regra(self):
        body = self.post().json()
        self.assertEqual(body["candidates"], [])
        self.assertEqual(body["eligible_count"], 0)
        self.assertEqual(set(body["excluded_by_rule"]), {"crm_inactive"})

    def test_repetir_nao_duplica_as_exclusoes(self):
        first = self.post().json()
        again = self.post()
        self.assertEqual(again.status_code, 409)
        self.assertEqual(again.json()["erro"], "ja_recomendada")
        self.assertEqual(
            len(self.h.rest.tables["recommendation_exclusions"]), len(first["exclusions"])
        )

    def test_sem_recomendados_nao_ha_o_que_aprovar(self):
        self.post()
        response = self.h.client.post(
            f"/shifts/{self.shift_id}/approve",
            json={"doctor_ids": [self.h.rest.tables["doctors"][0]["id"]]},
            headers=self.h.coordinator,
        )
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json()["erro"], "sem_recomendacao")
        self.assertEqual(self.h.offers_of(self.shift_id), [])


class SemPoliticaTests(unittest.TestCase):
    def test_organizacao_sem_politica_recebe_409_e_nao_500(self):
        h = Harness()
        shift_id = h.publish()
        organization = h.rest.tables["policy_config"][0]["organization_id"]
        h.world._current().policies.pop(organization)
        response = h.client.post(f"/shifts/{shift_id}/recommendations", headers=h.coordinator)
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json()["erro"], "sem_politica")


class RejeicaoTests(unittest.TestCase):
    def test_rejeitar_cancela_a_vaga_e_nao_chama_ninguem(self):
        h = Harness()
        shift_id, _ = h.recommended()
        response = h.client.post(f"/shifts/{shift_id}/reject", headers=h.coordinator)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["shift_status"], "cancelled")
        self.assertEqual(h.offers_of(shift_id), [])
        self.assertIn("recommendation_rejected", h.audit_actions(shift_id))
        again = h.client.post(f"/shifts/{shift_id}/reject", headers=h.coordinator)
        self.assertEqual(again.status_code, 409)


class ErrosTests(unittest.TestCase):
    def test_banco_fora_do_ar_vira_502_sem_detalhe(self):
        h = Harness()
        shift_id = h.publish()
        token = make_token(COORDINATOR_B)
        h.rest.down = True
        response = h.client.post(
            f"/shifts/{shift_id}/recommendations",
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(response.status_code, 502)
        self.assertEqual(response.json()["erro"], "banco_indisponivel")
        self.assertNotIn("supabase", response.text.lower())


class CorsTests(unittest.TestCase):
    def preflight(self, harness, origin):
        return harness.client.options(
            "/me",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "Authorization",
            },
        )

    def test_so_a_origem_listada_recebe_permissao(self):
        h = Harness(cors=("https://web.exemplo.invalid",))
        allowed = self.preflight(h, "https://web.exemplo.invalid")
        self.assertEqual(
            allowed.headers["access-control-allow-origin"], "https://web.exemplo.invalid"
        )
        denied = self.preflight(h, "https://outro.exemplo.invalid")
        self.assertNotIn("access-control-allow-origin", denied.headers)

    def test_sem_lista_ninguem_recebe_permissao(self):
        response = self.preflight(Harness(), "https://web.exemplo.invalid")
        self.assertNotIn("access-control-allow-origin", response.headers)


if __name__ == "__main__":
    unittest.main()
