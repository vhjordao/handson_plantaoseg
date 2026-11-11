"""Custo total, preço e retorno: a conta, as faixas e o relatório publicado."""

import json
from pathlib import Path

from app.costs import (
    SCENARIOS,
    TIERS,
    benefit,
    break_even_shifts,
    costs,
    items,
    pricing,
    render_costs,
)

DOCS = Path(__file__).resolve().parents[3] / "docs" / "resultados"


def test_os_cenarios_vao_do_baixo_ao_alto_em_todo_item():
    for item in items():
        assert 0 <= item.low <= item.base <= item.high, item.key


def test_o_custo_total_soma_os_itens_com_a_contingencia():
    row = costs("base", 1)
    recurring = sum(
        v for k, v in row["lines"].items() if next(i for i in items() if i.key == k).recurring
    )
    assert abs(row["recurring"] - recurring * 1.15) < 1e-6
    assert abs(row["year1"] - (row["recurring"] + row["once"])) < 1e-6
    assert abs(row["three_years"] - (3 * row["recurring"] + row["once"])) < 1e-6


def test_mais_cenario_mais_custo_e_mais_hospitais_menos_custo_por_hospital():
    for n in (1, 3, 10):
        totals = [costs(s, n)["year1"] for s in SCENARIOS]
        assert totals == sorted(totals)
    by_n = [costs("base", n)["year1"] for n in (1, 3, 10)]
    assert by_n == sorted(by_n, reverse=True)
    # A implantação e o treinamento não se dividem: nunca caem a zero.
    assert costs("base", 10)["lines"]["implantacao"] == costs("base", 1)["lines"]["implantacao"]


def test_o_custo_inclui_o_que_o_professor_apontou_como_faltando():
    keys = {i.key for i in items()}
    assert {"implantacao", "treinamento", "parecer", "juridico_anual"} <= keys


def test_o_preco_fecha_so_quando_o_piso_cabe_no_teto():
    for tier in TIERS:
        row = pricing(tier, "base", 3)
        assert row["viable"] == (row["floor"] <= row["ceiling"])
        if row["viable"]:
            assert row["floor"] <= row["suggested"] <= row["ceiling"] + 500
        else:
            assert row["suggested"] is None


def test_o_piso_quase_nao_depende_do_porte_e_o_teto_cresce_com_o_volume():
    floors = [pricing(t, "base", 1)["floor"] for t in TIERS]
    assert max(floors) / min(floors) < 1.01
    ceilings = [pricing(t, "base", 1)["ceiling"] for t in TIERS]
    assert ceilings == sorted(ceilings)


def test_o_volume_minimo_e_onde_o_piso_encontra_o_teto():
    from app.costs import SHIFT_VALUE, VALUE_SHARE, Tier

    for hospitals in (1, 3):
        shifts = break_even_shifts("base", hospitals)
        tier = Tier("t", "t", shifts, 100)
        row = pricing(tier, "base", hospitals)
        # O custo do Gemini varia um pouco com o volume; a diferença é de centavos.
        assert abs(row["floor"] - row["ceiling"]) / row["floor"] < 0.01
        assert abs(row["ceiling"] - VALUE_SHARE * benefit(shifts, 0.5, SHIFT_VALUE)) < 1e-6


def _published_json() -> str:
    return (DOCS / "metricas-custos.json").read_text(encoding="utf-8")


def test_relatorio_publicado_bate_com_os_numeros():
    metrics = json.loads(_published_json())
    published = (DOCS / "metricas-custos.md").read_text(encoding="utf-8")
    assert published == render_costs(metrics)
    assert metrics["label"] == "premissas"
    assert "Premissas, não previsão" in published
