"""Revisão às cegas: coordenadores comparam as listas do modelo e do baseline sem saber qual é qual.

Mede com pessoas reais, sobre vagas simuladas e sem nenhum dado pessoal, o que a simulação não mede:
se a recomendação faz sentido para quem decide. É daqui que sai a meta da Entrega 1 de 60% de
recomendações aceitas pelo coordenador. O resultado vale como sinal de amostra pequena, não como
prova: o gabarito e o modo de calcular estão no arquivo de gabarito.
"""

import random
from dataclasses import dataclass
from datetime import datetime
from typing import Any

from app.models import Dataset, Shift
from app.ranking.baseline import baseline_score
from app.ranking.compute import HOURS_CAP, FeatureStore
from app.ranking.evaluate import TOP_K, eligible_pool
from app.ranking.model import LogisticModel
from app.ranking.report import num, pct

N_CASES = 10
WEEKDAYS = ("segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo")
SPECIALTIES = {"clinica_medica": "Clínica médica", "pediatria": "Pediatria"}
URGENCY = {"high": "alta", "medium": "média", "low": "baixa"}
PERIODS = {"night": "noturno", "day": "diurno"}
HEADER = (
    "| Médico | Especialidade | Distância | Prefere o período | Aceite, 90 d "
    "| Comparece, 90 d | Último plantão | Plantões, 30 d |"
)
RULE = "| --- | --- | ---: | --- | ---: | ---: | ---: | ---: |"


@dataclass(frozen=True, slots=True)
class Listed:
    """O que o coordenador vê de um candidato: nada de nome, CRM nem telefone."""

    code: str
    specialty: str
    distance_km: float
    prefers: bool
    acceptance: float
    attendance: float
    hours_since: float
    load_30d: float


@dataclass(frozen=True, slots=True)
class Case:
    number: int
    shift_id: str
    title: str
    list_a: tuple[Listed, ...]
    list_b: tuple[Listed, ...]
    a_source: str

    @property
    def b_source(self) -> str:
        return "baseline" if self.a_source == "modelo" else "modelo"

    @property
    def shared(self) -> int:
        return len({r.code for r in self.list_a} & {r.code for r in self.list_b})


def doctor_code(doctor_id: str) -> str:
    """Código curto da folha, que não diz nada sobre a pessoa simulada."""
    return f"M{doctor_id[:4].upper()}"


def _listed(doctor_id: str, f: dict[str, float]) -> Listed:
    return Listed(
        code=doctor_code(doctor_id),
        specialty="principal" if f["specialty_match"] >= 1.0 else "secundária",
        distance_km=f["distance_km"],
        prefers=f["night_shift_preference_match"] >= 1.0,
        acceptance=f["acceptance_rate_90d"],
        attendance=f["attendance_rate_90d"],
        hours_since=f["hours_since_last_shift"],
        load_30d=f["shifts_last_30d"],
    )


def _rankings(
    dataset: Dataset, store: FeatureStore, model: LogisticModel, shift: Shift, top_k: int
) -> tuple[tuple[Listed, ...], tuple[Listed, ...]] | None:
    """Os dois top-k da vaga, ou nada se a vaga não servir para comparar as listas."""
    duration = (shift.ends_at - shift.starts_at).total_seconds() / 3600
    pool = eligible_pool(dataset, store, shift)
    if len(pool) < top_k:
        return None
    by_model = sorted(pool, key=lambda row: (-model.probability(row[1]), row[0].id))[:top_k]
    by_base = sorted(
        pool,
        key=lambda row: (
            -baseline_score(row[1], radius_km=row[0].max_radius_km, duration_h=duration),
            row[0].id,
        ),
    )[:top_k]
    if len({d.id for d, _ in by_model} & {d.id for d, _ in by_base}) > top_k - 2:
        return None  # listas quase iguais não dizem nada sobre qual é melhor
    return (
        tuple(_listed(d.id, f) for d, f in by_model),
        tuple(_listed(d.id, f) for d, f in by_base),
    )


def _title(dataset: Dataset, shift: Shift) -> str:
    day = WEEKDAYS[shift.starts_at.weekday()]
    return (
        f"{SPECIALTIES[shift.specialty]}, {PERIODS[shift.period]} de {day}, "
        f"{shift.starts_at:%H}h às {shift.ends_at:%H}h, {dataset.units[shift.unit_id].name}, "
        f"urgência {URGENCY[shift.urgency]}"
    )


def build_cases(
    dataset: Dataset,
    model: LogisticModel,
    params: dict[str, Any],
    n_cases: int = N_CASES,
    top_k: int = TOP_K,
) -> list[Case]:
    """Sorteia vagas de teste alternando especialidade e hospital; noite e dia saem como no dado.

    A alternância vale para qualquer prefixo: quem só tiver tempo para os 6 primeiros casos ainda vê
    as duas especialidades nos três hospitais.
    """
    test_start = datetime.fromisoformat(params["test_start"])
    store = FeatureStore(dataset)
    rng = random.Random(f"revisao:{params['seed']}")
    strata: dict[tuple[str, str], list[Shift]] = {}
    ordered = sorted(dataset.shifts.values(), key=lambda s: (s.starts_at, s.id))
    for shift in ordered:
        if shift.published_at >= test_start:
            strata.setdefault((shift.unit_id, shift.specialty), []).append(shift)
    for group in strata.values():
        rng.shuffle(group)
    picked: list[tuple[Shift, tuple[Listed, ...], tuple[Listed, ...]]] = []
    while len(picked) < n_cases and any(strata.values()):
        for key in sorted(strata):
            group = strata[key]
            while group and len(picked) < n_cases:
                shift = group.pop()
                lists = _rankings(dataset, store, model, shift, top_k)
                if lists is not None:
                    picked.append((shift, *lists))
                    break
    model_first = [number < len(picked) // 2 for number in range(len(picked))]
    rng.shuffle(model_first)
    cases = []
    for number, ((shift, by_model, by_base), first) in enumerate(
        zip(picked, model_first, strict=True), start=1
    ):
        list_a, list_b = (by_model, by_base) if first else (by_base, by_model)
        source = "modelo" if first else "baseline"
        cases.append(Case(number, shift.id, _title(dataset, shift), list_a, list_b, source))
    return cases


def _last_shift(hours: float) -> str:
    if hours >= HOURS_CAP:
        return "7+ dias"
    return f"{hours:.0f} h" if hours < 48 else f"{hours / 24:.0f} dias"


def _rows(listed: tuple[Listed, ...]) -> list[str]:
    return [
        f"| {r.code} | {r.specialty} | {num(r.distance_km, 1)} km | "
        f"{'sim' if r.prefers else 'não'} | {pct(r.acceptance, 0)} | {pct(r.attendance, 0)} | "
        f"{_last_shift(r.hours_since)} | {r.load_30d:.0f} |"
        for r in listed
    ]


def render_cases(cases: list[Case]) -> str:
    """Folha mostrada ao coordenador: sem nada que indique de onde vem cada lista."""
    lines = [
        "# Revisão às cegas: casos",
        "",
        "**Todos os médicos e vagas são fictícios (simulação).** Os códigos não identificam "
        "ninguém. Todos os candidatos já passaram no filtro: CRM ativo, especialidade, raio, "
        "disponibilidade e jornada.",
        "",
        "Em cada caso há duas listas de 5 médicos, na ordem em que seriam chamados. Responda:",
        "",
        "1. Em cada lista, quantos dos 5 você de fato chamaria?",
        "2. Se só pudesse usar uma das listas, qual seria: A, B ou tanto faz?",
        "",
        '"Aceite" e "comparece" são estimativas dos últimos 90 dias (90 d). "Último plantão" é '
        'o tempo entre o fim dele e o início da vaga. Em "prefere o período", "sim" inclui quem '
        "não tem preferência.",
    ]
    for case in cases:
        lines += [
            "",
            "<!-- bloco -->",
            f"### Caso {case.number}. {case.title}",
            "",
            "**Lista A**",
            "",
            HEADER,
            RULE,
            *_rows(case.list_a),
            "",
            "**Lista B**",
            "",
            HEADER,
            RULE,
            *_rows(case.list_b),
            "",
            "Chamaria: lista A ____ de 5; lista B ____ de 5. Usaria: A / B / tanto faz.",
            "<!-- fim-bloco -->",
        ]
    lines.append("")
    return "\n".join(lines)


def render_answer_key(cases: list[Case]) -> str:
    """Gabarito: só para a análise, depois de todas as entrevistas."""
    lines = [
        "# Revisão às cegas: gabarito",
        "",
        "> **Não abra antes de terminar todas as entrevistas.** Quem entrevista também não deve "
        "saber qual lista é qual, para não induzir a resposta.",
        "",
        "| Caso | Lista A | Lista B | Médicos em comum | Vaga simulada |",
        "| --- | --- | --- | ---: | --- |",
    ]
    lines += [
        f"| {c.number} | {c.a_source} | {c.b_source} | {c.shared} | `{c.shift_id[:8]}` |"
        for c in cases
    ]
    lines += [
        "",
        "## Como calcular",
        "",
        "1. **Recomendações aceitas (meta da Entrega 1: 60% ou mais):** some, por origem, quantos "
        "médicos o coordenador chamaria e divida pelo total exibido (5 por lista respondida).",
        "2. **Preferência:** parcela dos casos em que o coordenador escolheu a lista do modelo, "
        "a do baseline ou \"tanto faz\".",
        "3. **Registre sempre quantos coordenadores e quantos casos entraram na conta.** Com 3 a 5 "
        "coordenadores, o resultado é um sinal, não uma prova: as vagas são simuladas e a amostra "
        "é pequena e de conveniência.",
        "",
    ]
    return "\n".join(lines)
