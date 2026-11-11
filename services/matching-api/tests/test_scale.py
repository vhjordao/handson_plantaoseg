"""Escala hospitalar: a réplica da rede, o modelo de volume e o relatório publicado."""

import json
from pathlib import Path

from app.scale import (
    COORD_POLL_AFTER,
    COORD_POLL_NOW,
    DOCTOR_POLL_AFTER,
    DOCTOR_POLL_NOW,
    HOSPITALS,
    render_scale,
    scale_dataset,
    workload,
)
from tests.helpers import small_dataset

DOCS = Path(__file__).resolve().parents[3] / "docs" / "resultados"


def _measured() -> dict:
    """Medições inventadas só para testar a conta: o custo cresce em linha reta com os médicos."""
    rows = [
        {
            "factor": factor,
            "doctors": 300 * factor,
            "offers": 7555 * factor,
            "windows": 3391 * factor,
            "recommend_median_ms": 4.0 * factor,
            "recommend_p95_ms": 5.0 * factor,
            "store_build_ms": 12.0 * factor,
            "memory_mb": 4.0 * factor,
        }
        for factor in (1, 3, 10, 30)
    ]
    return {"memory_per_copy_mb": 4.0, "rows": rows}


def test_a_rede_replicada_multiplica_medicos_ofertas_e_disponibilidades():
    base = small_dataset()
    triple = scale_dataset(base, 3)
    assert len(triple.doctors) == 3 * len(base.doctors)
    assert len(triple.offers) == 3 * len(base.offers)
    assert sum(len(v) for v in triple.windows.values()) == 3 * sum(
        len(v) for v in base.windows.values()
    )
    assert len({o.id for o in triple.offers}) == len(triple.offers)
    assert triple.shifts == base.shifts
    # Toda oferta e toda disponibilidade aponta para um médico que existe.
    assert {o.doctor_id for o in triple.offers} <= set(triple.doctors)
    assert all(w.doctor_id in triple.doctors for rows in triple.windows.values() for w in rows)


def test_fator_um_nao_muda_a_rede():
    base = small_dataset()
    same = scale_dataset(base, 1)
    assert len(same.doctors) == len(base.doctors)
    assert len(same.offers) == len(base.offers)


def test_quanto_maior_o_hospital_mais_cada_limite_aperta():
    rows = workload(_measured())
    assert [h["key"] for h in rows] == [h.key for h in HOSPITALS]
    cycles = [h["cycle_cpu_s"] for h in rows]
    assert cycles == sorted(cycles)
    assert rows[0]["use"]["cpu"] < rows[-1]["use"]["cpu"]
    assert rows[0]["use"]["memory"] < rows[-1]["use"]["memory"]


def test_menos_requisicoes_por_consulta_derrubam_as_leituras_do_banco():
    assert DOCTOR_POLL_AFTER < DOCTOR_POLL_NOW and COORD_POLL_AFTER < COORD_POLL_NOW
    for hospital in workload(_measured()):
        assert hospital["reads_per_second_after"] < hospital["reads_per_second_now"]
    pequeno, rede = workload(_measured())[0], workload(_measured())[-1]
    assert pequeno["status"]["reads_now"] == "folga"
    assert rede["status"]["reads_now"] == "excede"


def test_relatorio_publicado_bate_com_os_numeros():
    metrics = json.loads((DOCS / "metricas-escala.json").read_text(encoding="utf-8"))
    published = (DOCS / "metricas-escala.md").read_text(encoding="utf-8")
    assert published == render_scale(metrics)
    assert metrics["label"] == "simulacao"
    assert "Simulação" in published
