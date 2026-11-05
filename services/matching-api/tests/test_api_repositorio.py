"""O repositório monta o mesmo `Dataset` dos CSVs: o motor não percebe de onde vieram os dados."""

import json
import tempfile
import unittest
from datetime import datetime, time
from pathlib import Path

from app.api.model_store import (
    ACTIVE_MODEL_PATH,
    ModelMismatchError,
    check_against_registry,
    load_active_model,
)
from app.api.repository import READ_COLUMNS, Repository
from app.api.settings import ConfigError, Settings
from app.api.tempo import db_from_local, local_from_db, local_input
from app.api.world import WorldCache
from app.llm.guardrails import ShiftFields
from app.pipeline import recommend
from app.ranking.compute import FeatureStore
from app.ranking.features import RANKING_FEATURES
from tests.api_fakes import ORG_B, FakeRest, seed_tables
from tests.helpers import small_dataset, small_model
from tests.test_contrato_banco import BROWSER_FORBIDDEN, _columns


class TempoTests(unittest.TestCase):
    def test_instante_do_banco_vira_hora_local(self):
        self.assertEqual(
            local_from_db("2026-11-17T22:00:00+00:00"), datetime(2026, 11, 17, 19, 0)
        )
        self.assertEqual(
            local_from_db("2026-11-17T19:00:00-03:00"), datetime(2026, 11, 17, 19, 0)
        )
        self.assertEqual(
            local_from_db("2026-11-17T22:00:00.5+00:00"), datetime(2026, 11, 17, 19, 0, 0, 500000)
        )

    def test_ida_e_volta_nao_muda_a_hora(self):
        moment = datetime(2026, 11, 17, 7, 30)
        self.assertEqual(local_from_db(db_from_local(moment)), moment)
        self.assertEqual(db_from_local(moment), "2026-11-17T07:30:00-03:00")

    def test_entrada_sem_fuso_ja_e_local(self):
        moment = datetime(2026, 11, 17, 7, 30)
        self.assertEqual(local_input(moment), moment)


class ParidadeComOsCsvTests(unittest.TestCase):
    """A prova central do repositório: o mesmo top 5 vindo do banco ou dos CSVs."""

    @classmethod
    def setUpClass(cls):
        cls.original = small_dataset()
        cls.world = Repository(FakeRest(seed_tables())).load_world()
        cls.loaded = cls.world.dataset

    def test_mesmas_contagens(self):
        self.assertEqual(len(self.loaded.doctors), len(self.original.doctors))
        self.assertEqual(len(self.loaded.shifts), len(self.original.shifts))
        self.assertEqual(len(self.loaded.offers), len(self.original.offers))
        self.assertEqual(
            sum(map(len, self.loaded.windows.values())),
            sum(map(len, self.original.windows.values())),
        )

    def test_horas_e_datas_iguais(self):
        for key, shift in self.original.shifts.items():
            self.assertEqual(self.loaded.shifts[key].starts_at, shift.starts_at)
            self.assertEqual(self.loaded.shifts[key].ends_at, shift.ends_at)
            self.assertEqual(self.loaded.shifts[key].published_at, shift.published_at)
        some_window = next(iter(self.loaded.windows.values()))[0]
        self.assertIsInstance(some_window.start_time, time)

    def test_mesmo_top_5_e_mesmos_scores(self):
        model = small_model()
        original_store = FeatureStore(self.original)
        org = self.original.organizations[0].id
        loaded = self.loaded
        loaded.policy = self.world.policies[org]
        loaded_store = FeatureStore(loaded)
        checked = 0
        for shift in sorted(self.original.shifts.values(), key=lambda s: s.published_at):
            if shift.published_at.month != 3 or checked == 25:
                continue
            fields = ShiftFields(
                shift.unit_id, shift.specialty, shift.starts_at, shift.ends_at, shift.urgency
            )
            left = recommend(self.original, original_store, model, fields, shift.published_at)
            right = recommend(loaded, loaded_store, model, fields, shift.published_at)
            self.assertEqual(
                [(c.doctor_id, round(c.score, 12)) for c in left.candidates],
                [(c.doctor_id, round(c.score, 12)) for c in right.candidates],
            )
            self.assertEqual(left.exclusion_counts(), right.exclusion_counts())
            checked += 1
        self.assertEqual(checked, 25)

    def test_sem_valor_do_plantao_pedidos_nem_gabarito_na_memoria(self):
        self.assertEqual(self.loaded.compensation, {})
        self.assertEqual(self.loaded.requests, [])
        self.assertEqual(self.loaded.latent, {})

    def test_cada_organizacao_tem_a_sua_politica(self):
        self.assertIn(ORG_B, self.world.policies)
        self.assertIn(self.original.organizations[0].id, self.world.policies)


class ContratoDasColunasTests(unittest.TestCase):
    def test_toda_coluna_lida_existe_nas_migracoes(self):
        for table, columns in READ_COLUMNS.items():
            with self.subTest(table=table):
                self.assertLessEqual(set(columns), _columns(table))

    def test_nao_le_coluna_restrita_que_o_motor_nao_usa(self):
        # Só a residência fica: o raio de deslocamento depende dela, e ela nunca sai da API.
        allowed = {"home_lat", "home_lon", "selection_source"}
        for table, forbidden in BROWSER_FORBIDDEN.items():
            read = set(READ_COLUMNS.get(table, ()))
            self.assertFalse((read & forbidden) - allowed, table)
        self.assertFalse({"name_sim", "crm_sim", "phone_sim"} & set(READ_COLUMNS["doctors"]))

    def test_consulta_por_consulta_so_pede_o_que_esta_na_lista(self):
        rest = FakeRest(seed_tables())
        WorldCache(Repository(rest)).load()
        for kind, table, columns in rest.calls:
            self.assertEqual(kind, "select")
            self.assertEqual(columns, READ_COLUMNS[table], table)


class WorldCacheTests(unittest.TestCase):
    def setUp(self):
        self.rest = FakeRest(seed_tables())
        self.repository = Repository(self.rest)
        self.world = WorldCache(self.repository)
        self.world.load()
        self.org = small_dataset().organizations[0].id

    def test_sem_carregar_nao_responde(self):
        with self.assertRaises(RuntimeError):
            WorldCache(self.repository).unit("x")

    def test_usa_a_politica_da_organizacao_pedida(self):
        dataset, _ = self.world.engine(ORG_B)
        self.assertEqual(dataset.policy.organization_id, ORG_B)
        dataset, _ = self.world.engine(self.org)
        self.assertEqual(dataset.policy.organization_id, self.org)

    def test_escrita_atualiza_as_variaveis_e_quem_ja_recebeu_continua_coerente(self):
        _, before = self.world.engine(self.org)
        doctor = small_dataset().offers[0].doctor_id
        called = {o.shift_id for o in small_dataset().offers if o.doctor_id == doctor}
        moment = datetime(2030, 1, 1)
        accepted = len(before.assignments_at(doctor, moment))
        offer = self.repository.add_offer(
            shift_id=next(key for key in small_dataset().shifts if key not in called),
            doctor_id=doctor,
            sequence_no=77,
            ttl_minutes=60,
            now=datetime(2026, 3, 1, 9),
        )
        closed = self.repository.close_offer(
            offer.id, response="accepted", responded_at=datetime(2026, 3, 1, 9, 5)
        )
        self.world.put_offer(closed)
        _, after = self.world.engine(self.org)
        self.assertEqual(len(after.assignments_at(doctor, moment)), accepted + 1)
        self.assertEqual(len(before.assignments_at(doctor, moment)), accepted)

    def test_recarga_que_falha_mantem_os_dados_anteriores(self):
        doctors = self.world.counts()["doctors"]
        self.rest.down = True
        with self.assertRaises(Exception):  # noqa: B017
            self.world.load()
        self.rest.down = False
        self.assertEqual(self.world.counts()["doctors"], doctors)


class ModeloAtivoTests(unittest.TestCase):
    def test_arquivo_versionado_tem_o_contrato_e_o_rotulo(self):
        model = load_active_model()
        self.assertEqual(set(model.feature_names), set(RANKING_FEATURES))
        data = json.loads(ACTIVE_MODEL_PATH.read_text(encoding="utf-8"))
        self.assertEqual(data["label"], "simulacao")

    def test_variavel_proibida_no_arquivo_impede_a_subida(self):
        data = json.loads(ACTIVE_MODEL_PATH.read_text(encoding="utf-8"))
        data["feature_names"] = [*data["feature_names"], "valor_plantao"]
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "modelo.json"
            path.write_text(json.dumps(data), encoding="utf-8")
            with self.assertRaises(ValueError):
                load_active_model(path)

    def test_arquivo_sem_as_variaveis_do_contrato_impede_a_subida(self):
        data = json.loads(ACTIVE_MODEL_PATH.read_text(encoding="utf-8"))
        data["feature_names"] = data["feature_names"][:-1]
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "modelo.json"
            path.write_text(json.dumps(data), encoding="utf-8")
            with self.assertRaises(ModelMismatchError):
                load_active_model(path)

    def test_versao_ou_variaveis_diferentes_do_banco_impedem_a_subida(self):
        model = load_active_model()
        row = {"model_version": model.version, "features": list(model.feature_names)}
        check_against_registry(model, [row])
        for rows in (
            [],
            [row, row],
            [{**row, "model_version": "outra-versao"}],
            [{**row, "features": ["distance_km"]}],
        ):
            with self.subTest(rows=rows), self.assertRaises(ModelMismatchError):
                check_against_registry(model, rows)


class SettingsTests(unittest.TestCase):
    GOOD = {
        "SUPABASE_URL": "https://teste.supabase.invalid/",
        "SUPABASE_SERVICE_ROLE_KEY": "chave",
        "N8N_WEBHOOK_SECRET": "a" * 32,
    }

    def test_le_o_ambiente(self):
        settings = Settings.from_env(
            {**self.GOOD, "API_CORS_ORIGINS": "https://a.invalid, https://b.invalid"}
        )
        self.assertEqual(settings.supabase_url, "https://teste.supabase.invalid")
        self.assertEqual(settings.cors_origins, ("https://a.invalid", "https://b.invalid"))
        self.assertFalse(settings.expose_docs)

    def test_sem_configuracao_nao_sobe(self):
        for name in self.GOOD:
            env = {key: value for key, value in self.GOOD.items() if key != name}
            with self.subTest(name=name), self.assertRaises(ConfigError):
                Settings.from_env(env)

    def test_segredo_fraco_ou_de_exemplo_nao_sobe(self):
        for secret in ("curto", "dev-only-troque-este-segredo-com-mais-de-32-chars"):
            with self.subTest(secret=secret), self.assertRaises(ConfigError):
                Settings.from_env({**self.GOOD, "N8N_WEBHOOK_SECRET": secret})

    def test_cors_aberto_nao_sobe(self):
        with self.assertRaises(ConfigError):
            Settings.from_env({**self.GOOD, "API_CORS_ORIGINS": "*"})


if __name__ == "__main__":
    unittest.main()
