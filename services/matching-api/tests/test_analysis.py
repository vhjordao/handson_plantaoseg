"""Gráficos em SVG e relatório de análise exploratória."""

import tempfile
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path

from app.analysis import pearson, write_analysis
from app.charts import column_chart, nice_ticks
from tests.helpers import small_dataset, small_params


def pct(value: float) -> str:
    return f"{value:.0%}"


class EixoTests(unittest.TestCase):
    def test_passos_redondos(self):
        self.assertEqual([round(t, 6) for t in nice_ticks(0.45)], [0, 0.1, 0.2, 0.3, 0.4, 0.5])
        self.assertEqual([round(t, 6) for t in nice_ticks(0.62)], [0, 0.2, 0.4, 0.6, 0.8])
        self.assertEqual(nice_ticks(545)[:3], [0, 100, 200])

    def test_valor_nulo(self):
        self.assertEqual(nice_ticks(0), [0.0, 1.0])


class GraficoTests(unittest.TestCase):
    def make(self, series):
        return column_chart("Título", "Subtítulo", ["a b", "c"], series, pct, "Descrição")

    def test_svg_e_xml_valido_com_titulo_e_descricao(self):
        svg = self.make([("Série única", [0.2, 0.4])])
        root = ET.fromstring(svg)
        self.assertTrue(root.tag.endswith("svg"))
        self.assertIn("Título", svg)
        self.assertIn("Descrição", svg)

    def test_legenda_so_com_duas_series(self):
        one = self.make([("Única", [0.2, 0.4])])
        two = self.make([("Primeira", [0.2, 0.4]), ("Segunda", [0.1, 0.3])])
        self.assertNotIn("Única</text>", one)
        self.assertIn("Primeira</text>", two)
        self.assertIn("Segunda</text>", two)

    def test_so_aceita_uma_ou_duas_series(self):
        with self.assertRaises(ValueError):
            self.make([("a", [1, 2]), ("b", [1, 2]), ("c", [1, 2])])

    def test_texto_e_escapado(self):
        svg = column_chart("A & B <i>", "s", ["x"], [("n", [1.0])], pct, "d")
        ET.fromstring(svg)
        self.assertIn("A &amp; B &lt;i&gt;", svg)


class AnaliseTests(unittest.TestCase):
    def test_pearson(self):
        self.assertAlmostEqual(pearson([1, 2, 3, 4], [2, 4, 6, 8]), 1.0)
        self.assertAlmostEqual(pearson([1, 2, 3, 4], [8, 6, 4, 2]), -1.0)
        self.assertEqual(pearson([1, 1, 1], [1, 2, 3]), 0.0)

    def test_relatorio_e_figuras_sao_gerados(self):
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp)
            write_analysis(small_dataset(), small_params(), out)
            report = (out / "README.md").read_text(encoding="utf-8")
            figures = sorted(out.glob("*.svg"))
            self.assertEqual(len(figures), 6)
            for figure in figures:
                ET.fromstring(figure.read_text(encoding="utf-8"))
                self.assertIn(figure.name, report)
        self.assertIn("Simulação", report)
        self.assertIn("viés", report)
        self.assertIn("injeção de prompt", report)


if __name__ == "__main__":
    unittest.main()
