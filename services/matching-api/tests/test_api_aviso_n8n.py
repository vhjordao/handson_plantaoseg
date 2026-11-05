"""O n8n sabe que a cascata começou, uma vez por vaga, e o aviso nunca atrapalha o clique."""

import json
import logging
import unittest

import httpx

from app.api.main import notifier_from
from app.api.notifier import ATTEMPTS, CascadeNotifier
from app.api.settings import ConfigError, Settings
from tests.api_fakes import WEBHOOK_SECRET, Harness

URL = "http://n8n.invalid:5678/webhook/cascata-ofertas"
SHIFT_ID = "11111111-1111-4111-8111-111111111111"


class NotifierFalso:
    def __init__(self, resultado: bool = True) -> None:
        self.vagas: list[str] = []
        self.resultado = resultado

    def cascade_started(self, shift_id: str) -> bool:
        self.vagas.append(shift_id)
        return self.resultado


class AvisoNaAprovacaoTests(unittest.TestCase):
    def setUp(self):
        self.notifier = NotifierFalso()
        self.h = Harness(notifier=self.notifier)

    def respond(self, offer_id, doctor_id, response):
        return self.h.client.post(
            f"/offers/{offer_id}/respond",
            json={"response": response},
            headers=self.h.doctor_headers(doctor_id),
        )

    def test_aprovar_avisa_uma_vez_com_o_id_da_vaga(self):
        shift_id, _, first = self.h.approved()
        self.assertEqual(first["action"], "oferta_enviada")
        self.assertEqual(self.notifier.vagas, [shift_id])

    def test_publicar_e_recomendar_nao_avisam(self):
        self.h.recommended()
        self.assertEqual(self.notifier.vagas, [])

    def test_rejeitar_nao_avisa(self):
        shift_id, _ = self.h.recommended()
        self.h.client.post(f"/shifts/{shift_id}/reject", headers=self.h.coordinator)
        self.assertEqual(self.notifier.vagas, [])

    def test_aprovacao_recusada_nao_avisa(self):
        shift_id, _ = self.h.recommended()
        response = self.h.client.post(
            f"/shifts/{shift_id}/approve",
            json={"doctor_ids": ["22222222-2222-4222-8222-222222222222"]},
            headers=self.h.coordinator,
        )
        self.assertEqual(response.status_code, 422)
        self.assertEqual(self.notifier.vagas, [])

    def test_segunda_aprovacao_nao_avisa_de_novo(self):
        shift_id, chosen, _ = self.h.approved()
        response = self.h.client.post(
            f"/shifts/{shift_id}/approve", json={"doctor_ids": chosen}, headers=self.h.coordinator
        )
        self.assertEqual(response.status_code, 409)
        self.assertEqual(self.notifier.vagas, [shift_id])

    def test_a_cascata_nao_avisa_de_novo(self):
        """O laço do n8n pergunta à API: recusa e prazo vencido não geram outro aviso."""
        shift_id, chosen, first = self.h.approved()
        declined = self.respond(first["offer"]["id"], chosen[0], "declined").json()
        self.h.clock.forward(declined["next"]["offer"]["ttl_minutes"])
        advanced = self.h.client.post(
            f"/internal/cascade/{shift_id}/advance", headers=self.h.internal()
        )
        self.assertEqual(advanced.json()["action"], "oferta_enviada")
        self.assertEqual(self.notifier.vagas, [shift_id])

    def test_sem_oferta_nao_ha_laco_para_comecar(self):
        shift_id, doctors = self.h.recommended()
        other = self.h.publish()
        offer = self.h.repository.add_offer(
            shift_id=other,
            doctor_id=doctors[0],
            sequence_no=99,
            ttl_minutes=60,
            now=self.h.clock.now,
        )
        closed = self.h.repository.close_offer(
            offer.id, response="accepted", responded_at=self.h.clock.now
        )
        self.h.clock.forward(1)
        self.h.world.put_offer(closed)
        response = self.h.client.post(
            f"/shifts/{shift_id}/approve",
            json={"doctor_ids": doctors[:1]},
            headers=self.h.coordinator,
        )
        self.assertEqual(response.json()["action"], "sem_candidatos")
        self.assertEqual(self.notifier.vagas, [])

    def test_aviso_que_falha_nao_derruba_a_aprovacao(self):
        h = Harness(notifier=NotifierFalso(resultado=False))
        shift_id, _, first = h.approved()
        self.assertEqual(first["action"], "oferta_enviada")
        self.assertEqual(len(h.offers_of(shift_id)), 1)

    def test_sem_notifier_a_aprovacao_funciona(self):
        h = Harness()
        _, _, first = h.approved()
        self.assertEqual(first["action"], "oferta_enviada")


class CascadeNotifierTests(unittest.TestCase):
    def notifier(self, handler):
        self.pausas = []
        self.chamadas = []

        def registrar(request):
            self.chamadas.append(request)
            return handler(request)

        return CascadeNotifier(
            URL,
            WEBHOOK_SECRET,
            transport=httpx.MockTransport(registrar),
            sleep=self.pausas.append,
        )

    def test_manda_so_o_id_da_vaga_com_o_segredo(self):
        self.assertTrue(
            self.notifier(lambda _: httpx.Response(200)).cascade_started(SHIFT_ID)
        )
        self.assertEqual(len(self.chamadas), 1)
        request = self.chamadas[0]
        self.assertEqual(request.method, "POST")
        self.assertEqual(str(request.url), URL)
        self.assertEqual(request.headers["x-internal-secret"], WEBHOOK_SECRET)
        self.assertEqual(json.loads(request.content), {"shift_id": SHIFT_ID})
        self.assertEqual(self.pausas, [])

    def test_tenta_de_novo_e_para_quando_o_n8n_responde(self):
        respostas = iter([httpx.Response(503), httpx.Response(200)])
        self.assertTrue(self.notifier(lambda _: next(respostas)).cascade_started(SHIFT_ID))
        self.assertEqual(len(self.chamadas), 2)
        self.assertEqual(len(self.pausas), 1)

    def test_n8n_fora_nao_levanta_erro_e_fica_no_log_sem_o_segredo(self):
        def recusa(request):
            raise httpx.ConnectError("sem conexão", request=request)

        notifier = self.notifier(recusa)
        with self.assertLogs("matching_api", level=logging.WARNING) as logs:
            self.assertFalse(notifier.cascade_started(SHIFT_ID))
        self.assertEqual(len(self.chamadas), ATTEMPTS)
        self.assertEqual(len(self.pausas), ATTEMPTS - 1)
        texto = "\n".join(logs.output)
        self.assertIn(SHIFT_ID, texto)
        self.assertNotIn(WEBHOOK_SECRET, texto)

    def test_workflow_despublicado_conta_como_falha(self):
        self.assertFalse(self.notifier(lambda _: httpx.Response(404)).cascade_started(SHIFT_ID))
        self.assertEqual(len(self.chamadas), ATTEMPTS)

    def test_a_rota_de_aprovacao_chega_ate_o_n8n(self):
        h = Harness(notifier=self.notifier(lambda _: httpx.Response(200)))
        shift_id, _, _ = h.approved()
        self.assertEqual(json.loads(self.chamadas[0].content), {"shift_id": shift_id})


class ConfiguracaoTests(unittest.TestCase):
    GOOD = {
        "SUPABASE_URL": "https://teste.supabase.invalid",
        "SUPABASE_SERVICE_ROLE_KEY": "chave",
        "N8N_WEBHOOK_SECRET": "a" * 32,
    }

    def test_sem_endereco_a_api_sobe_sem_avisar(self):
        settings = Settings.from_env(self.GOOD)
        self.assertEqual(settings.cascade_url, "")
        with self.assertLogs("matching_api", level=logging.WARNING):
            self.assertIsNone(notifier_from(settings))

    def test_com_endereco_cria_o_notifier(self):
        settings = Settings.from_env({**self.GOOD, "N8N_CASCADE_URL": URL})
        self.assertEqual(settings.cascade_url, URL)
        self.assertIsInstance(notifier_from(settings), CascadeNotifier)

    def test_endereco_que_nao_e_http_nao_sobe(self):
        with self.assertRaises(ConfigError):
            Settings.from_env({**self.GOOD, "N8N_CASCADE_URL": "n8n:5678/webhook"})


if __name__ == "__main__":
    unittest.main()
