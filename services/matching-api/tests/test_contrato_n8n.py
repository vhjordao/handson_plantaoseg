"""O workflow da cascata só espera e pergunta à API: quem decide é ela (ADR 0013).

Roda sem n8n, lendo o arquivo. O repositório é público, então o workflow e o script de publicação
também não podem trazer segredo nem o nome do servidor.
"""

import json
import re
import typing
import unittest
from pathlib import Path

from app.api.schemas import AdvanceOut

RAIZ = Path(__file__).resolve().parents[3]
TEXTO = (RAIZ / "n8n" / "workflows" / "cascata-de-ofertas.json").read_text(encoding="utf-8")
WORKFLOW = json.loads(TEXTO)
NOS = {no["name"]: no for no in WORKFLOW["nodes"]}
COMPOSE = (RAIZ / "infra" / "docker-compose.yml").read_text(encoding="utf-8")
SCRIPT = (RAIZ / "n8n" / "publicar.sh").read_text(encoding="utf-8")

# Só o que espera, pergunta e encaminha. Código, LLM e banco ficam de fora: aí o n8n decidiria.
TIPOS_PERMITIDOS = {
    "n8n-nodes-base.httpRequest",
    "n8n-nodes-base.noOp",
    "n8n-nodes-base.set",
    "n8n-nodes-base.stickyNote",
    "n8n-nodes-base.stopAndError",
    "n8n-nodes-base.switch",
    "n8n-nodes-base.wait",
    "n8n-nodes-base.webhook",
}


def _do_tipo(tipo: str) -> list[dict]:
    return [no for no in WORKFLOW["nodes"] if no["type"] == f"n8n-nodes-base.{tipo}"]


def _destinos(origem: str) -> list[list[str]]:
    return [[d["node"] for d in saida] for saida in WORKFLOW["connections"][origem]["main"]]


class WorkflowTests(unittest.TestCase):
    def test_so_tem_nos_que_esperam_e_perguntam(self):
        self.assertLessEqual({no["type"] for no in WORKFLOW["nodes"]}, TIPOS_PERMITIDOS)

    def test_a_entrada_pede_o_segredo(self):
        webhook = _do_tipo("webhook")[0]
        self.assertEqual(webhook["parameters"]["httpMethod"], "POST")
        self.assertEqual(webhook["parameters"]["authentication"], "headerAuth")
        self.assertEqual(webhook["credentials"]["httpHeaderAuth"]["id"], "segredoInterno01")

    def test_o_endereco_do_compose_e_o_caminho_do_workflow(self):
        caminho = _do_tipo("webhook")[0]["parameters"]["path"]
        self.assertIn(f"N8N_CASCADE_URL: http://n8n:5678/webhook/{caminho}\n", COMPOSE)

    def test_so_chama_a_rota_de_avancar_por_dentro_do_servidor(self):
        chamadas = _do_tipo("httpRequest")
        self.assertEqual(len(chamadas), 1)
        parametros = chamadas[0]["parameters"]
        self.assertEqual(parametros["method"], "POST")
        self.assertEqual(
            parametros["url"],
            "=http://matching-api:8000/internal/cascade/{{ $json.shift_id }}/advance",
        )
        self.assertEqual(chamadas[0]["credentials"]["httpHeaderAuth"]["id"], "segredoInterno01")

    def test_toda_acao_da_api_tem_destino(self):
        acoes = typing.get_args(AdvanceOut.model_fields["action"].annotation)
        regras = _do_tipo("switch")[0]["parameters"]["rules"]["values"]
        tratadas = [c["rightValue"] for regra in regras for c in regra["conditions"]["conditions"]]
        self.assertEqual(sorted(tratadas), sorted(acoes))

    def test_o_laco_volta_para_a_api_e_termina(self):
        self.assertEqual(_destinos("Aviso da API"), [["Vaga"]])
        self.assertEqual(_destinos("Vaga"), [["Pedir para avançar"]])
        self.assertEqual(_destinos("Pedir para avançar"), [["O que a API decidiu"]])
        self.assertEqual(
            _destinos("O que a API decidiu"),
            [["Esperar o prazo"], ["Fim da cascata"], ["Ação desconhecida"]],
        )
        self.assertEqual(_destinos("Esperar o prazo"), [["Pedir para avançar"]])

    def test_a_saida_certa_de_cada_acao(self):
        regras = _do_tipo("switch")[0]["parameters"]["rules"]["values"]
        esperar, acabou = (
            {c["rightValue"] for c in regra["conditions"]["conditions"]} for regra in regras
        )
        self.assertEqual(esperar, {"aguardar", "oferta_enviada"})
        self.assertEqual(acabou, {"sem_candidatos", "nada_a_fazer"})
        for regra in regras:
            self.assertEqual(regra["conditions"]["combinator"], "or")

    def test_o_prazo_vem_da_api_no_fuso_dela(self):
        espera = _do_tipo("wait")[0]["parameters"]
        self.assertEqual(espera["unit"], "seconds")
        self.assertIn("$json.offer.expires_at", espera["amount"])
        self.assertIn("America/Sao_Paulo", espera["amount"])

    def test_acao_desconhecida_vira_erro_visivel(self):
        self.assertEqual(
            _do_tipo("switch")[0]["parameters"]["options"]["fallbackOutput"], "extra"
        )
        self.assertEqual(NOS["Ação desconhecida"]["type"], "n8n-nodes-base.stopAndError")

    def test_sem_segredo_nem_nome_do_servidor(self):
        self.assertNotIn("hstgr", TEXTO)
        self.assertIsNone(re.search(r"\b[0-9a-f]{32,}\b", TEXTO))
        self.assertEqual(re.findall(r"\b\d{1,3}(?:\.\d{1,3}){3}\b", TEXTO), [])
        for no in WORKFLOW["nodes"]:
            for credencial in no.get("credentials", {}).values():
                self.assertEqual(set(credencial), {"id", "name"})

    def test_o_arquivo_nasce_despublicado(self):
        # Publicar é um passo à parte: importar não pode, sozinho, ligar nada no servidor.
        self.assertFalse(WORKFLOW["active"])


class ScriptDePublicacaoTests(unittest.TestCase):
    def test_para_no_primeiro_erro_e_nao_mostra_os_comandos(self):
        self.assertIn("set -euo pipefail", SCRIPT)
        self.assertIsNone(re.search(r"(?m)^\s*set -[a-z]*x", SCRIPT))

    def test_os_ids_batem_com_o_workflow(self):
        self.assertIn(f'WORKFLOW_ID="{WORKFLOW["id"]}"', SCRIPT)
        self.assertIn('CREDENCIAL_ID="segredoInterno01"', SCRIPT)

    def test_o_segredo_vem_do_env_e_o_arquivo_temporario_sai(self):
        self.assertIn('line.startswith("N8N_WEBHOOK_SECRET=")', SCRIPT)
        self.assertIn("umask 077", SCRIPT)
        self.assertIn("trap limpar EXIT", SCRIPT)
        self.assertNotRegex(SCRIPT, r"echo .*(secret|SECRET)")
        self.assertNotRegex(SCRIPT, r"print\(.*secret")

    def test_publica_e_reinicia_na_ordem(self):
        passos = ["import:credentials", "import:workflow", "publish:workflow", "compose restart"]
        posicoes = [SCRIPT.index(passo) for passo in passos]
        self.assertEqual(posicoes, sorted(posicoes))


if __name__ == "__main__":
    unittest.main()
