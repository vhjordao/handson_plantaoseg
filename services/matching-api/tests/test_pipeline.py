"""Pipeline ponta a ponta: regras, ranking, explicação, aprovação humana e auditoria."""

import json
import tempfile
import unittest
from pathlib import Path

from app.audit import AuditLog
from app.llm.guardrails import ShiftFields
from app.pipeline import approve, recommend
from app.ranking.compute import FeatureStore
from app.rules import RULE_TEXTS, evaluate_candidate
from tests.helpers import small_dataset, small_model


class FakeClient:
    def __init__(self, response: str) -> None:
        self.response = response

    def generate_json(self, *, system, user, schema):
        return self.response


class PipelineTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.dataset = small_dataset()
        cls.store = FeatureStore(cls.dataset)
        cls.model = small_model()
        shift = next(s for s in cls.dataset.shifts.values() if s.published_at.month == 3)
        cls.shift = shift
        cls.fields = ShiftFields(
            shift.unit_id, shift.specialty, shift.starts_at, shift.ends_at, shift.urgency
        )

    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self._tmp.cleanup)
        self.audit = AuditLog(Path(self._tmp.name) / "audit.jsonl")

    def run_recommend(self, **kwargs):
        return recommend(
            self.dataset, self.store, self.model, self.fields, self.shift.published_at,
            audit=self.audit, **kwargs,
        )

    def test_top_k_ordenado_e_todos_elegiveis(self):
        rec = self.run_recommend()
        self.assertTrue(0 < len(rec.candidates) <= 5)
        self.assertEqual([c.rank for c in rec.candidates], list(range(1, len(rec.candidates) + 1)))
        scores = [c.score for c in rec.candidates]
        self.assertEqual(scores, sorted(scores, reverse=True))
        unit = self.dataset.units[self.shift.unit_id]
        for c in rec.candidates:
            doctor = self.dataset.doctors[c.doctor_id]
            check = evaluate_candidate(
                doctor, specialty=self.shift.specialty, starts_at=self.shift.starts_at,
                ends_at=self.shift.ends_at, unit=unit, policy=self.dataset.policy,
                windows=self.dataset.windows.get(doctor.id, []),
                assignments=self.store.assignments_at(doctor.id, self.shift.published_at),
            )
            self.assertTrue(check.eligible)

    def test_todo_medico_ou_e_candidato_ou_tem_regra_de_exclusao(self):
        rec = self.run_recommend()
        self.assertEqual(rec.eligible_count + len(rec.exclusions), len(self.dataset.doctors))
        self.assertTrue(all(e.rule_code in RULE_TEXTS and e.rule_text for e in rec.exclusions))

    def test_explicacao_so_cita_fatores_do_candidato(self):
        for c in self.run_recommend().candidates:
            self.assertTrue(set(c.explanation.factors_cited) <= set(c.features))
            self.assertTrue(c.explanation.text)

    def test_resultado_e_deterministico(self):
        first = self.run_recommend()
        second = self.run_recommend()
        self.assertEqual([c.doctor_id for c in first.candidates],
                         [c.doctor_id for c in second.candidates])

    def test_sem_campos_obrigatorios_nao_recomenda(self):
        with self.assertRaises(ValueError):
            recommend(
                self.dataset, self.store, self.model,
                ShiftFields(None, "pediatria", None, None, None), self.shift.published_at,
            )

    def test_aprovacao_humana_e_so_de_candidatos_recomendados(self):
        rec = self.run_recommend()
        with self.assertRaises(ValueError):
            approve(self.audit, rec, ["id-que-nao-foi-recomendado"],
                    now=self.shift.published_at, coordinator_id="coord-1")
        with self.assertRaises(ValueError):
            approve(self.audit, rec, [], now=self.shift.published_at, coordinator_id="coord-1")
        record = approve(self.audit, rec, [rec.candidates[0].doctor_id],
                         now=self.shift.published_at, coordinator_id="coord-1")
        self.assertEqual(record["action"], "recommendation_approved")
        self.assertEqual(record["actor_role"], "coordinator")
        self.assertEqual(self.audit.verify()[0], True)

    def test_recomendar_nao_envia_oferta_so_registra(self):
        rec = self.run_recommend()
        actions = [json.loads(line)["action"] for line in self.audit.path.read_text().splitlines()]
        self.assertEqual(actions[0], "recommendation_generated")
        self.assertNotIn("recommendation_approved", actions)
        self.assertEqual(actions.count("explanation_generated"), len(rec.candidates))

    def test_trilha_nao_vaza_dado_pessoal_nem_pagamento(self):
        self.run_recommend()
        text = self.audit.path.read_text(encoding="utf-8")
        for doctor in self.dataset.doctors.values():
            for secret in (doctor.name_sim, doctor.crm_sim, doctor.phone_sim):
                self.assertNotIn(secret, text)
        self.assertNotIn("amount", text)

    def test_versao_do_modelo_fica_na_trilha(self):
        self.run_recommend()
        records = [json.loads(line) for line in self.audit.path.read_text().splitlines()]
        self.assertTrue(all(r["model_version"] == self.model.version for r in records))

    def test_llm_invalido_nao_derruba_a_recomendacao(self):
        rec = self.run_recommend(client=FakeClient("isto não é json"))
        self.assertTrue(rec.candidates)
        self.assertTrue(all(c.explanation.source == "template" for c in rec.candidates))
        self.assertTrue(all(c.explanation_fallback == "json_invalido" for c in rec.candidates))


if __name__ == "__main__":
    unittest.main()
