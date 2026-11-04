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

    def test_editor_do_n8n_fora_do_traefik(self):
        self.assertNotIn("traefik.", _service("n8n"))

    def test_api_insegura_do_traefik_desligada(self):
        self.assertNotIn("api.insecure", COMPOSE)

    def test_toda_imagem_tem_versao_fixa(self):
        anchors = dict(re.findall(r"&(\S+) (\S+)$", COMPOSE, re.MULTILINE))
        images = re.findall(r"^    image: (\S+)$", COMPOSE, re.MULTILINE)
        self.assertEqual(len(images), 5)
        for image in images:
            self.assertRegex(anchors.get(image.lstrip("*"), image), r":v?\d+\.\d+(\.\d+)?$")

    def test_segredo_so_por_variavel(self):
        lines = [
            line
            for line in COMPOSE.splitlines()
            if re.search(r"PASSWORD|ENCRYPTION_KEY|acme\.email", line)
            and not line.lstrip().startswith("#")
        ]
        self.assertEqual(len(lines), 4)
        for line in lines:
            self.assertIn("${", line)


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
