"""Teste de premissas e lançamento: cada cenário muda só o que diz, e o treino não vê o futuro."""

import math
import re
import unittest
from datetime import datetime
from unittest.mock import patch

from app import public_data, robustness
from app.charts import BOTTOM, HEIGHT, TOP, line_chart
from app.ranking.model import train_model
from app.robustness import (
    BASE,
    coordinator_chart,
    coordinator_levels,
    evaluate_robustness,
    first_lasting_win,
    label_cutoff_check,
    launch_chart,
    launch_curve,
    render_robustness,
    scenarios,
    summarize,
    time_cut,
)
from app.synthetic.generator import generate
from tests.helpers import small_dataset, small_params


def row(name: str, **values: float) -> dict:
    defaults = {
        "scenario": name,
        "top5_model": 0.7,
        "top5_baseline": 0.6,
        "auc_model": 0.8,
        "auc_baseline": 0.7,
        "offers_manual": 3.0,
        "offers_random": 2.0,
        "offers_baseline": 1.5,
        "time_manual": 100.0,
        "time_random": 60.0,
        "time_baseline": 50.0,
        "time_model": 40.0,
        "concentration_manual": 0.3,
        "concentration_model": 0.5,
    }
    return {**defaults, **values}


class GraficoDeLinhasTests(unittest.TestCase):
    def setUp(self):
        self.svg = line_chart(
            "Título",
            "Subtítulo",
            ["7", "14", "21"],
            [("Modelo", [65.2, 69.0, 71.4]), ("Baseline", [67.6, 68.0, 68.0])],
            lambda value: f"{value:.1f}",
            "Descrição",
        )

    def test_uma_linha_e_uma_legenda_por_serie(self):
        self.assertEqual(self.svg.count('fill="none"'), 2)
        self.assertEqual(self.svg.count("<circle"), 6)
        self.assertIn(">Modelo</text>", self.svg)
        self.assertIn(">Baseline</text>", self.svg)

    def test_rotula_so_as_pontas_de_cada_serie(self):
        for label in ("65.2", "67.6", "71.4", "68.0"):
            self.assertIn(f">{label}</text>", self.svg)
        self.assertNotIn(">69.0</text>", self.svg)

    def test_o_eixo_cobre_todos_os_valores(self):
        ys = [float(y) for y in re.findall(r'<circle cx="[\d.]+" cy="([\d.]+)"', self.svg)]
        self.assertTrue(all(TOP <= y <= HEIGHT - BOTTOM for y in ys))

    def test_serie_constante_nao_divide_por_zero(self):
        svg = line_chart("T", "S", ["a", "b"], [("X", [5.0, 5.0])], str, "D")
        self.assertIn("<circle", svg)

    def test_rejeita_mais_de_duas_series(self):
        with self.assertRaises(ValueError):
            line_chart("T", "S", ["a"], [("A", [1.0]), ("B", [1.0]), ("C", [1.0])], str, "D")


class CenariosTests(unittest.TestCase):
    def setUp(self):
        self.base = small_params()
        self.cases = dict(scenarios(self.base))

    def test_a_base_vem_primeiro_e_sem_alteracao(self):
        self.assertEqual(scenarios(self.base)[0], (BASE, self.base))

    def test_cada_peso_muda_sozinho(self):
        accept = self.base["accept"]
        changed = self.cases["Distância pesa o dobro"]["accept"]
        self.assertEqual(changed["distance"], accept["distance"] * 2)
        self.assertEqual(
            {k: v for k, v in changed.items() if k != "distance"},
            {k: v for k, v in accept.items() if k != "distance"},
        )
        self.assertEqual(self.cases["Aceite geral menor"]["accept"]["b0"], accept["b0"] - 0.7)
        self.assertEqual(
            self.cases["Agenda pesa um quarto"]["accept"]["not_covered"],
            accept["not_covered"] * 0.25,
        )

    def test_premissas_fora_dos_pesos(self):
        self.assertEqual(self.cases["Outra semente (2)"]["seed"], 2)
        self.assertEqual(self.cases["Oferta expira em 30 min"]["ttl_minutes"], 30)
        self.assertFalse(self.cases["Sem viés histórico"]["historical_bias_scenario"])

    def test_os_cenarios_nao_alteram_a_base(self):
        self.assertNotIn("share_female", self.base)
        self.assertNotIn("age_weights", self.base)
        self.assertIn("share_female", self.cases[robustness.CALIBRATED])


class ResumoTests(unittest.TestCase):
    def test_conta_vitorias_e_faixas(self):
        rows = [
            row("a"),
            row("b", top5_model=0.5, auc_model=0.6, time_model=70.0, concentration_model=0.2),
        ]
        summary = summarize(rows)
        self.assertEqual(summary["n_scenarios"], 2)
        self.assertEqual(summary["top5_wins"], 1)
        self.assertEqual(summary["auc_wins"], 1)
        self.assertEqual(summary["time_goal_met"], 1)
        self.assertEqual(summary["time_goal_missed"], ["b"])
        self.assertEqual(summary["concentration_worse"], 1)
        self.assertAlmostEqual(summary["top5_lift_min"], -0.1)
        self.assertAlmostEqual(summary["top5_lift_max"], 0.1)
        self.assertAlmostEqual(summary["time_cut"]["manual"]["min"], 0.3)
        self.assertAlmostEqual(summary["time_cut"]["manual"]["max"], 0.6)

    def test_niveis_do_coordenador_usam_o_tempo_de_cada_um(self):
        levels = coordinator_levels(row("base"))
        self.assertEqual([x["offers"] for x in levels], [3.0, 2.0, 1.5])
        self.assertAlmostEqual(levels[0]["cut"], 0.6)
        self.assertAlmostEqual(levels[1]["cut"], time_cut(row("base"), "random"))
        self.assertAlmostEqual(levels[2]["cut"], 0.2)

    def test_primeira_vitoria_duradoura_ignora_vitoria_que_nao_dura(self):
        curve = [{"day": d, "lift": lift} for d, lift in ((7, 0.01), (14, -0.01), (21, 0.02))]
        self.assertEqual(first_lasting_win(curve)["day"], 21)
        self.assertIsNone(first_lasting_win([{"day": 7, "lift": -0.01}]))


class LancamentoTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.dataset = small_dataset()
        cls.params = small_params()

    def test_o_treino_so_usa_oferta_com_plantao_ja_encerrado(self):
        trained: list[int] = []

        def spy(rows, labels, version):
            trained.append(len(rows))
            return train_model(rows, labels, version)

        with patch.object(robustness, "train_model", spy):
            curve = launch_curve(self.dataset, self.params, days=(14, 30), window_days=14)
        self.assertEqual(len(curve), 2)
        start = datetime.fromisoformat(self.params["start_date"])
        for point, size in zip(curve, trained, strict=True):
            cutoff = start + robustness.timedelta(days=point["day"])
            shifts = self.dataset.shifts
            known = [o for o in self.dataset.offers if shifts[o.shift_id].ends_at <= cutoff]
            self.assertEqual(size, len(known))
            self.assertEqual(point["train_offers"], len(known))
            self.assertEqual(point["train_successes"], sum(o.y_success for o in known))

    def test_mais_dias_trazem_mais_historico(self):
        curve = launch_curve(self.dataset, self.params, days=(14, 30, 45), window_days=14)
        sizes = [point["train_offers"] for point in curve]
        self.assertEqual(sizes, sorted(sizes))
        self.assertGreater(sizes[-1], sizes[0])

    def test_dia_sem_rotulos_dos_dois_tipos_fica_de_fora(self):
        self.assertEqual(launch_curve(self.dataset, self.params, days=(0,)), [])


class RelatorioTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        base = small_params()
        cases = scenarios(base)
        chosen = [cases[0], next(c for c in cases if c[0] == robustness.CALIBRATED)]
        cls.metrics = evaluate_robustness(base, cases=chosen, reps=5)
        cls.text = render_robustness(cls.metrics)

    def test_e_rotulado_como_simulacao_e_compara_com_baseline(self):
        self.assertEqual(self.metrics["label"], "simulacao")
        self.assertIn("**Simulação.**", self.text)
        self.assertIn("baseline", self.text)

    def test_cada_cenario_aparece_no_relatorio(self):
        for line in self.metrics["scenarios"]:
            self.assertIn(f"| {line['scenario']} |", self.text)

    def test_cita_a_fonte_publica_e_os_limites(self):
        self.assertIn(public_data.SOURCE_URL, self.text)
        self.assertIn("## Limites", self.text)
        self.assertIn(public_data.READ_ON, self.text)

    def test_graficos_descrevem_as_series(self):
        self.assertIn("Igual ao baseline", coordinator_chart(self.metrics))
        chart = launch_chart(self.metrics)
        self.assertIn("Modelo", chart)
        self.assertIn("Baseline", chart)


class ConferenciaDoRotuloTests(unittest.TestCase):
    def test_separa_o_que_ainda_nao_se_saberia_no_corte(self):
        dataset, params = small_dataset(), small_params()
        check = label_cutoff_check(dataset, params)
        cutoff = datetime.fromisoformat(params["test_start"])
        sent = [o for o in dataset.offers if o.sent_at < cutoff]
        late = [o for o in sent if dataset.shifts[o.shift_id].ends_at > cutoff]
        self.assertEqual(check["n_sent"], len(sent))
        self.assertEqual(check["n_late"], len(late))
        for rule in ("published", "strict"):
            self.assertTrue(0 <= check[rule]["auc"] <= 1)
            self.assertTrue(0 <= check[rule]["top5"] <= 1)


class DadosPublicosTests(unittest.TestCase):
    def test_as_parcelas_saem_dos_totais_do_estudo(self):
        self.assertAlmostEqual(public_data.share_pediatria(), 47787 / 106825)
        female = public_data.share_female()
        self.assertAlmostEqual(female["pediatria"], 0.768, places=3)
        self.assertAlmostEqual(female["clinica_medica"], 0.555, places=3)

    def test_pesos_das_faixas_somam_um(self):
        weights = public_data.age_weights()
        self.assertEqual(len(weights), 4)
        self.assertTrue(math.isclose(sum(weights), 1.0))
        self.assertAlmostEqual(weights[0], 0.2193, places=4)
        self.assertAlmostEqual(weights[3], 0.2685, places=4)


class GeradorComPremissasTests(unittest.TestCase):
    def test_parcela_de_mulheres_e_pesos_de_idade_valem_quando_informados(self):
        params = {
            **small_params(),
            "share_female": {"pediatria": 1.0, "clinica_medica": 0.0},
            "age_weights": [1, 0, 0, 0],
        }
        doctors = generate(params).doctors.values()
        for doctor in doctors:
            self.assertEqual(doctor.gender, "F" if doctor.specialty == "pediatria" else "M")
            self.assertEqual(doctor.age_band, "25-34")

    def test_sem_as_opcoes_o_sorteio_continua_o_mesmo(self):
        first = generate(small_params()).doctors
        again = small_dataset().doctors
        self.assertEqual(first, again)


if __name__ == "__main__":
    unittest.main()
