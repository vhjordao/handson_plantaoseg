"""A CLI e o núcleo continuam só com a biblioteca padrão: pacote de fora, só em `app/api/`."""

import ast
import sys
import unittest
from pathlib import Path

APP = Path(__file__).resolve().parents[1] / "app"
# O SDK do Gemini é opcional e só é importado dentro da função que o usa.
LAZY_OPTIONAL = {"google"}


def _modules(path: Path) -> set[str]:
    modules: set[str] = set()
    for node in ast.walk(ast.parse(path.read_text(encoding="utf-8"))):
        if isinstance(node, ast.Import):
            modules |= {alias.name.split(".")[0] for alias in node.names}
        elif isinstance(node, ast.ImportFrom) and node.level == 0 and node.module:
            modules.add(node.module.split(".")[0])
    return modules


class NucleoTests(unittest.TestCase):
    def test_nenhum_modulo_do_nucleo_importa_pacote_de_fora(self):
        allowed = set(sys.stdlib_module_names) | {"app"} | LAZY_OPTIONAL
        checked = 0
        for path in APP.rglob("*.py"):
            if "api" in path.relative_to(APP).parts:
                continue
            checked += 1
            with self.subTest(path=path.name):
                self.assertFalse(_modules(path) - allowed)
        self.assertGreater(checked, 20)

    def test_o_nucleo_nao_importa_a_api(self):
        for path in APP.rglob("*.py"):
            if "api" in path.relative_to(APP).parts:
                continue
            source = path.read_text(encoding="utf-8")
            self.assertNotIn("app.api", source, path.name)


if __name__ == "__main__":
    unittest.main()
