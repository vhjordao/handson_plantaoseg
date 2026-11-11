"""Experimento contra a exclusão por zona (passo 7.3): a regra, as políticas e o relatório."""

import json
from pathlib import Path

from app.ranking.rotation import with_opportunity_slot
from app.zone import (
    BASELINE,
    CURRENT,
    MAX_EXTRA_LOSS,
    MIN_WORST_ZONE,
    POLICIES,
    Eligible,
    ZonePolicy,
    ZoneState,
    adoptable_key,
    order,
    render_zone,
)

DOCS = Path(__file__).resolve().parents[3] / "docs" / "resultados"

ROWS = [("a", 0.80), ("b", 0.75), ("c", 0.72), ("d", 0.60), ("e", 0.40)]


def _slot(exposure, **kwargs):
    result = with_opportunity_slot(
        ROWS, score=lambda r: r[1], key=lambda r: r[0], exposure=exposure, **kwargs
    )
    return [doctor_id for doctor_id, _ in result]


def test_o_lugar_vai_para_o_menos_exposto_dentro_do_alcance():
    # d e e estão do 3º lugar em diante; e fica 40 pontos abaixo de a e não entra no alcance de 30.
    assert _slot({"c": 2, "d": 0, "e": 0}, position=3, reach=0.30) == ["a", "b", "d", "c", "e"]


def test_com_alcance_maior_entra_quem_esta_mais_abaixo():
    assert _slot({"c": 2, "d": 1, "e": 0}, position=3, reach=0.45) == ["a", "b", "e", "c", "d"]


def test_o_primeiro_lugar_nunca_e_reservado_e_a_lista_continua_inteira():
    assert _slot({"a": 9}, position=1, reach=0.50) == [doctor_id for doctor_id, _ in ROWS]
    result = _slot({"d": 0}, position=2, reach=0.30)
    assert sorted(result) == ["a", "b", "c", "d", "e"]
    assert result[0] == "a"


def test_sem_ninguem_no_alcance_a_ordem_nao_muda():
    assert _slot({}, position=3, reach=0.01) == [doctor_id for doctor_id, _ in ROWS]


def test_o_filtro_limita_a_escolha_a_quem_passa_no_teste():
    far = {"e"}
    result = with_opportunity_slot(
        ROWS,
        score=lambda r: r[1],
        key=lambda r: r[0],
        exposure={"c": 0, "d": 0, "e": 5},
        position=2,
        reach=0.50,
        only=lambda r: r[0] in far,
    )
    assert [doctor_id for doctor_id, _ in result][:2] == ["a", "e"]


def _cand(doctor_id, score, distance):
    return Eligible(doctor_id, p_accept=score, p_success=score, score=score, distance_km=distance)


def test_a_politica_de_hoje_e_a_ordem_do_modelo_e_a_atual_e_o_rodizio():
    pool = [_cand("a", 0.80, 2), _cand("b", 0.78, 3), _cand("c", 0.50, 15)]
    zone_of = {"a": "sul", "b": "sul", "c": "leste"}.get
    exposure = {"a": 3}
    by_key = {p.key: p for p in POLICIES}
    hoje = order(pool, exposure, by_key[BASELINE], zone_of, ZoneState())
    atual = order(pool, exposure, by_key[CURRENT], zone_of, ZoneState())
    assert [c.doctor_id for c in hoje] == ["a", "b", "c"]
    assert [c.doctor_id for c in atual] == ["b", "a", "c"]


def test_a_politica_pela_distancia_reserva_o_lugar_a_quem_mora_longe():
    pool = [_cand("a", 0.80, 2), _cand("b", 0.78, 3), _cand("c", 0.60, 15)]
    policy = ZonePolicy("t", "t", slot=2, reach=0.30, min_distance_km=10)
    zone_of = {"a": "sul", "b": "sul", "c": "leste"}.get
    ordered = order(pool, {}, policy, zone_of, ZoneState())
    assert [c.doctor_id for c in ordered] == ["a", "c", "b"]


def test_a_cota_por_zona_so_existe_como_referencia():
    for policy in POLICIES:
        if policy.by_zone:
            assert not policy.adoptable
    assert [p.key for p in POLICIES if not p.adoptable] == ["cota3", "cota2"]


def _metrics(**rows):
    base = {
        "adoptable": True,
        "top5_success": 0.70,
        "top5_success_vs_current": 0.0,
        "worst_zone_top5": 0.1,
    }
    return {"policies": {key: {**base, **changes} for key, changes in rows.items()}}


def test_adota_so_quem_cumpre_os_dois_criterios_e_nunca_a_referencia():
    metrics = _metrics(
        hoje={},
        rodizio10={},
        barata={"worst_zone_top5": MIN_WORST_ZONE + 0.1, "top5_success_vs_current": -0.01},
        cara={"worst_zone_top5": 0.9, "top5_success_vs_current": -(MAX_EXTRA_LOSS + 0.01)},
        referencia={"worst_zone_top5": 0.99, "adoptable": False},
    )
    assert adoptable_key(metrics) == "barata"


def test_sem_politica_que_cumpra_os_dois_nao_adota_nenhuma():
    metrics = _metrics(
        hoje={}, rodizio10={}, cara={"worst_zone_top5": 0.9, "top5_success_vs_current": -0.05}
    )
    assert adoptable_key(metrics) is None


def test_hoje_e_o_rodizio_batem_com_o_experimento_da_concentracao():
    zone = json.loads((DOCS / "metricas-zona.json").read_text(encoding="utf-8"))
    concentration = json.loads((DOCS / "metricas-concentracao.json").read_text(encoding="utf-8"))
    for zone_key, concentration_key in ((BASELINE, "hoje"), (CURRENT, "rodizio10")):
        a, b = zone["policies"][zone_key], concentration["policies"][concentration_key]
        for field in ("top5_success", "top10_effective_offers", "time_mean"):
            assert abs(a[field] - b[field]) < 1e-9, field


def test_relatorio_publicado_bate_com_os_numeros():
    metrics = json.loads((DOCS / "metricas-zona.json").read_text(encoding="utf-8"))
    published = (DOCS / "metricas-zona.md").read_text(encoding="utf-8")
    assert published == render_zone(metrics)
    assert metrics["label"] == "simulacao"
    assert "Simulação" in published
