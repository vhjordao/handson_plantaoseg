"""Variáveis sem vazamento, regressão logística, AUC e avaliação contra o baseline."""

import unittest
from dataclasses import replace
from datetime import datetime

from app.ranking.compute import FeatureStore
from app.ranking.evaluate import auc, evaluate, offer_features
from app.ranking.features import CONTEXT_VARIABLES, RANKING_FEATURES
from app.ranking.model import LogisticModel, solve_linear, train_model
from tests.helpers import small_dataset, small_params


class SemVazamentoTests(unittest.TestCase):
    def setUp(self):
        self.dataset = small_dataset()
        self.offers = sorted(self.dataset.offers, key=lambda o: o.sent_at)
        self.target = self.offers[len(self.offers) // 2]

    def test_futuro_nao_muda_as_variaveis_de_hoje(self):
        past_only = replace(
            self.dataset, offers=[o for o in self.offers if o.sent_at <= self.target.sent_at]
        )
        before = offer_features(self.dataset, FeatureStore(self.dataset), self.target)
        after = offer_features(past_only, FeatureStore(past_only), self.target)
        self.assertEqual(before, after)

    def test_o_proprio_resultado_nao_entra_na_conta(self):
        flipped = replace(
            self.target,
            accepted=not self.target.accepted,
            attended=True if not self.target.accepted else None,
            y_success=not self.target.accepted,
            response="accepted" if not self.target.accepted else "declined",
        )
        others = [flipped if o.id == self.target.id else o for o in self.offers]
        changed = replace(self.dataset, offers=others)
        original = offer_features(self.dataset, FeatureStore(self.dataset), self.target)
        again = offer_features(changed, FeatureStore(changed), flipped)
        self.assertEqual(original, again)

    def test_sem_historico_valores_neutros(self):
        store = FeatureStore(self.dataset)
        shift = next(iter(self.dataset.shifts.values()))
        doctor = next(iter(self.dataset.doctors.values()))
        features = store.features(
            doctor,
            specialty=shift.specialty,
            starts_at=shift.starts_at,
            ends_at=shift.ends_at,
            unit=self.dataset.units[shift.unit_id],
            policy=self.dataset.policy,
            t=datetime(2020, 1, 1),
        )
        self.assertEqual(features["acceptance_rate_90d"], 0.5)
        self.assertEqual(features["attendance_rate_90d"], 0.5)
        self.assertEqual(features["hours_since_last_shift"], 168.0)
        self.assertEqual(features["shifts_last_30d"], 0.0)

    def test_variaveis_calculadas_sao_as_do_contrato(self):
        features = offer_features(self.dataset, FeatureStore(self.dataset), self.target)
        self.assertEqual(set(features), set(RANKING_FEATURES) | set(CONTEXT_VARIABLES))


class ModeloTests(unittest.TestCase):
    def rows(self):
        base = {name: 1.0 for name in RANKING_FEATURES}
        rows, labels = [], []
        for i in range(300):
            row = dict(base, distance_km=float(i % 20))
            rows.append(row)
            near = row["distance_km"] < 8
            labels.append(near if i % 9 else not near)  # ruído determinístico
        return rows, labels

    def test_aprende_o_sinal_da_distancia(self):
        rows, labels = self.rows()
        model = train_model(rows, labels, "teste")
        index = 1 + model.feature_names.index("distance_km")
        self.assertLess(model.weights[index], 0)
        near, far = dict(rows[0], distance_km=1.0), dict(rows[0], distance_km=19.0)
        self.assertGreater(model.probability(near), model.probability(far))

    def test_variaveis_do_modelo_vem_so_do_contrato(self):
        rows, labels = self.rows()
        model = train_model(rows, labels, "teste")
        self.assertEqual(set(model.feature_names), set(RANKING_FEATURES))

    def test_contribuicao_relativa_zera_o_que_e_constante(self):
        rows, labels = self.rows()
        model = train_model(rows, labels, "teste")
        reference = dict(rows[0], distance_km=10.0)
        contributions = model.contributions(rows[0], reference)
        self.assertEqual(contributions["specialty_match"], 0.0)
        self.assertGreater(contributions["distance_km"], 0.0)  # mais perto que a média

    def test_modelo_com_variavel_proibida_e_recusado(self):
        data = {
            "version": "x",
            "feature_names": ["distance_km", "payment_amount"],
            "means": [0, 0],
            "stds": [1, 1],
            "weights": [0, 0, 0],
        }
        with self.assertRaises(ValueError):
            LogisticModel.from_dict(data)

    def test_ida_e_volta_do_modelo(self):
        rows, labels = self.rows()
        model = train_model(rows, labels, "teste")
        again = LogisticModel.from_dict(model.to_dict())
        self.assertEqual(again.probability(rows[3]), model.probability(rows[3]))

    def test_solver_linear(self):
        solution = solve_linear([[2.0, 1.0], [1.0, 3.0]], [3.0, 5.0])
        self.assertAlmostEqual(solution[0], 0.8)
        self.assertAlmostEqual(solution[1], 1.4)


class AucTests(unittest.TestCase):
    def test_exemplo_classico(self):
        self.assertAlmostEqual(auc([0.1, 0.4, 0.35, 0.8], [False, False, True, True]), 0.75)

    def test_empates_valem_meio(self):
        self.assertAlmostEqual(auc([0.5, 0.5, 0.5, 0.5], [True, False, True, False]), 0.5)

    def test_perfeito_e_invertido(self):
        self.assertEqual(auc([0.1, 0.2, 0.8, 0.9], [False, False, True, True]), 1.0)
        self.assertEqual(auc([0.1, 0.2, 0.8, 0.9], [True, True, False, False]), 0.0)


class AvaliacaoTests(unittest.TestCase):
    def test_metricas_coerentes_e_deterministicas(self):
        dataset, params = small_dataset(), small_params()
        _, first = evaluate(dataset, params)
        _, second = evaluate(dataset, params)
        self.assertEqual(first, second)
        cf = first["counterfactual"]
        self.assertEqual(first["label"], "simulacao")
        self.assertGreater(cf["n_shifts"], 0)
        for method in ("model", "baseline", "random"):
            self.assertLessEqual(cf[method], cf["oracle"] + 1e-9)
            self.assertGreater(cf[method], 0.0)
        self.assertGreaterEqual(cf["oracle"], cf["random"])

    def test_ranking_nunca_usa_o_gabarito_do_simulador(self):
        model, _ = evaluate(small_dataset(), small_params())
        self.assertTrue(set(model.feature_names) <= set(RANKING_FEATURES))
        self.assertNotIn("reliability", model.feature_names)


if __name__ == "__main__":
    unittest.main()
