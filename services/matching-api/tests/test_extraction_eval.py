"""Avaliação da leitura do pedido pelo Gemini: o gabarito, a conta e o relatório publicado."""

import json
from datetime import date
from pathlib import Path
from typing import Any

from app.extraction_eval import (
    FIELDS,
    NATURAL_CASES,
    PER_STYLE,
    STYLES,
    evaluate_extraction,
    render_extraction,
    score,
    score_view,
    synthetic_sample,
    system_with_api_limit,
)
from app.llm.avaliacao import UNIDADES
from app.llm.client import TIMEOUT_MS, LLMUnavailableError
from app.llm.guardrails import ShiftFields, detect_injection
from tests.helpers import small_dataset

DOCS = Path(__file__).resolve().parents[3] / "docs" / "resultados"
NOMES = {unit.id: unit.name for unit in UNIDADES.values()}


class GabaritoPerfeito:
    """Responde com o gabarito de cada pedido natural: o Gemini ideal, sem rede."""

    def __init__(self, ignorar: tuple[str, ...] = ()) -> None:
        self.ignorar = ignorar
        self.chamadas = 0

    def generate_json(self, *, system: str, user: str, schema: dict[str, Any]) -> str:
        self.chamadas += 1
        for _, texto, esperado in NATURAL_CASES:
            if texto in user:
                if texto in self.ignorar:
                    raise LLMUnavailableError("fora do ar")
                return json.dumps(
                    {
                        "unit": NOMES.get(esperado.get("unit_id")),
                        "specialty": esperado.get("specialty"),
                        "starts_at": _iso(esperado.get("starts_at")),
                        "ends_at": _iso(esperado.get("ends_at")),
                        "urgency": esperado.get("urgency"),
                    }
                )
        raise AssertionError(f"pedido fora do conjunto: {user!r}")


class ForaDoAr:
    def generate_json(self, *, system: str, user: str, schema: dict[str, Any]) -> str:
        raise LLMUnavailableError("sem chave")


def _iso(value: Any) -> Any:
    return value.isoformat() if value is not None else None


def test_o_conjunto_natural_tem_ids_unicos_e_campos_validos():
    ids = [caso[0] for caso in NATURAL_CASES]
    assert len(ids) == len(set(ids)) == 24
    for _, texto, esperado in NATURAL_CASES:
        assert set(esperado) <= set(FIELDS)
        assert esperado, "um gabarito vazio não mede nada"
        assert len(texto) < 200


def test_nenhum_pedido_natural_e_barrado_como_ataque():
    """Se fossem barrados, o Gemini nem os leria na API, e o teste não mediria o que diz medir."""
    for caso, texto, _ in NATURAL_CASES:
        assert detect_injection(texto) == [], caso


def test_o_gabarito_natural_inclui_o_que_o_certo_e_nao_inventar():
    nulos = [c for c, _, esperado in NATURAL_CASES if None in esperado.values()]
    assert len(nulos) >= 6


def test_a_conta_separa_campo_errado_de_campo_inventado():
    esperado = {"unit_id": "centro", "specialty": None, "urgency": "high"}
    got = ShiftFields("centro", "pediatria", None, None, "low")
    resultado = score(esperado, got)
    assert resultado == {
        "right": 1,
        "total": 3,
        "wrong": ["specialty", "urgency"],
        "invented": ["specialty"],
        "all_right": False,
    }
    assert score(esperado, None) is None
    assert score({"unit_id": None}, ShiftFields(None, None, None, None, None))["all_right"]


def test_a_amostra_sintetica_e_estratificada_e_sempre_a_mesma():
    dataset = small_dataset()
    primeira = synthetic_sample(dataset, per_style=3, seed=7)
    segunda = synthetic_sample(dataset, per_style=3, seed=7)
    assert [c["id"] for c in primeira] == [c["id"] for c in segunda]
    assert {c["style"] for c in primeira} == set(STYLES)
    assert all(c["style"] != "adversarial" for c in primeira)
    for caso in primeira:
        assert set(caso["expected"]) == set(FIELDS)
        assert caso["today"] == caso["today"].__class__(*caso["today"].timetuple()[:3])
    assert PER_STYLE == 12


def test_um_gemini_ideal_acerta_tudo_no_conjunto_natural():
    cliente = GabaritoPerfeito()
    metricas = evaluate_extraction(
        None, cliente, model="teste", run_date=date(2026, 11, 13), pause_s=0
    )
    natural = metricas["sets"]["natural"]
    # A unidade que não existe ("Leste") vem do Gemini ideal como nulo; está no gabarito.
    assert natural["methods"]["gemini"]["all_right"] == 24
    assert natural["methods"]["sistema"]["all_right"] == 24
    assert natural["methods"]["gemini"]["invented"] == 0
    assert cliente.chamadas == 24
    assert metricas["status"] == {"ok": 24}
    assert metricas["latency"]["answered"] == 24


def test_sem_resposta_o_sistema_cai_nas_regras_e_o_gemini_nao_conta():
    metricas = evaluate_extraction(
        None, ForaDoAr(), model="teste", run_date=date(2026, 11, 13), pause_s=0
    )
    natural = metricas["sets"]["natural"]["methods"]
    assert natural["gemini"]["answered"] == 0
    assert natural["gemini"]["fields_total"] == 0
    assert natural["sistema"]["all_right"] == natural["regras"]["all_right"]
    assert metricas["status"] == {"sem_resposta": 24}
    assert metricas["latency"] is None


def test_o_sistema_usa_as_regras_so_no_pedido_que_o_gemini_nao_respondeu():
    cliente = GabaritoPerfeito(ignorar=(NATURAL_CASES[0][1],))
    metricas = evaluate_extraction(
        None, cliente, model="teste", run_date=date(2026, 11, 13), pause_s=0
    )
    primeiro = metricas["cases"][0]
    assert primeiro["gemini"]["status"] == "sem_resposta"
    assert primeiro["sistema"]["score"] == primeiro["regras"]["score"]
    assert metricas["cases"][1]["sistema"]["score"]["all_right"]


def test_a_pausa_entre_pedidos_so_acontece_entre_pedidos():
    pausas: list[float] = []
    evaluate_extraction(
        None,
        GabaritoPerfeito(),
        model="teste",
        run_date=date(2026, 11, 13),
        pause_s=6.5,
        sleep=pausas.append,
    )
    assert pausas == [6.5] * 23


def test_o_relatorio_publicado_bate_com_os_numeros():
    metrics = json.loads((DOCS / "metricas-extracao.json").read_text(encoding="utf-8"))
    published = (DOCS / "metricas-extracao.md").read_text(encoding="utf-8")
    assert published == render_extraction(metrics)
    assert "Texto sintético ou escrito para o teste" in published
    assert metrics["meta"]["cases"] == len(metrics["cases"])


def _linha(gemini_ms: int, gemini_certo: bool, flags: list[str] | None = None) -> dict[str, Any]:
    certo = {"unit_id": "centro", "specialty": "pediatria"}
    errado = {"unit_id": "centro", "specialty": "clinica_medica"}
    return {
        "expected": {"unit_id": "centro", "specialty": "pediatria"},
        "flags": flags or [],
        # As regras erram aqui de propósito: quem acerta é o Gemini, se o sistema o usar.
        "regras": {"fields": errado},
        "gemini": {"fields": certo if gemini_certo else None, "ms": gemini_ms},
    }


def test_o_sistema_com_limite_da_api_so_usa_o_gemini_se_ele_respondeu_a_tempo():
    assert system_with_api_limit(_linha(TIMEOUT_MS, True))["all_right"]
    assert not system_with_api_limit(_linha(TIMEOUT_MS + 1, True))["all_right"]
    # Sem leitura do Gemini, valem as regras, que aqui erram.
    assert not system_with_api_limit(_linha(500, False))["all_right"]


def test_texto_com_sinal_de_injecao_nunca_chega_ao_gemini_nem_no_sistema():
    assert not system_with_api_limit(_linha(500, True, flags=["ignore_rules"]))["all_right"]


def test_a_conta_sobre_o_json_e_a_mesma_da_conta_sobre_os_campos():
    esperado = {"unit_id": "centro", "specialty": None, "urgency": "high"}
    got = ShiftFields("centro", "pediatria", None, None, "low")
    em_texto = {"unit_id": "centro", "specialty": "pediatria", "urgency": "low"}
    assert score_view(esperado, em_texto) == score(esperado, got)
    assert score_view(esperado, None) is None


def test_o_sistema_com_limite_vem_no_resumo_e_nunca_supera_o_sem_limite_no_gemini_ideal():
    metricas = evaluate_extraction(
        None, GabaritoPerfeito(), model="teste", run_date=date(2026, 11, 13), pause_s=0
    )
    natural = metricas["sets"]["natural"]["methods"]
    assert natural["sistema_api"]["all_right"] == natural["sistema"]["all_right"] == 24
