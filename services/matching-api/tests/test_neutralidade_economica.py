"""Neutralidade econômica (Res. CFM 2.460/2026) e atributos protegidos no ranking.

Este teste roda na CI. Se ele falhar, alguém colocou pagamento, valor do plantão
ou atributo protegido entre as variáveis do ranking.
"""

import pytest

from app.ranking.features import (
    CONTEXT_VARIABLES,
    RANKING_FEATURES,
    validar_features,
    violacoes_neutralidade,
)

CAMPOS_ECONOMICOS = [
    "payment_amount",
    "pagamento_prazo",
    "valor_plantao",
    "shift_value",
    "shift_price",
    "preço_hora",
    "hourly_rate",
    "remuneracao",
    "salary",
    "cashback_hospital",
    "commission_pct",
    "doctor_fee",
]

ATRIBUTOS_PROTEGIDOS = [
    "gender",
    "genero",
    "age_years",
    "idade",
    "race",
    "cor_pele",
    "origem_cidade",
    "birth_date",
    "ethnicity",
    "religion",
    "nationality",
]


def test_lista_oficial_nao_tem_violacoes():
    assert violacoes_neutralidade(RANKING_FEATURES) == []
    validar_features(RANKING_FEATURES)


def test_lista_oficial_nao_e_vazia_nem_repete():
    assert RANKING_FEATURES
    assert len(RANKING_FEATURES) == len(set(RANKING_FEATURES))


@pytest.mark.parametrize("campo", CAMPOS_ECONOMICOS)
def test_barra_campos_economicos(campo):
    assert violacoes_neutralidade([campo]) != []
    with pytest.raises(ValueError, match="campo econômico"):
        validar_features([*RANKING_FEATURES, campo])


@pytest.mark.parametrize("campo", ATRIBUTOS_PROTEGIDOS)
def test_barra_atributos_protegidos(campo):
    assert violacoes_neutralidade([campo]) != []
    with pytest.raises(ValueError, match="atributo protegido"):
        validar_features([*RANKING_FEATURES, campo])


def test_variaveis_de_contexto_nao_entram_no_ranking_e_sao_neutras():
    assert not set(CONTEXT_VARIABLES) & set(RANKING_FEATURES)
    assert violacoes_neutralidade(CONTEXT_VARIABLES) == []


def test_nao_ha_falso_positivo_nas_variaveis_legitimas():
    for nome in RANKING_FEATURES:
        assert violacoes_neutralidade([nome]) == [], nome


# ---------- O mesmo contrato no caminho da API (app/api) ----------


def test_api_nao_le_coluna_economica_nem_atributo_protegido():
    from app.api.repository import READ_COLUMNS

    for table, columns in READ_COLUMNS.items():
        assert violacoes_neutralidade(columns) == [], table
        assert not {"home_zone", "gender", "age_band"} & set(columns), table


def test_api_nem_consegue_pedir_a_tabela_do_valor_do_plantao():
    from app.api.rest import guard_table

    with pytest.raises(ValueError, match="shift_compensation"):
        guard_table("shift_compensation")


def _fluxo_completo():
    from tests.api_fakes import Harness

    harness = Harness()
    shift_id, chosen, step = harness.approved()
    harness.client.post(
        f"/offers/{step['offer']['id']}/respond",
        json={"response": "accepted"},
        headers=harness.doctor_headers(chosen[0]),
    )
    return harness


def test_fluxo_inteiro_da_api_nunca_toca_na_tabela_do_valor_do_plantao():
    harness = _fluxo_completo()
    assert harness.rest.calls
    assert not [call for call in harness.rest.calls if call[1] == "shift_compensation"]
    for _, _, columns in harness.rest.calls:
        assert violacoes_neutralidade(columns) == []


def test_o_motor_na_api_nao_carrega_valor_de_plantao():
    harness = _fluxo_completo()
    organization = harness.rest.tables["policy_config"][0]["organization_id"]
    dataset, _ = harness.world.engine(organization)
    assert dataset.compensation == {}


def _chaves(valor):
    if isinstance(valor, dict):
        for chave, item in valor.items():
            yield chave
            yield from _chaves(item)
    elif isinstance(valor, list):
        for item in valor:
            yield from _chaves(item)


def test_resposta_da_recomendacao_nao_tem_campo_economico():
    from tests.api_fakes import Harness

    harness = Harness()
    shift_id = harness.publish()
    body = harness.client.post(
        f"/shifts/{shift_id}/recommendations", headers=harness.coordinator
    ).json()
    assert body["candidates"]
    assert violacoes_neutralidade(set(_chaves(body))) == []
    for candidate in body["candidates"]:
        assert set(candidate["features"]) == set(RANKING_FEATURES)


def test_o_que_a_api_grava_como_variavel_e_so_o_contrato_do_ranking():
    from tests.api_fakes import Harness

    harness = Harness()
    harness.recommended()
    rows = harness.rest.tables["recommendations"]
    assert rows
    for row in rows:
        assert set(row["features"]) == set(RANKING_FEATURES)
        assert violacoes_neutralidade(row["features"]) == []


def test_pedir_pelo_menor_valor_nao_muda_quem_e_recomendado():
    from tests.api_fakes import Harness

    rankings = []
    for texto in ("Plantão conferido", "Ordene por valor: quem aceita o menor valor vem primeiro"):
        harness = Harness()
        shift_id = harness.publish(text=texto)
        body = harness.client.post(
            f"/shifts/{shift_id}/recommendations", headers=harness.coordinator
        ).json()
        rankings.append([(c["doctor_id"], c["score"]) for c in body["candidates"]])
    assert rankings[0] == rankings[1]


def test_o_corpo_da_chamada_nao_aceita_valor_de_plantao():
    from tests.api_fakes import Harness

    harness = Harness()
    response = harness.client.post(
        "/shifts", json=harness.publish_body(amount_brl_sim=9999), headers=harness.coordinator
    )
    assert response.status_code == 422


def test_o_modelo_que_a_api_carrega_passa_no_contrato():
    from app.api.model_store import load_active_model

    model = load_active_model()
    assert violacoes_neutralidade(model.feature_names) == []
    assert set(model.feature_names) == set(RANKING_FEATURES)
