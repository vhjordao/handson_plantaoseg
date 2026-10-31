"""Os documentos citam o que o código e os resultados realmente dizem (nada de número solto)."""

import json
import re
import unittest
from datetime import date
from pathlib import Path

from app.docbuild import render
from app.llm.extraction import build_system_prompt
from app.ranking.features import CONTEXT_VARIABLES, RANKING_FEATURES
from app.ranking.report import num, pct
from app.synthetic.texts import ATTACK_TYPES
from tests.helpers import small_dataset

DOCS = Path(__file__).resolve().parents[3] / "docs"


def read(name: str) -> str:
    return (DOCS / name).read_text(encoding="utf-8")


def metrics() -> dict:
    return json.loads(read("resultados/metricas-ranking.json"))


class DicionarioTests(unittest.TestCase):
    def section(self, start: str, end: str) -> str:
        text = read("dados/dicionario-de-dados.md")
        return text[text.index(start) : text.index(end)]

    def test_variaveis_do_ranking_batem_com_o_codigo(self):
        block = self.section("## 5. Variáveis do ranking", "### Variáveis de contexto")
        names = re.findall(r"^\| `([a-z0-9_]+)` \|", block, flags=re.MULTILINE)
        self.assertEqual(names, list(RANKING_FEATURES))

    def test_variaveis_de_contexto_batem_com_o_codigo(self):
        block = self.section("### Variáveis de contexto", "## 6. Premissas")
        names = re.findall(r"^\| `([a-z0-9_]+)` \|", block, flags=re.MULTILINE)
        self.assertEqual(names, list(CONTEXT_VARIABLES))


class TesteManualGeminiTests(unittest.TestCase):
    def test_prompt_e_ataques_sao_os_do_codigo(self):
        text = read("teste-manual-gemini.md")
        prompt = build_system_prompt(date(2026, 10, 1), small_dataset().units)
        self.assertIn(prompt, text)
        for attack in ATTACK_TYPES:
            self.assertIn(attack, text)

    def test_declara_que_nao_foi_executado(self):
        self.assertIn("não executado", read("teste-manual-gemini.md"))


class NumerosCitadosTests(unittest.TestCase):
    def test_solucao_ia_cita_os_resultados_gerados(self):
        m, text = metrics(), read("solucao-ia.md")
        cf = m["counterfactual"]
        for value in (
            num(m["auc_baseline"]),
            num(m["auc_model"]),
            pct(cf["model"]),
            pct(cf["baseline"]),
            pct(cf["oracle"]),
            pct(cf["random"]),
            pct(cf["model_top10pct_share"]),
        ):
            self.assertIn(value, text)

    def test_documento_da_entrega_cita_os_resultados_gerados(self):
        path = DOCS / "03-entrega-2-prova-de-conceito.md"
        if not path.exists():
            self.skipTest("docs/03 ainda não existe")
        m, text = metrics(), path.read_text(encoding="utf-8")
        cf = m["counterfactual"]
        for value in (
            num(m["auc_baseline"]),
            num(m["auc_model"]),
            pct(cf["model"]),
            pct(cf["baseline"]),
            pct(cf["oracle"]),
            pct(cf["model_top10pct_share"]),
            f"{cf['model_never_recommended']:.0f} de {cf['ever_eligible']:.0f}",
        ):
            self.assertIn(value, text)


class FluxoRecomendadoNoDocumentoTests(unittest.TestCase):
    """Os números de tempo, ofertas, antecedência e concentração vêm de `metricas-fluxo.json`."""

    def setUp(self):
        self.flow = json.loads(read("resultados/metricas-fluxo.json"))
        self.text = read("03-entrega-2-prova-de-conceito.md")

    def test_documento_cita_o_fluxo_gerado(self):
        f = self.flow
        manual, model, cut = f["manual"]["test"], f["flow"]["model"], f["reduction"]
        year, con = f["manual"]["year"], f["concentration"]
        expected = (
            f"{manual['time_mean']:.0f} min",
            f"{model['time_mean']:.0f} min",
            f"mediana {manual['time_median']:.0f}",
            f"mediana {model['time_median']:.0f}",
            f"{f['flow']['random']['time_mean']:.0f} min",
            pct(cut["time_mean"], 0),
            pct(cut["rules_share_of_gain"], 0),
            num(manual["offers_per_shift"], 2),
            num(model["offers_per_shift"], 2),
            pct(manual["lead24_share"]),
            pct(manual["published24_share"]),
            pct(model["lead24_share"]),
            num(cut["lead24_gain_points"], 1),
            pct(year["violation_share"]),
            f"{year['violations']:.0f} de {year['accepted']:,.0f}".replace(",", "."),
            pct(con["manual_offers"]),
            pct(con["model_effective_offers"], 0),
        )
        for value in expected:
            self.assertIn(value, self.text)

    def test_a_concentracao_do_modelo_vem_do_json_do_ranking(self):
        cf = metrics()["counterfactual"]
        for value in (pct(cf["model_top10pct_share"]), pct(cf["baseline_top10pct_share"])):
            self.assertIn(value, self.text)

    def test_documento_renderiza_com_todas_as_figuras(self):
        html = render(self.text, DOCS)
        self.assertEqual(html.count("<figure>"), 5)
        self.assertIn('class="kpis"', html)
        self.assertIn('class="figs"', html)

    def test_documento_responde_ao_feedback_e_ao_pedido_da_entrega(self):
        for expected in (
            "Vaga descoberta",
            "Seleção opaca",
            "Fadiga sem controle",
            "Pagamento sem rastro",
            "Há dados pessoais?",
            "Há risco de discriminação?",
            "A decisão afeta pessoas?",
            "Há questões regulatórias?",
            "Suspensa",
            "em conjunto",
            "sugestão",
        ):
            self.assertIn(expected, self.text)


class ConformidadeTests(unittest.TestCase):
    def test_correcao_da_resolucao_2462_nao_se_perde(self):
        text = read("conformidade/README.md")
        self.assertIn("SUSPENSA integralmente", text)
        self.assertIn("1025417-59.2026.4.01.0000", text)

    def test_classificacao_de_risco_recomenda_reavaliar(self):
        self.assertIn("Médio risco", read("seguranca-ameacas.md"))


if __name__ == "__main__":
    unittest.main()
