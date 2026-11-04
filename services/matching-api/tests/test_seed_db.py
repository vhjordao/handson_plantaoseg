"""Carga do banco: as datas andam em semanas inteiras e nenhuma métrica muda."""

import json
import re
import unittest
from dataclasses import fields
from datetime import date, datetime, timedelta

from app.ranking.evaluate import evaluate
from app.seed_db import (
    DEMO_DAY,
    literal,
    metric_differences,
    render_seed,
    shift_dataset,
    shift_params,
    weeks_until,
)
from tests.helpers import small_dataset, small_params

WEEKS = 6


def _date_values(row):
    return {
        field.name: getattr(row, field.name)
        for field in fields(row)
        if isinstance(getattr(row, field.name), date)
    }


def _without_strings(sql: str) -> str:
    """O SQL sem o conteúdo dos textos: o que sobra é só o que o banco executa."""
    return re.sub(r"'(?:[^']|'')*'", "''", sql)


class DeslocamentoTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.dataset = small_dataset()
        cls.moved = shift_dataset(cls.dataset, WEEKS)

    def test_toda_data_anda_as_mesmas_semanas(self):
        delta = timedelta(weeks=WEEKS)
        pairs = [
            *zip(self.dataset.organizations, self.moved.organizations, strict=True),
            *zip(self.dataset.requests, self.moved.requests, strict=True),
            *zip(self.dataset.offers, self.moved.offers, strict=True),
            (self.dataset.policy, self.moved.policy),
        ]
        for mapping in ("doctors", "shifts"):
            before, after = getattr(self.dataset, mapping), getattr(self.moved, mapping)
            pairs += [(row, after[key]) for key, row in before.items()]
        for key, rows in self.dataset.windows.items():
            pairs += list(zip(rows, self.moved.windows[key], strict=True))
        checked = 0
        for old, new in pairs:
            for name, value in _date_values(old).items():
                self.assertEqual(getattr(new, name), value + delta, name)
                checked += 1
        self.assertGreater(checked, 1000)

    def test_dia_da_semana_e_duracao_nao_mudam(self):
        for key, shift in self.dataset.shifts.items():
            moved = self.moved.shifts[key]
            self.assertEqual(moved.starts_at.weekday(), shift.starts_at.weekday())
            self.assertEqual(moved.ends_at - moved.starts_at, shift.ends_at - shift.starts_at)
            self.assertEqual(moved.starts_at.hour, shift.starts_at.hour)

    def test_o_que_nao_e_data_fica_igual(self):
        key = next(iter(self.dataset.doctors))
        self.assertEqual(self.moved.doctors[key].crm_sim, self.dataset.doctors[key].crm_sim)
        self.assertEqual(self.moved.units, self.dataset.units)
        self.assertEqual(self.moved.compensation, self.dataset.compensation)

    def test_semanas_inteiras_terminam_antes_da_apresentacao(self):
        weeks = weeks_until(self.dataset)
        demo = datetime.combine(DEMO_DAY, datetime.min.time())
        last_shift = max(s.ends_at for s in self.dataset.shifts.values())
        self.assertLessEqual(last_shift + timedelta(weeks=weeks), demo)
        self.assertGreater(last_shift + timedelta(weeks=weeks + 1), demo)

    def test_nenhuma_metrica_muda_com_o_deslocamento(self):
        _, before = evaluate(self.dataset, small_params())
        _, after = evaluate(self.moved, shift_params(small_params(), WEEKS))
        self.assertEqual(metric_differences(before, after), [])
        self.assertNotEqual(before["test_start"], after["test_start"])

    def test_a_comparacao_acusa_diferenca_real(self):
        published = {"auc": 0.75, "tabela": [{"taxa": 0.5}], "n": 10, "rotulo": "simulacao"}
        self.assertEqual(metric_differences(published, json.loads(json.dumps(published))), [])
        self.assertEqual(metric_differences(published, {**published, "auc": 0.76}), [".auc"])
        self.assertEqual(
            metric_differences(published, {**published, "tabela": [{"taxa": 0.6}]}),
            [".tabela[0].taxa"],
        )
        self.assertEqual(metric_differences(published, {"auc": 0.75}), [".n", ".rotulo", ".tabela"])
        self.assertEqual(metric_differences(published, {**published, "n": 10 + 1e-12}), [])


class ArquivoDaCargaTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.dataset = small_dataset()
        _, metrics = evaluate(cls.dataset, small_params())
        cls.registry = {
            "model": {
                "version": "logreg-v1",
                "kind": "logistic_regression",
                "feature_names": ["distance_km", "specialty_match"],
            },
            "metrics": metrics,
        }
        cls.sql = render_seed(cls.dataset, small_params(), cls.registry, WEEKS)
        cls.code = _without_strings(cls.sql)

    def test_mesma_entrada_mesmo_arquivo(self):
        self.assertEqual(render_seed(self.dataset, small_params(), self.registry, WEEKS), self.sql)

    def test_gabarito_do_simulador_nao_entra(self):
        self.assertNotIn("public.doctors_latent", self.code)
        self.assertNotIn("reliability", self.sql)

    def test_colunas_derivadas_ficam_para_o_banco(self):
        columns = re.search(r"insert into public\.offers \(([^)]*)\)", self.code).group(1)
        self.assertNotIn("accepted", columns.split(", "))
        self.assertNotIn("y_success", columns.split(", "))
        self.assertIn("response", columns.split(", "))

    def test_ordem_respeita_as_chaves_estrangeiras(self):
        order = list(dict.fromkeys(re.findall(r"insert into public\.(\w+)", self.code)))
        self.assertEqual(
            order,
            [
                "organizations",
                "units",
                "doctors",
                "doctor_availability",
                "policy_config",
                "shift_requests",
                "shifts",
                "shift_compensation",
                "offers",
                "model_registry",
            ],
        )

    def test_recusa_banco_com_dados_e_confere_as_contagens(self):
        self.assertLess(self.sql.index("o banco já tem dados"), self.sql.index("insert into"))
        self.assertIn(f"from public.offers) <> {len(self.dataset.offers)}", self.sql)
        accepted = sum(o.accepted for o in self.dataset.offers)
        self.assertIn(f"from public.offers where accepted) <> {accepted}", self.sql)
        self.assertLess(self.sql.rindex("insert into"), self.sql.index("não bateu"))
        self.assertTrue(self.sql.strip().endswith("commit;"))

    def test_todo_instante_leva_o_fuso(self):
        self.assertIsNone(re.search(r"'\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d'", self.sql))
        self.assertRegex(self.sql, r"'\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d-03:00'")

    def test_as_datas_ja_estao_deslocadas(self):
        first = min(s.starts_at for s in self.dataset.shifts.values()) + timedelta(weeks=WEEKS)
        self.assertIn(f"'{first:%Y-%m-%dT%H:%M:%S}-03:00'", self.sql)
        before = min(s.starts_at for s in self.dataset.shifts.values())
        self.assertNotIn(f"'{before:%Y-%m-%dT%H:%M:%S}-03:00'", self.sql)

    def test_texto_hostil_nao_escapa_das_aspas(self):
        self.assertEqual(literal("O'Brien"), "'O''Brien'")
        self.assertEqual(
            literal("'); drop table public.doctors; --"), "'''); drop table public.doctors; --'"
        )
        self.assertEqual(literal("barra \\ fica como está"), "'barra \\ fica como está'")
        adversarial = [r.raw_text for r in self.dataset.requests if r.is_adversarial]
        self.assertTrue(adversarial)
        without_blocks = re.sub(r"do \$\$.*?\$\$;", "do $$;", self.code, flags=re.DOTALL)
        for statement in filter(str.strip, without_blocks.split(";\n")):
            self.assertRegex(
                statement.lstrip(),
                r"^(--|begin|commit|do \$\$|insert into public\.\w+ \()",
                statement[:80],
            )
        self.assertEqual(self.code.count("drop "), 0)

    def test_tipos_viram_literais_do_banco(self):
        self.assertEqual(literal(None), "null")
        self.assertEqual(literal(True), "true")
        self.assertEqual(literal(False), "false")
        self.assertEqual(literal(1.5), "1.5")
        self.assertEqual(literal(date(2026, 11, 12)), "'2026-11-12'")
        self.assertEqual(literal(["a", "b"]), "array['a', 'b']::text[]")
        self.assertEqual(literal({"chave": "d'água"}), "'{\"chave\": \"d''água\"}'::jsonb")

    def test_registro_do_modelo_entra_com_as_datas_deslocadas(self):
        moved = shift_params(small_params(), WEEKS)
        self.assertIn(f"'{moved['test_start']}..{moved['end_date']}'", self.sql)
        self.assertIn("'active'", self.sql)
        self.assertIn("array['distance_km', 'specialty_match']::text[]", self.sql)


if __name__ == "__main__":
    unittest.main()
