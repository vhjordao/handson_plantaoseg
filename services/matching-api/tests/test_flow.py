"""Fluxo recomendado contra o processo manual (simulação): matemática da cascata, linha de base
do processo manual e coerência com a avaliação contrafactual do ranking."""

import itertools
import json
import random
import unittest
from collections import Counter

from app.flow import (
    ORDERINGS,
    cascade_expectation,
    concentration_chart,
    evaluate_flow,
    flow_chart,
    manual_baseline,
    render_flow,
    simulate_cascade,
    top_share,
)
from app.ranking.evaluate import evaluate
from app.synthetic.generator import (
    DECLINE_SHARE,
    FIRST_OFFER_DELAY_MINUTES,
    NEXT_OFFER_GAP_MINUTES,
    RESPONSE_MEAN_MINUTES,
)
from tests.helpers import small_dataset, small_model, small_params

TTL = 60


class CascataTests(unittest.TestCase):
    def test_esperanca_com_chances_iguais(self):
        expected, uncovered = cascade_expectation([0.5, 0.5, 0.5], cap=8)
        self.assertAlmostEqual(expected, 1 + 0.5 + 0.25)
        self.assertAlmostEqual(uncovered, 0.125)

    def test_o_limite_de_ofertas_corta_a_cascata(self):
        expected, uncovered = cascade_expectation([0.0] * 20, cap=8)
        self.assertEqual(expected, 8.0)
        self.assertEqual(uncovered, 1.0)

    def test_chamar_da_maior_para_a_menor_chance_minimiza_as_ofertas(self):
        chances = [0.2, 0.5, 0.9, 0.4]
        orders = itertools.permutations(chances)
        best = min(cascade_expectation(list(order), 8)[0] for order in orders)
        self.assertAlmostEqual(cascade_expectation(sorted(chances, reverse=True), 8)[0], best)

    def test_chance_total_preenche_na_primeira_oferta(self):
        low, high = FIRST_OFFER_DELAY_MINUTES
        rng = random.Random(1)
        for _ in range(100):
            minutes, filled = simulate_cascade([1.0, 1.0], rng, TTL, cap=8)
            self.assertTrue(filled)
            self.assertTrue(low <= minutes <= high + TTL - 1)

    def test_sem_chance_a_vaga_nao_e_preenchida_e_o_tempo_so_cresce(self):
        minutes, filled = simulate_cascade([0.0] * 3, random.Random(2), TTL, cap=8)
        self.assertFalse(filled)
        floor = FIRST_OFFER_DELAY_MINUTES[0] + 3 * NEXT_OFFER_GAP_MINUTES[0]
        self.assertGreaterEqual(minutes, floor)

    def test_mesma_semente_mesmo_resultado(self):
        chances = [0.3, 0.4, 0.5, 0.2]
        first = [simulate_cascade(chances, random.Random(7), TTL, 8) for _ in range(3)]
        self.assertEqual(first[0], first[1])
        self.assertEqual(first[1], first[2])

    def test_parcela_dos_mais_frequentes(self):
        counter = Counter({"a": 5, "b": 3, "c": 2})
        self.assertAlmostEqual(top_share(counter, 1), 0.5)
        self.assertAlmostEqual(top_share(counter, 2), 0.8)


class ProcessoManualTests(unittest.TestCase):
    def test_bate_com_a_contagem_direta(self):
        dataset = small_dataset()
        shifts = list(dataset.shifts.values())
        stats = manual_baseline(dataset, shifts)
        accepted = [o for o in dataset.offers if o.accepted]
        self.assertEqual(stats["n_shifts"], len(shifts))
        self.assertAlmostEqual(stats["offers_per_shift"], len(dataset.offers) / len(shifts))
        self.assertAlmostEqual(stats["filled_share"] + stats["uncovered_share"], 1.0)
        self.assertEqual(stats["accepted"], len(accepted))
        self.assertEqual(stats["violations"], sum(o.injected_violation for o in accepted))
        self.assertGreater(stats["time_median"], 0)

    def test_antecedencia_nunca_passa_do_teto_de_vagas_publicadas_cedo(self):
        stats = manual_baseline(small_dataset(), list(small_dataset().shifts.values()))
        self.assertLessEqual(stats["lead24_share"], stats["published24_share"])

    def test_premissas_de_tempo_batem_com_os_dados_gerados(self):
        dataset = small_dataset()
        low, high = FIRST_OFFER_DELAY_MINUTES
        gap_low, gap_high = NEXT_OFFER_GAP_MINUTES
        by_shift: dict[str, list] = {}
        for offer in dataset.offers:
            by_shift.setdefault(offer.shift_id, []).append(offer)
        delays = []
        for shift_id, offers in by_shift.items():
            offers.sort(key=lambda o: o.sequence_no)
            published = dataset.shifts[shift_id].published_at
            wait = (offers[0].sent_at - published).total_seconds() / 60
            self.assertTrue(low <= wait <= high, wait)
            for previous, nxt in itertools.pairwise(offers):
                gap = (nxt.sent_at - previous.resolved_at).total_seconds() / 60
                self.assertTrue(gap_low <= gap <= gap_high, gap)
            for offer in offers:
                if offer.responded_at is not None:
                    delay = (offer.responded_at - offer.sent_at).total_seconds() / 60
                    self.assertLessEqual(delay, TTL - 1)
                    delays.append(delay)
        self.assertAlmostEqual(sum(delays) / len(delays), RESPONSE_MEAN_MINUTES, delta=4)


class FluxoRecomendadoTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.metrics = evaluate_flow(small_dataset(), small_params(), small_model(), reps=20)
        _, ranking = evaluate(small_dataset(), small_params())
        cls.counterfactual = ranking["counterfactual"]

    def test_rotulo_e_premissas_vem_do_gerador(self):
        a = self.metrics["assumptions"]
        self.assertEqual(self.metrics["label"], "simulacao")
        self.assertEqual(a["decline_share"], DECLINE_SHARE)
        self.assertEqual(a["response_mean_minutes"], RESPONSE_MEAN_MINUTES)
        self.assertEqual(a["first_offer_delay_minutes"], list(FIRST_OFFER_DELAY_MINUTES))
        self.assertEqual(a["next_offer_gap_minutes"], list(NEXT_OFFER_GAP_MINUTES))

    def test_mesmas_vagas_e_mesmos_elegiveis_do_contrafactual(self):
        cf = self.counterfactual
        self.assertEqual(self.metrics["n_shifts"], int(cf["n_shifts"]))
        self.assertAlmostEqual(self.metrics["mean_pool"], cf["mean_pool"])
        con = self.metrics["concentration"]
        self.assertAlmostEqual(con["model_top5_slots"], cf["model_top10pct_share"])
        self.assertAlmostEqual(con["baseline_top5_slots"], cf["baseline_top10pct_share"])

    def test_o_oraculo_e_o_que_menos_chama(self):
        flow = self.metrics["flow"]
        for name in ORDERINGS:
            self.assertLessEqual(
                flow["oracle"]["offers_per_shift"], flow[name]["offers_per_shift"] + 1e-9, name
            )

    def test_valores_dentro_dos_limites(self):
        cap = self.metrics["assumptions"]["max_offers_per_shift"]
        for name, row in self.metrics["flow"].items():
            self.assertTrue(1.0 <= row["offers_per_shift"] <= cap, name)
            self.assertTrue(0.0 <= row["uncovered_share"] <= 1.0, name)
            self.assertTrue(0.0 <= row["lead24_share"] <= 1.0, name)
            self.assertGreater(row["time_mean"], 0, name)
            self.assertLessEqual(row["time_median"], row["time_p90"], name)

    def test_antecedencia_do_fluxo_nao_passa_do_teto(self):
        ceiling = self.metrics["manual"]["test"]["published24_share"]
        for name, row in self.metrics["flow"].items():
            self.assertLessEqual(row["lead24_share"], ceiling + 1e-9, name)

    def test_reducoes_sao_coerentes_com_as_tabelas(self):
        manual, model = self.metrics["manual"]["test"], self.metrics["flow"]["model"]
        cut = self.metrics["reduction"]
        self.assertAlmostEqual(cut["time_mean"], 1 - model["time_mean"] / manual["time_mean"])
        self.assertAlmostEqual(
            cut["offers_per_shift"], 1 - model["offers_per_shift"] / manual["offers_per_shift"]
        )

    def test_json_e_serializavel_sem_nan(self):
        json.dumps(self.metrics, allow_nan=False)

    def test_relatorio_e_figura(self):
        text = render_flow(self.metrics)
        self.assertIn("simulação", text.lower())
        self.assertIn("Processo manual", text)
        self.assertIn("concentra mais", text)
        svg = flow_chart(self.metrics)
        self.assertTrue(svg.startswith("<svg"))
        self.assertIn("Tempo médio até preencher", svg)
        concentration = concentration_chart(self.metrics)
        self.assertTrue(concentration.startswith("<svg"))
        self.assertIn("Concentração", concentration)


if __name__ == "__main__":
    unittest.main()
