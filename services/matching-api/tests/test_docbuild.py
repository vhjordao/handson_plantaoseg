"""Conversor de Markdown para HTML imprimível."""

import tempfile
import unittest
from pathlib import Path

from app.docbuild import REPO_URL, inline, render

SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect width="1" height="1"/></svg>'


class InlineTests(unittest.TestCase):
    def test_negrito_italico_e_codigo(self):
        self.assertEqual(
            inline("**forte**, *ênfase* e `x < y`"),
            "<strong>forte</strong>, <em>ênfase</em> e <code>x &lt; y</code>",
        )

    def test_html_e_escapado(self):
        self.assertEqual(inline("a <b> & c"), "a &lt;b&gt; &amp; c")

    def test_asterisco_de_multiplicacao_nao_vira_italico(self):
        self.assertNotIn("<em>", inline("peso * z e outro * valor"))

    def test_link_relativo_vira_link_do_github(self):
        html = inline("[dicionário](dados/dicionario-de-dados.md#x)")
        self.assertIn(f'href="{REPO_URL}docs/dados/dicionario-de-dados.md#x"', html)
        self.assertIn(f'href="{REPO_URL}services/x.py"', inline("[a](../services/x.py)"))

    def test_link_externo_e_ancora_ficam_como_estao(self):
        self.assertIn('href="https://exemplo.com/a"', inline("[x](https://exemplo.com/a)"))
        self.assertIn('href="#secao"', inline("[x](#secao)"))


class BlocosTests(unittest.TestCase):
    def doc(self, markdown: str, files: dict[str, str] | None = None) -> str:
        with tempfile.TemporaryDirectory() as tmp:
            for name, content in (files or {}).items():
                (Path(tmp) / name).write_text(content, encoding="utf-8")
            return render(markdown, Path(tmp))

    def test_titulo_define_o_title_da_pagina(self):
        html = self.doc("# Meu documento\n\n## Seção\n\nTexto.")
        self.assertIn("<title>Meu documento</title>", html)
        self.assertIn("<h2>Seção</h2>", html)

    def test_tabela_com_alinhamento(self):
        html = self.doc("| A | B |\n| --- | ---: |\n| x | 1 |")
        self.assertIn("<th", html)
        self.assertIn('style="text-align:right">1</td>', html)

    def test_listas_ordenada_e_nao_ordenada(self):
        html = self.doc("- um\n- dois\n\n1. a\n2. b")
        self.assertIn("<ul><li>um</li><li>dois</li></ul>", html)
        self.assertIn("<ol><li>a</li><li>b</li></ol>", html)

    def test_bloco_de_codigo_e_citacao(self):
        html = self.doc("```\na < b\n```\n\n> aviso\n> importante")
        self.assertIn("<pre><code>a &lt; b</code></pre>", html)
        self.assertIn("<blockquote><p>aviso importante</p></blockquote>", html)

    def test_imagem_e_embutida_em_base64(self):
        html = self.doc("![Figura](f.svg)", {"f.svg": SVG})
        self.assertIn("data:image/svg+xml;base64,", html)
        self.assertIn("<figcaption>Figura</figcaption>", html)

    def test_documento_e_autonomo(self):
        html = self.doc("# T\n\nTexto")
        self.assertTrue(html.startswith("<!doctype html>"))
        self.assertIn("@page", html)
        self.assertNotIn("<script", html)


if __name__ == "__main__":
    unittest.main()
