"""Os documentos citam o que o código e os resultados realmente dizem (nada de número solto)."""

import json
import re
import tempfile
import unittest
from datetime import date
from pathlib import Path

from app import public_data
from app.cli import build_parser
from app.datadict import render_dictionary
from app.docbuild import REPO_URL, render
from app.llm.extraction import build_system_prompt
from app.ranking.features import CONTEXT_VARIABLES, RANKING_FEATURES
from app.ranking.report import num, pct
from app.robustness import coordinator_chart, launch_chart, render_robustness
from app.synthetic.generator import generate
from app.synthetic.params import load_params
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


class KitDeEntrevistasTests(unittest.TestCase):
    """O kit cita o que a simulação diz, e o gabarito fica fora do que o entrevistador lê."""

    def setUp(self):
        self.text = read("entrevistas/kit-do-entrevistador.md")
        self.flow = json.loads(read("resultados/metricas-fluxo.json"))

    def test_tabela_do_coordenador_real_bate_com_o_fluxo(self):
        manual, flow = self.flow["manual"]["test"], self.flow["flow"]
        model = flow["model"]["time_mean"]
        for level, row_start in (
            (manual, "| Chama sem conferir a agenda (premissa atual)"),
            (flow["random"], "| Já chama só quem pode ir, em qualquer ordem"),
            (flow["baseline"], "| Já escolhe tão bem quanto nossa regra simples (baseline)"),
        ):
            offers = num(level["offers_per_shift"], 2)
            gain = pct(1 - model / level["time_mean"], 0)
            self.assertIn(f"{row_start} | {offers} | {gain} |", self.text)
        self.assertIn(f"nas {self.flow['n_shifts']} vagas do período de teste", self.text)

    def test_premissas_citadas_batem_com_o_ano_simulado(self):
        year, assumptions = self.flow["manual"]["year"], self.flow["assumptions"]
        params = json.loads((DOCS.parent / "data/synthetic/params.json").read_text("utf-8"))
        report = read("dados/relatorio-de-qualidade.md")
        success = re.search(r"Taxa de sucesso \(aceitou e compareceu\) \| ([\d,]+)%", report)
        success_rate = float(success.group(1).replace(",", ".")) / 100
        accept_rate = year["accepted"] / (year["offers_per_shift"] * year["n_shifts"])
        response = assumptions["response_mean_minutes"]
        for expected in (
            f"| 3: vagas por mês | {round(year['n_shifts'] / 12 / 3)} por hospital |",
            f"| 4: descobertas | {pct(year['uncovered_share'])} |",
            f"| 5: médicos chamados | {num(year['offers_per_shift'], 2)} ofertas por vaga |",
            f"| 6: tempo até confirmar | Mediana de {year['time_median']:.0f} min |",
            f"{assumptions['ttl_minutes']} min para expirar, resposta média de {response} min, "
            f"até {assumptions['max_offers_per_shift']} ofertas",
            f"ele responde por {pct(self.flow['reduction']['rules_share_of_gain'], 0)}",
            f"10% dos médicos recebem {pct(year['top10_offer_share'])} das ofertas",
            f"Cerca de {pct(success_rate / accept_rate, 0)} comparecem",
            f"{pct(year['published24_share'])} publicadas com 24 h ou mais",
            f"| 3: aceite | {pct(accept_rate)} das ofertas |",
            f"| 4: tempo de resposta | Média de {response} min |",
            f"{num(params['accept']['distance'], 2)} por km na chance de aceite",
            f"+{num(params['accept']['preference'], 1)} quando o período coincide",
        ):
            self.assertIn(expected, self.text)

    def test_folha_publicada_equilibra_especialidade_hospital_e_origem(self):
        sheet = read("entrevistas/revisao-cega-casos.md")
        pattern = r"^### Caso \d+\. (Clínica médica|Pediatria), .*(Hospital Modelo \w+),"
        titles = re.findall(pattern, sheet, re.M)
        self.assertEqual(len(titles), 10)
        self.assertEqual(sum(specialty == "Pediatria" for specialty, _ in titles), 5)
        self.assertEqual(sum(specialty == "Pediatria" for specialty, _ in titles[:6]), 3)
        self.assertEqual(len({hospital for _, hospital in titles[:6]}), 3)
        self.assertNotIn("SIM-SP-", sheet)
        answer_key = read("entrevistas/revisao-cega-gabarito.md")
        self.assertEqual(len(re.findall(r"^\| \d+ \| modelo \| baseline \|", answer_key, re.M)), 5)
        self.assertEqual(len(re.findall(r"^\| \d+ \| baseline \| modelo \|", answer_key, re.M)), 5)

    def test_links_do_kit_apontam_para_arquivos_que_existem(self):
        for target in re.findall(r"\]\(([^)#:]+\.(?:md|pdf|svg))\)", self.text):
            self.assertTrue((DOCS / "entrevistas" / target).is_file(), target)

    def test_o_kit_nao_diz_de_onde_vem_cada_lista(self):
        self.assertIn("Não abra antes", read("entrevistas/revisao-cega-gabarito.md"))
        self.assertNotRegex(self.text, r"[Ll]ista [AB] (é|vem|veio)")

    def test_links_relativos_do_kit_viram_endereco_do_github_na_pasta_certa(self):
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / "kit.html"
            source = DOCS / "entrevistas" / "kit-do-entrevistador.md"
            args = build_parser().parse_args(
                ["build-doc", "--source", str(source), "--out", str(out)]
            )
            args.func(args)
            html = out.read_text(encoding="utf-8")
        self.assertIn(f"{REPO_URL}docs/entrevistas/revisao-cega-gabarito.md", html)
        self.assertNotIn(f"{REPO_URL}docs/revisao-cega-gabarito.md", html)

class RobustezTests(unittest.TestCase):
    """O relatório sai do JSON, e a base é a mesma dos resultados já publicados."""

    def setUp(self):
        self.metrics = json.loads(read("resultados/metricas-robustez.json"))

    def test_relatorio_e_figuras_saem_do_json(self):
        self.assertEqual(read("resultados/metricas-robustez.md"), render_robustness(self.metrics))
        self.assertEqual(
            read("resultados/fig-robustez-coordenador.svg"), coordinator_chart(self.metrics)
        )
        self.assertEqual(read("resultados/fig-robustez-curva.svg"), launch_chart(self.metrics))

    def test_a_base_e_a_mesma_dos_resultados_publicados(self):
        base = self.metrics["scenarios"][0]
        ranking = metrics()
        flow = json.loads(read("resultados/metricas-fluxo.json"))
        self.assertEqual(base["scenario"], "Base")
        for mine, published in (
            (base["auc_model"], ranking["auc_model"]),
            (base["auc_baseline"], ranking["auc_baseline"]),
            (base["top5_model"], ranking["counterfactual"]["model"]),
            (base["top5_baseline"], ranking["counterfactual"]["baseline"]),
            (base["time_manual"], flow["manual"]["test"]["time_mean"]),
            (base["time_model"], flow["flow"]["model"]["time_mean"]),
            (base["offers_random"], flow["flow"]["random"]["offers_per_shift"]),
        ):
            # Os publicados leem o CSV, com coordenadas arredondadas; aqui os dados vêm da memória.
            self.assertAlmostEqual(mine, published, places=6)

    def test_o_kit_cita_os_mesmos_niveis_de_coordenador(self):
        kit = read("entrevistas/kit-do-entrevistador.md")
        for level in self.metrics["coordinator_levels"]:
            self.assertIn(f"| {num(level['offers'], 2)} | {pct(level['cut'], 0)} |", kit)

    def test_comparacao_publica_usa_os_totais_do_estudo(self):
        rows = {row["premise"]: row for row in self.metrics["public_comparison"]}
        self.assertEqual(
            rows["Pediatras entre as duas especialidades"]["public"],
            public_data.share_pediatria(),
        )
        self.assertEqual(
            rows["Mulheres na pediatria"]["public"], public_data.share_female()["pediatria"]
        )
        self.assertEqual(rows["Com 55 anos ou mais"]["public"], public_data.age_weights()[3])

class DadosEmProducaoTests(unittest.TestCase):
    """O exemplo do dicionário sai do gerador, e o desenho de produção cita a simulação."""

    def test_exemplo_do_dicionario_bate_com_o_gerador(self):
        params = load_params(DOCS.parent / "data" / "synthetic" / "params.json")
        self.assertEqual(read("dados/dicionario-exemplo.md"), render_dictionary(generate(params)))

    def test_o_dicionario_completo_aponta_para_o_exemplo_e_para_a_producao(self):
        text = read("dados/dicionario-de-dados.md")
        self.assertIn("(dicionario-exemplo.md)", text)
        self.assertIn("(dados-em-producao.md)", text)

    def test_producao_cita_os_numeros_da_simulacao_de_lancamento(self):
        text = read("dados/dados-em-producao.md")
        launch = json.loads(read("resultados/metricas-robustez.json"))["launch"]
        by_day = {row["day"]: row for row in launch["curve"]}
        behind = next(row for row in launch["curve"] if row["lift"] <= 0)
        self.assertIn(f"perde do baseline com {behind['train_offers']} ofertas", text)
        winner = launch["first_lasting_win"]
        self.assertIn(f"a partir de {winner['train_offers']}", text)
        self.assertIn(f"entre o dia {behind['day']} e o dia {winner['day']}", text)
        ninety = f"{by_day[90]['train_offers']:,}".replace(",", ".")
        self.assertIn(f"90 dias dão cerca de {ninety} ofertas", text)

    def test_producao_cobre_todas_as_tabelas_do_dado(self):
        text = read("dados/dados-em-producao.md")
        for table in (
            "organizations",
            "units",
            "doctors",
            "doctor_availability",
            "shift_requests",
            "shifts",
            "offers",
            "policy_config",
            "shift_compensation",
            "audit_log",
            "model_registry",
        ):
            self.assertIn(f"`{table}`", text)

    def test_afirmacao_legal_diz_validar_com_juridico(self):
        text = read("dados/dados-em-producao.md")
        self.assertGreaterEqual(text.count("alidar com jurídico"), 3)
        self.assertIn("lidas em 03/11/2026", text)



if __name__ == "__main__":
    unittest.main()
