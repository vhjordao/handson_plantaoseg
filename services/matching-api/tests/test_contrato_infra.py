"""O servidor não pode ganhar porta aberta, versão solta nem segredo escrito no Compose.

Roda sem Docker: lê os arquivos como texto. O repositório é público, e publicar uma porta passa por
cima do firewall, então estas regras valem também para os serviços que entrarem depois.
"""

import re
import unittest
from pathlib import Path

INFRA = Path(__file__).resolve().parents[3] / "infra"
COMPOSE = (INFRA / "docker-compose.yml").read_text(encoding="utf-8")
SCRIPT = (INFRA / "preparar-servidor.sh").read_text(encoding="utf-8")


def _service(name: str) -> str:
    match = re.search(rf"^  {name}:\n((?:(?:    .*)?\n)+)", COMPOSE, re.MULTILINE)
    assert match, f"serviço {name} não encontrado"
    return match.group(1)


class ComposeTests(unittest.TestCase):
    def test_so_80_443_e_o_editor_no_proprio_servidor(self):
        blocks = re.findall(r"^    ports:\n((?:      .*\n)+)", COMPOSE, re.MULTILINE)
        ports = [
            port
            for block in blocks
            for port in re.findall(r'^      - "?([^"\n]+)"?$', block, re.MULTILINE)
        ]
        self.assertEqual(sorted(ports), ["127.0.0.1:5678:5678", "443:443", "80:80"])

    def test_api_insegura_do_traefik_desligada(self):
        self.assertNotIn("api.insecure", COMPOSE)

    def test_toda_imagem_tem_versao_fixa(self):
        anchors = dict(re.findall(r"&(\S+) (\S+)$", COMPOSE, re.MULTILINE))
        images = re.findall(r"^    image: (\S+)$", COMPOSE, re.MULTILINE)
        self.assertEqual(len(images), 6)
        for image in images:
            self.assertRegex(anchors.get(image.lstrip("*"), image), r":v?\d+\.\d+(\.\d+)?$")

    def test_segredo_so_por_variavel(self):
        lines = [
            line
            for line in COMPOSE.splitlines()
            if re.search(r"PASSWORD|ENCRYPTION_KEY|acme\.email|SERVICE_ROLE|WEBHOOK_SECRET", line)
            and not line.lstrip().startswith("#")
        ]
        self.assertEqual(len(lines), 6)
        for line in lines:
            self.assertIn("${", line)


class EditorDoN8nTests(unittest.TestCase):
    """O editor abre pela web (ADR 0012), e só ele: webhook, formulário e MCP ficam por dentro."""

    def setUp(self):
        self.service = _service("n8n")

    def test_passa_pelo_traefik_com_https_e_nome_por_variavel(self):
        self.assertIn("traefik.enable=true", self.service)
        self.assertIn("routers.n8n.rule=Host(`${N8N_EDITOR_HOST:?", self.service)
        self.assertIn("routers.n8n.entrypoints=websecure", self.service)
        self.assertIn("routers.n8n.tls.certresolver=mytlschallenge", self.service)

    def test_webhook_formulario_e_mcp_ficam_fora_da_rota_publica(self):
        rule = re.search(r"routers\.n8n\.rule=(.+)", self.service).group(1)
        for path in ("/webhook", "/form", "/mcp"):
            self.assertIn(f"!PathPrefix(`{path}`)", rule)

    def test_login_tem_rota_propria_com_limite_de_tentativas(self):
        rule = re.search(r"routers\.n8n-login\.rule=(.+)", self.service).group(1)
        self.assertIn("Path(`/rest/login`)", rule)
        self.assertIn("Method(`POST`)", rule)
        self.assertIn("routers.n8n-login.middlewares=n8n-login-limite", self.service)
        self.assertRegex(self.service, r"n8n-login-limite\.ratelimit\.average=\d+")
        self.assertRegex(self.service, r"n8n-login-limite\.ratelimit\.period=\d+m")
        self.assertRegex(self.service, r"n8n-login-limite\.ratelimit\.burst=\d+")

    def test_rota_do_login_vence_a_rota_geral(self):
        # Sem prioridade explícita, a regra mais longa ganha, e a geral é mais longa que a do login.
        priority = int(re.search(r"routers\.n8n-login\.priority=(\d+)", self.service).group(1))
        general = re.search(r"routers\.n8n\.rule=(.+)", self.service).group(1)
        self.assertGreater(priority, len(general))

    def test_cookie_seguro_e_proxy_confiavel(self):
        self.assertNotIn("N8N_SECURE_COOKIE", COMPOSE)  # o padrão do n8n é cookie seguro
        self.assertIn("N8N_PROTOCOL: https", COMPOSE)
        self.assertIn('N8N_PROXY_HOPS: "1"', COMPOSE)

    def test_webhooks_seguem_por_dentro_do_servidor(self):
        self.assertIn("WEBHOOK_URL: http://n8n:5678/", COMPOSE)


class ApiDeMatchingTests(unittest.TestCase):
    def setUp(self):
        self.service = _service("matching-api")

    def test_nao_publica_porta(self):
        self.assertNotIn("ports:", self.service)

    def test_passa_pelo_traefik_com_https_e_nome_por_variavel(self):
        self.assertIn("traefik.enable=true", self.service)
        self.assertIn("Host(`${API_HOST:?", self.service)
        self.assertIn(".entrypoints=websecure", self.service)
        self.assertIn(".tls.certresolver=mytlschallenge", self.service)

    def test_rotas_internas_ficam_fora_da_internet(self):
        self.assertIn("!PathPrefix(`/internal`)", self.service)

    def test_tem_limite_de_requisicoes_e_de_tamanho_do_corpo(self):
        self.assertIn(".ratelimit.average=", self.service)
        self.assertIn(".ratelimit.burst=", self.service)
        self.assertIn(".buffering.maxRequestBodyBytes=", self.service)
        routers = re.search(r"routers\.matching-api\.middlewares=(\S+)", self.service)
        self.assertEqual(routers.group(1), "matching-api-limite,matching-api-corpo")

    def test_roda_com_o_minimo_de_privilegio(self):
        self.assertIn("read_only: true", self.service)
        self.assertIn("no-new-privileges:true", self.service)
        self.assertRegex(self.service, r"cap_drop:\n\s+- ALL")
        self.assertRegex(self.service, r"mem_limit: \d+m")

    def test_chave_de_servico_so_na_api(self):
        for other in ("traefik", "postgres", "redis", "n8n", "n8n-worker"):
            self.assertNotIn("SERVICE_ROLE", _service(other), other)
        shared = re.search(r"x-n8n-env:.*?^services:", COMPOSE, re.S | re.M).group(0)
        self.assertNotIn("SERVICE_ROLE", shared)

    def test_ip_e_nome_do_servidor_fora_do_arquivo(self):
        addresses = set(re.findall(r"\b\d{1,3}(?:\.\d{1,3}){3}\b", COMPOSE))
        self.assertLessEqual(addresses, {"127.0.0.1"})
        self.assertNotIn("hstgr", COMPOSE)

    def test_exemplo_de_ambiente_cobre_o_que_o_compose_exige(self):
        example = (INFRA.parent / ".env.example").read_text(encoding="utf-8")
        for name in re.findall(r"\$\{([A-Z0-9_]+):\?", COMPOSE):
            self.assertRegex(example, rf"(?m)^{name}=.+$", name)


class ImagemDaApiTests(unittest.TestCase):
    def setUp(self):
        self.dockerfile = (INFRA.parent / "services" / "matching-api" / "Dockerfile").read_text(
            encoding="utf-8"
        )

    def test_base_com_versao_fixa(self):
        self.assertRegex(self.dockerfile, r"(?m)^FROM python:\d+\.\d+\.\d+-slim$")

    def test_nao_roda_como_root(self):
        self.assertRegex(self.dockerfile, r"(?m)^USER \d+:\d+$")

    def test_um_unico_processo(self):
        # As travas por vaga de service.py valem dentro de um processo só.
        self.assertIn('"--workers", "1"', self.dockerfile)

    def test_dependencias_com_versao_exata(self):
        path = INFRA.parent / "services" / "matching-api" / "requirements-api.txt"
        lines = [
            line
            for line in path.read_text(encoding="utf-8").splitlines()
            if line and not line.startswith("#")
        ]
        self.assertTrue(lines)
        for line in lines:
            self.assertRegex(line, r"^[A-Za-z0-9_-]+==\d+(\.\d+)+$")


class ScriptDoServidorTests(unittest.TestCase):
    def test_nao_fecha_a_senha_sem_chave_nem_com_configuracao_invalida(self):
        self.assertLess(SCRIPT.index("authorized_keys"), SCRIPT.index("PasswordAuthentication no"))
        self.assertLess(SCRIPT.index("sshd -t"), SCRIPT.index("systemctl reload ssh"))
        self.assertIn("set -euo pipefail", SCRIPT)

    def test_firewall_so_com_as_tres_portas(self):
        self.assertIn("ufw default deny incoming", SCRIPT)
        self.assertEqual(
            re.findall(r"^ufw allow (\S+)", SCRIPT, re.MULTILINE), ["22/tcp", "80/tcp", "443/tcp"]
        )


if __name__ == "__main__":
    unittest.main()
