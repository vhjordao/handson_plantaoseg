"""Dados sintéticos: reprodutibilidade, qualidade, segmento e ausência de dado real."""

import hashlib
import tempfile
import unittest
from dataclasses import fields, replace
from pathlib import Path

from app.models import Shift, load_dataset
from app.ranking.features import violacoes_neutralidade
from app.synthetic.generator import generate, generate_sample, save_dataset, write_manifest
from app.synthetic.params import load_params
from app.synthetic.quality import run_checks, summary_stats
from tests.helpers import SMALL, small_dataset, small_params


def digests(directory: Path) -> dict[str, str]:
    files = sorted(directory.glob("*.csv"))
    return {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in files}


class ReprodutibilidadeTests(unittest.TestCase):
    def test_mesma_semente_gera_os_mesmos_arquivos(self):
        with tempfile.TemporaryDirectory() as a, tempfile.TemporaryDirectory() as b:
            save_dataset(generate(small_params()), Path(a))
            save_dataset(generate(small_params()), Path(b))
            self.assertEqual(digests(Path(a)), digests(Path(b)))

    def test_semente_diferente_muda_os_dados(self):
        other = load_params(overrides={**SMALL, "seed": 1})
        with tempfile.TemporaryDirectory() as a, tempfile.TemporaryDirectory() as b:
            save_dataset(generate(small_params()), Path(a))
            save_dataset(generate(other), Path(b))
            self.assertNotEqual(digests(Path(a))["offers.csv"], digests(Path(b))["offers.csv"])

    def test_manifesto_guarda_semente_e_checksums(self):
        params = small_params()
        with tempfile.TemporaryDirectory() as tmp:
            counts = save_dataset(generate(params), Path(tmp))
            manifest = write_manifest(Path(tmp), params, counts)
        self.assertEqual(manifest["seed"], params["seed"])
        self.assertEqual(manifest["label"], "simulacao")
        self.assertEqual(set(manifest["sha256"]), set(counts))

    def test_ida_e_volta_pelo_csv_preserva_as_tabelas(self):
        dataset = small_dataset()
        with tempfile.TemporaryDirectory() as tmp:
            counts = save_dataset(dataset, Path(tmp))
            loaded = load_dataset(Path(tmp))
        self.assertEqual(loaded.shifts, dataset.shifts)
        self.assertEqual(loaded.offers, dataset.offers)
        self.assertEqual(loaded.requests, dataset.requests)
        self.assertEqual(set(loaded.doctors), set(dataset.doctors))
        self.assertEqual(counts["offers"], len(dataset.offers))


class QualidadeTests(unittest.TestCase):
    def test_todas_as_regras_de_qualidade_passam(self):
        results = run_checks(small_dataset())
        failed = [r.rule for r in results if not r.passed]
        self.assertEqual(failed, [])
        self.assertGreaterEqual(len(results), 8)

    def test_detecta_dado_corrompido(self):
        dataset = small_dataset()
        offer = dataset.offers[0]
        broken = replace(offer, accepted=not offer.accepted)
        corrupted = replace(dataset, offers=[broken, *dataset.offers[1:]])
        failed = {r.rule for r in run_checks(corrupted) if not r.passed}
        self.assertTrue(any("Coerência" in rule for rule in failed))


class SegmentoETransparenciaTests(unittest.TestCase):
    def test_segmento_pronto_socorro_de_hospitais_privados(self):
        dataset = small_dataset()
        self.assertEqual(len(dataset.units), 3)
        self.assertEqual({u.kind for u in dataset.units.values()}, {"PS"})
        self.assertEqual({u.ownership for u in dataset.units.values()}, {"privado"})
        self.assertEqual({s.specialty for s in dataset.shifts.values()},
                         {"clinica_medica", "pediatria"})
        self.assertTrue(all(s.starts_at.hour in (7, 19) for s in dataset.shifts.values()))

    def test_dados_pessoais_sao_marcados_como_simulacao(self):
        for doctor in small_dataset().doctors.values():
            self.assertTrue(doctor.crm_sim.startswith("SIM-"))
            self.assertTrue(doctor.phone_sim.startswith("+55 00 "))

    def test_vaga_nao_tem_campo_de_pagamento(self):
        names = [f.name for f in fields(Shift)]
        self.assertEqual(violacoes_neutralidade(names), [])
        self.assertTrue(small_dataset().compensation)  # o valor existe, mas em tabela separada

    def test_amostra_nao_traz_a_tabela_de_gabarito(self):
        with tempfile.TemporaryDirectory() as tmp:
            counts = generate_sample(Path(tmp))
            self.assertFalse((Path(tmp) / "doctors_latent.csv").exists())
            self.assertNotIn("doctors_latent", counts)
            self.assertTrue(all(r.passed for r in run_checks(load_dataset(Path(tmp)))))

    def test_resumo_traz_os_indicadores_da_simulacao(self):
        stats = summary_stats(small_dataset())
        self.assertGreater(stats["offers"], 0)
        self.assertTrue(0 < stats["acceptance_rate"] < 1)
        self.assertAlmostEqual(stats["adversarial_share"], 0.15, delta=0.03)


if __name__ == "__main__":
    unittest.main()
