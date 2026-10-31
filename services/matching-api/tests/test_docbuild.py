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

    def test_caixa_de_destaque_com_paragrafos_e_lista(self):
        html = self.doc("> [!NOTE]\n> **Resumo.** Texto.\n>\n> - um\n> - dois")
        self.assertIn('<blockquote class="note">', html)
        self.assertIn("<p><strong>Resumo.</strong> Texto.</p>", html)
        self.assertIn("<ul><li>um</li><li>dois</li></ul>", html)
        self.assertNotIn("[!NOTE]", html)

    def test_cartoes_de_indicadores(self):
        table = "| Valor | Indicador | Nota |\n| --- | --- | --- |\n"
        rows = "| 71,2% | chance | contra 67,7% |\n| 0 | falhas | |"
        html = self.doc("<!-- kpis -->\n" + table + rows)
        self.assertEqual(html.count('<div class="kpi">'), 2)
        self.assertIn("<b>71,2%</b><span>chance</span><small>contra 67,7%</small>", html)
        self.assertIn("<b>0</b><span>falhas</span></div>", html)
        self.assertNotIn("<th", html)

    def test_so_a_tabela_marcada_vira_cartoes(self):
        table = "| A | B | C |\n| --- | --- | --- |\n| 1 | 2 | 3 |"
        html = self.doc("<!-- kpis -->\n" + table + "\n\n" + table)
        self.assertEqual(html.count('class="kpis"'), 1)
        self.assertEqual(html.count("<table>"), 1)

    def test_so_a_tabela_marcada_nao_quebra_entre_paginas(self):
        table = "| A | B |\n| --- | --- |\n| 1 | 2 |"
        html = self.doc("<!-- keep -->\n" + table + "\n\n" + table)
        self.assertEqual(html.count('<table class="keep">'), 1)
        self.assertEqual(html.count("<table>"), 1)
        self.assertIn("table.keep", html)

    def test_imagens_em_linhas_seguidas_ficam_lado_a_lado(self):
        html = self.doc("![A](f.svg)\n![B](f.svg)\n\n![C](f.svg)", {"f.svg": SVG})
        self.assertEqual(html.count('class="figs"'), 1)
        self.assertEqual(html.count("<figure>"), 3)

    def test_paragrafo_logo_depois_do_titulo_e_a_identificacao(self):
        html = self.doc("# T\n\nDisciplina X\n\nOutro")
        self.assertIn('<p class="meta">Disciplina X</p>', html)
        self.assertIn("<p>Outro</p>", html)

    def test_rodape_numera_as_paginas(self):
        self.assertIn("counter(page)", self.doc("# T"))

    def test_documento_e_autonomo(self):
        html = self.doc("# T\n\nTexto")
        self.assertTrue(html.startswith("<!doctype html>"))
        self.assertIn("@page", html)
        self.assertNotIn("<script", html)


if __name__ == "__main__":
    unittest.main()
