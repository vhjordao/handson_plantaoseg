"""Regressão logística contra LightGBM (E.4): o que não depende da biblioteca, que roda só na CI."""

from app.ml_compare import (
    BASE,
    MIN_GAIN,
    NONLINEAR,
    NONLINEAR_ACCEPT,
    decide,
    evaluate_lightgbm,
    lightgbm_chart,
    render_lightgbm,
    verdict,
    worlds,
)
from app.ranking.features import RANKING_FEATURES
from app.ranking.model import train_model
from app.synthetic import truth
from app.synthetic.params import load_params

STATE = {
    "distance_km": 20.0,
    "preference_match": 1.0,
    "reliability": 0.5,
    "covered": True,
    "hours_since_last": 30.0,
    "shifts_last_30d": 4.0,
    "urgency": "normal",
    "specialty_match": 1.0,
}


def test_sem_os_termos_extras_a_chance_verdadeira_nao_muda():
    accept = load_params()["accept"]
    assert "distance_far" not in accept and "distance_preference" not in accept
    explicit = {**accept, "distance_far": 0.0, "distance_preference": 0.0}
    assert truth.p_accept(accept, **STATE) == truth.p_accept(explicit, **STATE)


def test_o_mundo_nao_linear_pesa_a_distancia_longe_e_a_interacao_com_a_preferencia():
    accept = load_params()["accept"]
    nonlinear = {**accept, **NONLINEAR_ACCEPT}
    far = {**STATE, "distance_km": 25.0}
    near = {**STATE, "distance_km": 10.0}
    # Acima de 15 km o aceite cai mais do que a regra linear dizia; abaixo, só a interação mexe.
    assert truth.p_accept(nonlinear, **far) < truth.p_accept(accept, **far)
    no_preference = {**near, "preference_match": 0.0}
    assert truth.p_accept(nonlinear, **no_preference) == truth.p_accept(accept, **no_preference)


def test_os_mundos_sao_a_base_tres_sementes_e_a_regra_nao_linear():
    base = load_params()
    names = [name for name, _ in worlds(base)]
    assert names == [BASE, "Outra semente (1)", "Outra semente (2)", "Outra semente (3)", NONLINEAR]
    assert dict(worlds(base))[BASE] == base
    assert dict(worlds(base))[NONLINEAR]["accept"]["distance_far"] == -0.30


def test_veredito_pede_um_ponto_e_tres_erros_padrao():
    assert verdict(MIN_GAIN + 0.005, 0.002) == "ganha"
    assert verdict(MIN_GAIN + 0.005, 0.01) == "empata"  # grande demais para o ruído
    assert verdict(0.002, 0.0001) == "empata"  # pequeno demais, mesmo sem ruído
    assert verdict(-(MIN_GAIN + 0.005), 0.002) == "perde"


def test_so_troca_se_ganhar_na_base_e_no_mundo_nao_linear():
    def row(world, gain):
        return {"world": world, "gain": gain, "gain_se": 0.001}

    assert decide([row(BASE, 0.02), row(NONLINEAR, 0.03)])["swap"] is True
    assert decide([row(BASE, 0.0), row(NONLINEAR, 0.03)])["swap"] is False
    assert decide([row(BASE, 0.02), row(NONLINEAR, 0.0)])["swap"] is False


def _fake_fit(matrix, labels):
    """Um treino no lugar do LightGBM: a regressão logística, com outro l2."""
    model = train_model(
        [dict(zip(RANKING_FEATURES, r, strict=True)) for r in matrix], labels, "f", 50
    )

    def predict(rows):
        return [model.probability(dict(zip(RANKING_FEATURES, r, strict=True))) for r in rows]

    return predict, {"library": "treino falso dos testes", "importance": {"distance_km": 0.5}}


def test_a_avaliacao_roda_ponta_a_ponta_e_o_relatorio_diz_simulacao():
    metrics = evaluate_lightgbm(load_params(), fit=_fake_fit, only=(BASE, NONLINEAR))
    by_world = {row["world"]: row for row in metrics["rows"]}
    base = by_world[BASE]
    # A comparação usa as mesmas vagas e o mesmo modelo da avaliação publicada.
    assert abs(base["top5_logistic"] - 0.7123) < 0.001
    assert base["top5_logistic"] <= base["top5_oracle"]
    assert by_world[NONLINEAR]["accept_rate"] > base["accept_rate"]
    for row in metrics["rows"]:
        assert abs(row["gain"]) < 0.01  # o treino falso é quase a mesma regressão
    full = {
        **metrics,
        "rows": [
            *metrics["rows"],
            *({**base, "world": f"Outra semente ({i})"} for i in (1, 2, 3)),
        ],
        "decision": decide(
            [
                *metrics["rows"],
                *({**base, "world": f"Outra semente ({i})"} for i in (1, 2, 3)),
            ]
        ),
    }
    text = render_lightgbm(full)
    assert "Simulação" in text and "circularidade" in text
    assert "a regressão logística continua" in text
    assert lightgbm_chart(full).startswith("<svg")
