"""As migrações do banco e o código não podem divergir nas listas fechadas.

Roda sem banco e sem Docker: lê o SQL como texto. Os testes de comportamento (RLS, trilha e
restrições) são os de pgTAP em `supabase/tests`, que a CI roda no Postgres do Supabase.
"""

import re
import unittest
from dataclasses import fields
from pathlib import Path

from app.audit import ACTIONS, FORBIDDEN_DETAIL_KEYS
from app.models import TABLES
from app.ranking.features import RANKING_FEATURES
from app.rules import RULE_TEXTS

MIGRATIONS = Path(__file__).resolve().parents[3] / "supabase" / "migrations"
SQL = "\n".join(path.read_text(encoding="utf-8") for path in sorted(MIGRATIONS.glob("*.sql")))

# Papéis pii-sim, auditoria, gabarito, rótulo e meta do dicionário de dados.
BROWSER_FORBIDDEN = {
    "doctors": {"phone_sim", "home_lat", "home_lon", "home_zone", "gender", "age_band"},
    "shift_requests": {
        "style",
        "gt_unit_id",
        "gt_specialty",
        "gt_starts_at",
        "gt_ends_at",
        "gt_urgency",
        "is_adversarial",
        "attack_type",
    },
    "offers": {"selection_source", "y_success", "injected_violation"},
}


def _columns(table: str) -> set[str]:
    match = re.search(rf"create table public\.{table} \((.*?)\n\);", SQL, re.DOTALL)
    assert match, f"tabela {table} não encontrada nas migrações"
    names = re.findall(r"^  ([a-z_0-9]+) ", match.group(1), re.MULTILINE)
    # Colunas que uma migração posterior acrescentou com `alter table ... add column`.
    added = re.findall(
        rf"alter table public\.{table}\s+add column (?:if not exists )?([a-z_0-9]+)", SQL
    )
    return {name for name in names if name not in {"check", "unique", "primary", "foreign"}} | set(
        added
    )


def _enum(name: str) -> set[str]:
    match = re.search(rf"create type public\.{name} as enum \((.*?)\);", SQL, re.DOTALL)
    assert match, f"tipo {name} não encontrado nas migrações"
    added = re.findall(rf"alter type public\.{name} add value if not exists '([^']+)'", SQL)
    return set(re.findall(r"'([^']+)'", match.group(1))) | set(added)


def _browser_columns(table: str) -> set[str]:
    grants = re.findall(
        rf"grant select \(([^)]*)\)\s+on public\.{table} to authenticated", SQL, re.DOTALL
    )
    return {column.strip() for grant in grants for column in grant.split(",")}


class ContratoDoBancoTests(unittest.TestCase):
    def test_tabelas_geradas_existem_com_as_mesmas_colunas(self):
        for table, cls in TABLES.items():
            if table == "doctors_latent":
                continue
            with self.subTest(table=table):
                self.assertEqual(_columns(table), {f.name for f in fields(cls)})

    def test_gabarito_do_simulador_nao_entra_no_banco(self):
        self.assertNotIn("create table public.doctors_latent", SQL)
        self.assertNotIn("reliability", SQL)

    def test_toda_tabela_tem_rls_ligada(self):
        tables = re.findall(r"create table public\.([a-z_]+) \(", SQL)
        self.assertGreater(len(tables), 10)
        for table in tables:
            with self.subTest(table=table):
                self.assertIn(f"alter table public.{table} enable row level security;", SQL)

    def test_lista_fechada_de_variaveis_e_igual_a_do_ranking(self):
        lists = re.findall(r"array\[(.*?)\]::text\[\]", SQL, re.DOTALL)
        self.assertEqual(
            len(lists), 3, "model_registry e as variáveis e contribuições da recomendação"
        )
        for items in lists:
            self.assertEqual(set(re.findall(r"'([^']+)'", items)), set(RANKING_FEATURES))

    def test_acoes_da_trilha_sao_as_de_audit_py(self):
        self.assertEqual(_enum("audit_action"), set(ACTIONS))

    def test_chaves_proibidas_da_trilha_sao_as_de_audit_py(self):
        match = re.search(r"'\"\(([a-z_|]+)\)\"", SQL)
        self.assertIsNotNone(match)
        self.assertEqual(set(match.group(1).split("|")), set(FORBIDDEN_DETAIL_KEYS))

    def test_regras_de_exclusao_sao_as_de_rules_py(self):
        self.assertEqual(_enum("exclusion_rule"), set(RULE_TEXTS))

    def test_navegador_so_recebe_colunas_listadas_e_nunca_as_restritas(self):
        self.assertIsNone(
            re.search(r"grant (select|insert|update|delete|all)\b[^(;]*to authenticated", SQL),
            "permissão de tabela inteira para o navegador",
        )
        for table, forbidden in BROWSER_FORBIDDEN.items():
            with self.subTest(table=table):
                columns = _browser_columns(table)
                self.assertTrue(columns)
                self.assertFalse(columns & forbidden)

    def test_valor_do_plantao_so_existe_na_tabela_restrita(self):
        self.assertEqual(_browser_columns("shift_compensation"), set())
        self.assertNotRegex(" ".join(_columns("shifts")), r"amount|valor|pagamento|price|pay")
        self.assertEqual(SQL.count("amount_brl_sim"), 2, "só a coluna e a sua restrição")


if __name__ == "__main__":
    unittest.main()
