"""Neutralidade econômica (Res. CFM 2.460/2026) e atributos protegidos no ranking.

Este teste roda na CI. Se ele falhar, alguém colocou pagamento, valor do plantão
ou atributo protegido entre as variáveis do ranking.
"""

import pytest

from app.ranking.features import RANKING_FEATURES, validar_features, violacoes_neutralidade

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


def test_nao_ha_falso_positivo_nas_variaveis_legitimas():
    for nome in RANKING_FEATURES:
        assert violacoes_neutralidade([nome]) == [], nome
