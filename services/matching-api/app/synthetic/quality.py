"""Regras de qualidade dos dados sintéticos (dicionário de dados, seção 7)."""

import csv
import re
from collections import Counter
from dataclasses import dataclass, fields
from datetime import timedelta
from pathlib import Path

from app.models import TABLES, Dataset
from app.synthetic.generator import FIRST_NAMES, LAST_NAMES, SPECIALTIES

SECRET_PATTERN = re.compile(r"AIza[0-9A-Za-z_-]{35}|sk-ant-[A-Za-z0-9_-]{20,}")
PHONE_PATTERN = re.compile(r"^\+55 00 9\d{4}-\d{4}$")

DOMAINS: dict[str, set[str]] = {
    "units.kind": {"PS"},
    "units.ownership": {"privado"},
    "doctors.crm_status": {"active", "suspended", "expired"},
    "doctors.specialty": set(SPECIALTIES),
    "doctors.preferred_period": {"night", "day", "weekend", "any"},
    "doctors.gender": {"F", "M"},
    "doctors.age_band": {"25-34", "35-44", "45-54", "55+"},
    "shifts.specialty": set(SPECIALTIES),
    "shifts.period": {"night", "day"},
    "shifts.urgency": {"low", "medium", "high"},
    "shifts.status": {"open", "offered", "filled", "uncovered", "cancelled"},
    "offers.response": {"accepted", "declined", "expired"},
    "offers.selection_source": {"manual_history", "system_recommendation"},
    "shift_requests.style": {"formal", "abreviado", "com_erros", "ambiguo", "adversarial"},
}


@dataclass(frozen=True, slots=True)
class QualityResult:
    rule: str
    passed: bool
    detail: str


def _domain_violations(dataset: Dataset) -> int:
    sources = {
        "units": list(dataset.units.values()),
        "doctors": list(dataset.doctors.values()),
        "shifts": list(dataset.shifts.values()),
        "offers": dataset.offers,
        "shift_requests": dataset.requests,
    }
    bad = 0
    for key, allowed in DOMAINS.items():
        table, column = key.split(".")
        bad += sum(1 for row in sources[table] if getattr(row, column) not in allowed)
    return bad


def _overlaps(dataset: Dataset) -> int:
    by_doctor: dict[str, list[tuple]] = {}
    for offer in dataset.offers:
        if offer.accepted:
            shift = dataset.shifts[offer.shift_id]
            by_doctor.setdefault(offer.doctor_id, []).append((shift.starts_at, shift.ends_at))
    count = 0
    for intervals in by_doctor.values():
        intervals.sort()
        for (_, end), (start, _) in zip(intervals, intervals[1:], strict=False):
            if start < end:
                count += 1
    return count


def run_checks(dataset: Dataset) -> list[QualityResult]:
    """Executa as regras de qualidade; cada uma devolve passou/falhou e o detalhe."""
    results: list[QualityResult] = []

    def add(rule: str, bad: int, unit: str = "violações") -> None:
        results.append(QualityResult(rule, bad == 0, f"{bad} {unit}"))

    org_ids = {o.id for o in dataset.organizations}
    request_ids = {r.id for r in dataset.requests}
    bad = sum(1 for u in dataset.units.values() if u.organization_id not in org_ids)
    bad += sum(1 for s in dataset.shifts.values() if s.unit_id not in dataset.units)
    bad += sum(
        1
        for s in dataset.shifts.values()
        if s.source_request_id and s.source_request_id not in request_ids
    )
    bad += sum(1 for r in dataset.requests if r.unit_id not in dataset.units)
    bad += sum(
        1
        for o in dataset.offers
        if o.shift_id not in dataset.shifts or o.doctor_id not in dataset.doctors
    )
    bad += sum(1 for d in dataset.windows if d not in dataset.doctors)
    bad += sum(1 for s in dataset.compensation if s not in dataset.shifts)
    add("Integridade referencial: toda chave estrangeira aponta para registro existente", bad)

    add("Domínios: todo valor enumerado está na lista", _domain_violations(dataset))

    bad = sum(1 for s in dataset.shifts.values() if s.ends_at <= s.starts_at)
    bad += sum(1 for o in dataset.offers if o.responded_at and o.responded_at < o.sent_at)
    bad += sum(
        1 for s in dataset.shifts.values() if s.filled_at and s.filled_at < s.published_at
    )
    add("Datas: fim depois do início, resposta depois do envio, preenchimento depois da vaga", bad)

    crm = [d.crm_sim for d in dataset.doctors.values()]
    pairs = [(o.shift_id, o.doctor_id) for o in dataset.offers]
    bad = (len(crm) - len(set(crm))) + (len(pairs) - len(set(pairs)))
    add("Unicidade: crm_sim e pares (vaga, médico) em ofertas", bad, "duplicatas")

    bad = 0
    for o in dataset.offers:
        bad += o.accepted != (o.response == "accepted")
        bad += (o.attended is None) == o.accepted
        bad += o.y_success != bool(o.accepted and o.attended)
    add("Coerência: aceite, comparecimento e rótulo y_success", bad)

    add("Sobreposição: nenhum médico atende dois plantões ao mesmo tempo", _overlaps(dataset))

    known_first, known_last = set(FIRST_NAMES), set(LAST_NAMES)
    bad = 0
    for d in dataset.doctors.values():
        parts = d.name_sim.split()
        bad += not d.crm_sim.startswith("SIM-")
        bad += not PHONE_PATTERN.match(d.phone_sim)
        bad += not (parts[0] in known_first and all(p in known_last for p in parts[1:]))
    bad += sum(1 for r in dataset.requests if SECRET_PATTERN.search(r.raw_text))
    add("Sem dado real: CRM com prefixo SIM, telefone fictício, nomes de lista", bad, "achados")

    specialties = {s.specialty for s in dataset.shifts.values()}
    units_with_shifts = {s.unit_id for s in dataset.shifts.values()}
    bad = int(specialties != set(SPECIALTIES)) + int(units_with_shifts != set(dataset.units))
    add("Cobertura do segmento: duas especialidades e todos os hospitais com vagas", bad)
    return results


def summary_stats(dataset: Dataset) -> dict[str, float]:
    """Números de resumo usados no relatório de qualidade e no documento."""
    offers = dataset.offers
    accepted = [o for o in offers if o.accepted]
    statuses = Counter(s.status for s in dataset.shifts.values())
    published = sum(statuses.values())
    gaps = [
        (s.filled_at - s.published_at) / timedelta(minutes=1)
        for s in dataset.shifts.values()
        if s.filled_at
    ]
    return {
        "doctors": len(dataset.doctors),
        "shifts": published,
        "offers": len(offers),
        "offers_per_shift": len(offers) / max(1, published),
        "acceptance_rate": len(accepted) / max(1, len(offers)),
        "success_rate": sum(o.y_success for o in offers) / max(1, len(offers)),
        "uncovered_share": statuses.get("uncovered", 0) / max(1, published),
        "violation_share_of_accepted": sum(o.injected_violation for o in accepted)
        / max(1, len(accepted)),
        "adversarial_share": sum(r.is_adversarial for r in dataset.requests)
        / max(1, len(dataset.requests)),
        "median_minutes_to_fill": sorted(gaps)[len(gaps) // 2] if gaps else 0.0,
    }


def null_report(directory: Path) -> dict[str, dict[str, int]]:
    """Quantidade de células vazias por coluna, lida dos CSVs."""
    report: dict[str, dict[str, int]] = {}
    for name, cls in TABLES.items():
        path = directory / f"{name}.csv"
        if not path.exists():
            continue
        counts = {f.name: 0 for f in fields(cls)}
        with path.open(encoding="utf-8", newline="") as handle:
            for row in csv.DictReader(handle):
                for column, value in row.items():
                    if value == "":
                        counts[column] += 1
        report[name] = {c: n for c, n in counts.items() if n}
    return report


def render_report(
    results: list[QualityResult],
    counts: dict[str, int],
    stats: dict[str, float],
    nulls: dict[str, dict[str, int]],
    params: dict,
) -> str:
    lines = [
        "# Relatório de qualidade dos dados sintéticos",
        "",
        "> Dados **sintéticos**, gerados por `python -m app.cli seed`. Tudo é simulação: nada "
        "descreve hospitais ou médicos reais.",
        "",
        f"Semente: `{params['seed']}` · período: {params['start_date']} a {params['end_date']} "
        f"· teste temporal a partir de {params['test_start']}.",
        "",
        "## Volume por tabela",
        "",
        "| Tabela | Linhas |",
        "| --- | ---: |",
    ]
    lines += [f"| `{name}` | {n:,} |".replace(",", ".") for name, n in counts.items()]
    lines += ["", "## Regras de qualidade", ""]
    lines += ["| Regra | Resultado | Detalhe |", "| --- | --- | --- |"]
    lines += [
        f"| {r.rule} | {'passou' if r.passed else '**FALHOU**'} | {r.detail} |" for r in results
    ]
    lines += [
        "",
        "## Resumo da simulação",
        "",
        "| Indicador | Valor |",
        "| --- | ---: |",
        f"| Ofertas por vaga | {stats['offers_per_shift']:.2f} |".replace(".", ","),
        f"| Taxa de aceite das ofertas | {stats['acceptance_rate']:.1%} |".replace(".", ","),
        f"| Taxa de sucesso (aceitou e compareceu) | {stats['success_rate']:.1%} |".replace(
            ".", ","
        ),
        f"| Vagas sem cobertura | {stats['uncovered_share']:.1%} |".replace(".", ","),
        f"| Aceites que violam a jornada (processo manual) | "
        f"{stats['violation_share_of_accepted']:.1%} |".replace(".", ","),
        f"| Pedidos em texto livre adversariais | {stats['adversarial_share']:.1%} |".replace(
            ".", ","
        ),
        f"| Mediana de minutos até preencher a vaga (simulado) | "
        f"{stats['median_minutes_to_fill']:.0f} |",
        "",
        "## Células vazias (esperadas, por desenho)",
        "",
        "| Tabela | Coluna | Vazias |",
        "| --- | --- | ---: |",
    ]
    for table, columns in nulls.items():
        lines += [f"| `{table}` | `{column}` | {n} |" for column, n in columns.items()]
    lines += [
        "",
        "## Limites",
        "",
        "- Os valores acima descrevem o **simulador**, que reflete premissas do projeto "
        "(dicionário de dados, seção 6) e não dados de mercado.",
        "- O tempo até preencher a vaga é simulado e **não** serve de linha de base real.",
        "- A reprodutibilidade (mesma semente, mesmos arquivos) é testada em "
        "`tests/test_synthetic.py`.",
        "",
    ]
    return "\n".join(lines)
