"""Experimento contra a concentração: a ordem de cada política e o relatório publicado."""

import json
import unittest
from datetime import datetime, timedelta
from pathlib import Path

from app.concentration import (
    Candidate,
    ExposureWindow,
    Policy,
    recommended_key,
    render_concentration,
    rerank,
)

DOCS = Path(__file__).resolve().parents[3] / "docs" / "resultados"


def cand(doctor_id: str, score: float) -> Candidate:
    return Candidate(doctor_id, p_accept=score, p_success=score, score=score)


POOL = [cand("a", 0.90), cand("b", 0.88), cand("c", 0.86), cand("d", 0.70), cand("e", 0.40)]


class RerankTests(unittest.TestCase):
    def test_sem_politica_e_a_ordem_do_modelo(self) -> None:
        ordered = rerank(list(reversed(POOL)), {"a": 9}, Policy("hoje", "hoje"))
        self.assertEqual([c.doctor_id for c in ordered], ["a", "b", "c", "d", "e"])

    def test_rodizio_chama_primeiro_o_menos_exposto_entre_equivalentes(self) -> None:
        ordered = rerank(POOL, {"a": 3, "b": 1, "c": 0}, Policy("r", "r", delta=0.05))
        self.assertEqual([c.doctor_id for c in ordered][:3], ["c", "b", "a"])

    def test_rodizio_nao_passa_ninguem_a_frente_de_alguem_melhor_alem_da_margem(self) -> None:
        exposure = {"a": 5, "b": 5, "c": 5}
        ordered = rerank(POOL, exposure, Policy("r", "r", delta=0.05))
        self.assertEqual([c.doctor_id for c in ordered][:3], ["a", "b", "c"])
        self.assertEqual(ordered[3].doctor_id, "d")
        for position, chosen in enumerate(ordered):
            better_left = [c.score for c in ordered[position + 1 :]]
            self.assertTrue(all(score <= chosen.score + 0.05 + 1e-12 for score in better_left))

    def test_limite_manda_os_mais_expostos_para_o_fim_sem_tirar_ninguem(self) -> None:
        ordered = rerank(POOL, {"a": 2, "c": 4}, Policy("l", "l", limit=2))
        self.assertEqual([c.doctor_id for c in ordered], ["b", "d", "e", "a", "c"])

    def test_toda_politica_devolve_os_mesmos_elegiveis(self) -> None:
        exposure = {"a": 4, "b": 2, "d": 1}
        for policy in (
            Policy("r", "r", delta=0.10),
            Policy("l", "l", limit=2),
            Policy("rl", "rl", delta=0.10, limit=2),
        ):
            ordered = rerank(POOL, exposure, policy)
            self.assertEqual(sorted(c.doctor_id for c in ordered), ["a", "b", "c", "d", "e"])


class ExposureWindowTests(unittest.TestCase):
    def test_conta_so_os_ultimos_sete_dias(self) -> None:
        window = ExposureWindow()
        start = datetime(2026, 8, 1, 9)
        window.add(start, ["a", "b"])
        window.add(start + timedelta(days=3), ["a"])
        self.assertEqual(window.at(start + timedelta(days=6))["a"], 2)
        counts = window.at(start + timedelta(days=7))
        self.assertEqual(counts["a"], 1)
        self.assertEqual(counts["b"], 0)


class RecommendationTests(unittest.TestCase):
    @staticmethod
    def metrics(**policies: tuple[float, float]) -> dict:
        return {
            "policies": {
                key: {"top5_success": success, "top10_effective_offers": share}
                for key, (success, share) in policies.items()
            }
        }

    def test_escolhe_a_menor_concentracao_que_perde_ate_dois_pontos(self) -> None:
        metrics = self.metrics(hoje=(0.71, 0.80), x=(0.70, 0.50), y=(0.695, 0.36), z=(0.68, 0.20))
        self.assertEqual(recommended_key(metrics), "y")

    def test_sem_politica_aceitavel_fica_a_de_hoje(self) -> None:
        metrics = self.metrics(hoje=(0.71, 0.80), z=(0.60, 0.20))
        self.assertEqual(recommended_key(metrics), "hoje")


class PublishedReportTests(unittest.TestCase):
    def test_relatorio_publicado_bate_com_os_numeros(self) -> None:
        metrics = json.loads((DOCS / "metricas-concentracao.json").read_text(encoding="utf-8"))
        published = (DOCS / "metricas-concentracao.md").read_text(encoding="utf-8")
        self.assertEqual(published, render_concentration(metrics, metrics["manual_offers"]))
        self.assertEqual(metrics["label"], "simulacao")
        self.assertIn("Simulação", published)


if __name__ == "__main__":
    unittest.main()
