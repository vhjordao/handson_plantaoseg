"""O cliente da API REST do Supabase, com um transporte falso: nenhuma chamada sai da máquina."""

import json
import unittest

import httpx

from app.api.rest import PAGE_SIZE, RestConflict, RestError, SupabaseRest

BASE = "https://teste.supabase.invalid/rest/v1"
KEY = "sb_secret_chave_de_teste"


def client(handler, key=KEY):
    return SupabaseRest(BASE, key, transport=httpx.MockTransport(handler))


class SelectTests(unittest.TestCase):
    def test_lista_as_colunas_e_manda_a_chave(self):
        seen = {}

        def handler(request):
            seen["url"] = request.url
            seen["headers"] = request.headers
            return httpx.Response(200, json=[{"id": "1"}])

        rows = client(handler).select("units", ("id", "name"), filters={"id": "eq.1"}, limit=1)
        self.assertEqual(rows, [{"id": "1"}])
        self.assertEqual(seen["url"].params["select"], "id,name")
        self.assertEqual(seen["url"].params["id"], "eq.1")
        self.assertEqual(seen["headers"]["apikey"], KEY)
        self.assertNotIn("authorization", seen["headers"])

    def test_chave_antiga_em_jwt_tambem_vai_no_cabecalho_de_autorizacao(self):
        seen = {}

        def handler(request):
            seen["auth"] = request.headers.get("authorization")
            return httpx.Response(200, json=[])

        client(handler, key="eyJ.falso.teste").select("units", ("id",))
        self.assertEqual(seen["auth"], "Bearer eyJ.falso.teste")

    def test_select_estrela_nem_sai_da_maquina(self):
        def handler(request):
            raise AssertionError("não devia ter chamado")

        for columns in (("*",), (), ("id", "*"), ("doctors(*)",)):
            with self.subTest(columns=columns), self.assertRaises(ValueError):
                client(handler).select("units", columns)

    def test_tabela_do_valor_do_plantao_nem_sai_da_maquina(self):
        def handler(request):
            raise AssertionError("não devia ter chamado")

        rest = client(handler)
        with self.assertRaises(ValueError):
            rest.select("shift_compensation", ("amount_brl_sim",))
        with self.assertRaises(ValueError):
            rest.insert("shift_compensation", [{"amount_brl_sim": 1}])
        with self.assertRaises(ValueError):
            rest.update(
                "shift_compensation",
                {"amount_brl_sim": 1},
                filters={"shift_id": "eq.1"},
                returning=("shift_id",),
            )

    def test_le_todas_as_paginas(self):
        total = PAGE_SIZE * 2 + 7
        offsets = []

        def handler(request):
            offset = int(request.url.params["offset"])
            limit = int(request.url.params["limit"])
            offsets.append(offset)
            size = max(0, min(limit, total - offset))
            return httpx.Response(200, json=[{"id": offset + i} for i in range(size)])

        rows = client(handler).select("offers", ("id",))
        self.assertEqual(len(rows), total)
        self.assertEqual(rows[-1]["id"], total - 1)
        self.assertEqual(offsets, [0, PAGE_SIZE, PAGE_SIZE * 2])

    def test_ordena_para_a_paginacao_ser_estavel(self):
        orders = []

        def handler(request):
            orders.append(request.url.params["order"])
            return httpx.Response(200, json=[])

        client(handler).select("offers", ("id", "sent_at"))
        client(handler).select("offers", ("id", "sent_at"), order="sent_at")
        self.assertEqual(orders, ["id", "sent_at"])

    def test_para_quando_a_ultima_pagina_vem_cheia_com_limite(self):
        calls = []

        def handler(request):
            calls.append(request.url.params["limit"])
            return httpx.Response(200, json=[{"id": 1}])

        self.assertEqual(len(client(handler).select("units", ("id",), limit=1)), 1)
        self.assertEqual(calls, ["1"])


class EscritaTests(unittest.TestCase):
    def test_insert_sem_retorno_pede_resposta_minima(self):
        seen = {}

        def handler(request):
            seen["prefer"] = request.headers["prefer"]
            seen["body"] = json.loads(request.content)
            return httpx.Response(201)

        result = client(handler).insert("audit_log", [{"action": "x"}, {"action": "y"}])
        self.assertEqual(result, [])
        self.assertEqual(seen["prefer"], "return=minimal")
        self.assertEqual(len(seen["body"]), 2)

    def test_insert_com_retorno_lista_as_colunas(self):
        seen = {}

        def handler(request):
            seen["select"] = request.url.params["select"]
            seen["prefer"] = request.headers["prefer"]
            return httpx.Response(201, json=[{"id": "1"}])

        rows = client(handler).insert("offers", [{"a": 1}], returning=("id",))
        self.assertEqual(rows, [{"id": "1"}])
        self.assertEqual(seen, {"select": "id", "prefer": "return=representation"})

    def test_insert_vazio_nao_chama_o_banco(self):
        def handler(request):
            raise AssertionError("não devia ter chamado")

        self.assertEqual(client(handler).insert("offers", []), [])

    def test_update_sem_filtro_e_recusado(self):
        def handler(request):
            raise AssertionError("não devia ter chamado")

        with self.assertRaises(ValueError):
            client(handler).update("shifts", {"status": "filled"}, filters={}, returning=("id",))

    def test_update_manda_o_filtro(self):
        seen = {}

        def handler(request):
            seen["method"] = request.method
            seen["id"] = request.url.params["id"]
            seen["response"] = request.url.params["response"]
            return httpx.Response(200, json=[])

        rows = client(handler).update(
            "offers",
            {"response": "accepted"},
            filters={"id": "eq.1", "response": "eq.pending"},
            returning=("id",),
        )
        self.assertEqual(rows, [])
        self.assertEqual(seen, {"method": "PATCH", "id": "eq.1", "response": "eq.pending"})


class ErrosTests(unittest.TestCase):
    def test_unicidade_vira_conflito(self):
        def handler(request):
            return httpx.Response(409, json={"code": "23505", "message": "duplicate key"})

        with self.assertRaises(RestConflict):
            client(handler).insert("offers", [{"a": 1}])

    def test_outra_recusa_vira_erro_sem_o_detalhe_do_banco(self):
        def handler(request):
            return httpx.Response(400, json={"code": "23514", "message": "SIM-SP-000001 recusado"})

        with self.assertRaises(RestError) as caught:
            client(handler).insert("offers", [{"a": 1}])
        self.assertEqual(caught.exception.status, 400)
        self.assertEqual(caught.exception.code, "23514")
        self.assertNotIn("SIM-SP", str(caught.exception))

    def test_resposta_sem_json_tambem_vira_erro(self):
        def handler(request):
            return httpx.Response(500, text="<html>falhou</html>")

        with self.assertRaises(RestError):
            client(handler).select("units", ("id",))

    def test_falha_de_rede_vira_erro_sem_a_chave(self):
        def handler(request):
            raise httpx.ConnectError("sem rede", request=request)

        with self.assertRaises(RestError) as caught:
            client(handler).select("units", ("id",))
        self.assertEqual(caught.exception.status, 503)
        self.assertNotIn(KEY, str(caught.exception))


if __name__ == "__main__":
    unittest.main()
