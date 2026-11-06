"""Rodízio entre equivalentes (passo 7.2 do roteiro): a regra, o motor, a trilha e a API."""

import json
import random
from datetime import timedelta

from app.api.tempo import db_from_local
from app.audit import AuditLog
from app.concentration import POLICIES, Candidate, rerank
from app.llm.guardrails import ShiftFields
from app.pipeline import recommend
from app.ranking.compute import FeatureStore
from app.ranking.evaluate import TOP_K
from app.ranking.rotation import EXPOSURE_TOP, ROTATION_DELTA, ROTATION_WINDOW, rotate
from tests.api_fakes import DEMO_SHIFT, Harness
from tests.helpers import small_dataset, small_model

ROWS = [("a", 0.80), ("b", 0.75), ("c", 0.72), ("d", 0.60), ("e", 0.55)]


def _order(rows, exposure, delta=ROTATION_DELTA):
    result = rotate(rows, score=lambda r: r[1], key=lambda r: r[0], exposure=exposure, delta=delta)
    return [doctor_id for doctor_id, _ in result]


def test_sem_exposicao_vale_a_ordem_do_modelo():
    assert _order(ROWS, {}) == ["a", "b", "c", "d", "e"]


def test_entre_equivalentes_vai_antes_o_menos_exposto():
    # a, b e c estão a até 10 pontos de a: c nunca apareceu e vai primeiro; depois b, menos
    # exposto que a. d está 20 pontos abaixo de a e não passa à frente dele.
    assert _order(ROWS, {"a": 3, "b": 1}) == ["c", "b", "a", "d", "e"]


def test_com_exposicao_igual_vence_o_modelo():
    assert _order(ROWS, {doctor_id: 2 for doctor_id, _ in ROWS}) == ["a", "b", "c", "d", "e"]


def test_ninguem_passa_a_frente_de_quem_e_mais_de_10_pontos_melhor():
    rng = random.Random(72)
    for _ in range(300):
        rows = sorted(
            ((f"m{i}", round(rng.random(), 3)) for i in range(12)), key=lambda r: (-r[1], r[0])
        )
        exposure = {doctor_id: rng.randint(0, 4) for doctor_id, _ in rows}
        score = dict(rows)
        order = _order(rows, exposure)
        assert sorted(order) == sorted(score)  # só reordena: ninguém sai nem entra
        for i, ahead in enumerate(order):
            for behind in order[i + 1 :]:
                assert score[behind] - score[ahead] <= ROTATION_DELTA + 1e-9


def test_a_api_roda_a_politica_medida_no_experimento():
    rodizio10 = next(policy for policy in POLICIES if policy.key == "rodizio10")
    assert rodizio10.delta == ROTATION_DELTA and rodizio10.limit is None
    assert EXPOSURE_TOP == TOP_K
    assert ROTATION_WINDOW == timedelta(days=7)
    rng = random.Random(7)
    candidates = [Candidate(f"m{i}", 0.5, 0.4, round(rng.random(), 3)) for i in range(15)]
    exposure = {c.doctor_id: rng.randint(0, 3) for c in candidates}
    ordered = sorted(candidates, key=lambda c: (-c.score, c.doctor_id))
    expected = rotate(
        ordered, score=lambda c: c.score, key=lambda c: c.doctor_id, exposure=exposure
    )
    assert rerank(candidates, exposure, rodizio10) == expected


def _fields() -> ShiftFields:
    s = DEMO_SHIFT
    return ShiftFields(s.unit_id, s.specialty, s.starts_at, s.ends_at, s.urgency)


def test_sem_exposicao_o_motor_segue_como_na_poc():
    data = small_dataset()
    result = recommend(data, FeatureStore(data), small_model(), _fields(), DEMO_SHIFT.published_at)
    assert result.rotation_delta is None
    assert all(c.model_rank == c.rank and c.exposure == 0 for c in result.candidates)


def test_o_rodizio_reordena_e_fica_na_trilha(tmp_path):
    data = small_dataset()
    store, model = FeatureStore(data), small_model()
    now = DEMO_SHIFT.published_at
    base = recommend(data, store, model, _fields(), now)
    first_id, first_score, _ = base.scored[0]
    equivalents = [doctor_id for doctor_id, s, _ in base.scored[1:] if s >= first_score - 0.10]
    assert equivalents, "a vaga de exemplo precisa de alguém a até 10 pontos do primeiro"

    audit = AuditLog(tmp_path / "trilha.jsonl")
    result = recommend(data, store, model, _fields(), now, audit=audit, exposure={first_id: 3})

    assert result.rotation_delta == ROTATION_DELTA
    assert result.candidates[0].doctor_id == equivalents[0]
    moved = next(c for c in result.candidates if c.doctor_id == first_id)
    assert moved.model_rank == 1 and moved.rank > 1 and moved.exposure == 3
    # A ordem só muda de lugar: os mesmos elegíveis, com os mesmos scores.
    assert sorted(base.scored) == sorted(result.scored)

    rows = [json.loads(line) for line in audit.path.read_text(encoding="utf-8").splitlines()]
    ordering = rows[0]["details"]["ordering"]
    assert ordering["policy"] == "rodizio"
    assert ordering["delta"] == ROTATION_DELTA and ordering["window_days"] == 7
    assert {"doctor_id": first_id, "rank": moved.rank, "model_rank": 1, "exposure": 3} in (
        ordering["moved"]
    )


def test_a_exposicao_conta_so_o_top5_da_ultima_semana():
    h = Harness()
    now = h.clock()
    rows = h.rest.tables["recommendations"]
    base = {"shift_id": "s", "score": 0.5, "model_version": "v", "features": {}, "alerts": []}
    rows += [
        {
            **base,
            "doctor_id": "m1",
            "rank": 1,
            "created_at": db_from_local(now - timedelta(days=1)),
        },
        {
            **base,
            "doctor_id": "m1",
            "rank": 5,
            "created_at": db_from_local(now - timedelta(days=6)),
        },
        {
            **base,
            "doctor_id": "m2",
            "rank": 6,
            "created_at": db_from_local(now - timedelta(days=1)),
        },
        {
            **base,
            "doctor_id": "m3",
            "rank": 2,
            "created_at": db_from_local(now - timedelta(days=8)),
        },
    ]
    assert h.repository.exposure(now - ROTATION_WINDOW, EXPOSURE_TOP) == {"m1": 2}


def test_a_api_conta_a_semana_e_mostra_o_rodizio():
    h = Harness()
    _, first = h.recommended()
    shift_id = h.publish()
    response = h.client.post(f"/shifts/{shift_id}/recommendations", headers=h.coordinator)
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["rotation"] == {"delta": ROTATION_DELTA, "window_days": 7}
    shown_before = set(first[:EXPOSURE_TOP])
    for candidate in body["candidates"]:
        assert candidate["exposure_7d"] == (1 if candidate["doctor_id"] in shown_before else 0)
        assert candidate["model_rank"] >= 1
    generated = [
        row
        for row in h.rest.tables["audit_log"]
        if row["action"] == "recommendation_generated" and row["entity_id"] == shift_id
    ]
    assert generated[0]["details"]["ordering"]["policy"] == "rodizio"


def test_a_politica_mostra_o_rodizio():
    h = Harness()
    response = h.client.get("/policy", headers=h.coordinator)
    assert response.status_code == 200, response.text
    assert response.json()["rotation_delta"] == ROTATION_DELTA
    assert response.json()["rotation_window_days"] == 7
