"""Exemplo concreto do dicionário de dados: nome, tipo, descrição e valores possíveis.

A coluna do que aparece nos dados é calculada, e um teste compara o arquivo publicado com o que sai
do gerador. Assim a tabela não envelhece em silêncio. Nome, CRM e telefone simulados ficam de fora.
"""

import statistics
from collections import Counter
from collections.abc import Iterable
from typing import Any

from app.models import Dataset
from app.ranking.compute import FeatureStore
from app.ranking.evaluate import training_set
from app.ranking.report import num


def _count(value: int) -> str:
    return f"{value:,}".replace(",", ".")


def _counts(values: Iterable[Any]) -> str:
    """Cada valor com a quantidade, do mais frequente ao menos frequente."""
    counter = Counter(values)
    ordered = sorted(counter.items(), key=lambda item: (-item[1], str(item[0])))
    return "; ".join(f"`{key}`: {_count(amount)}" for key, amount in ordered)


def _spread(values: list[float], decimals: int = 2) -> str:
    def show(value: float) -> str:
        return num(value, decimals) if decimals else _count(round(value))

    return f"De {show(min(values))} a {show(max(values))}; mediana {show(statistics.median(values))}"


def _yes_no(values: Iterable[bool]) -> str:
    return _counts("verdadeiro" if value else "falso" for value in values)


def _number(value: float) -> str:
    return f"{value:g}".replace(".", ",")


def dictionary_rows(dataset: Dataset) -> list[dict[str, str]]:
    """Linhas do exemplo, na ordem em que o dado nasce: médico, vaga, oferta, variável e valor."""
    doctors = list(dataset.doctors.values())
    shifts = list(dataset.shifts.values())
    offers = dataset.offers
    features, _ = training_set(dataset, FeatureStore(dataset), offers)

    def feature(name: str) -> list[float]:
        return [row[name] for row in features]

    def entry(
        name: str, table: str, kind: str, role: str, description: str, domain: str, seen: str
    ) -> dict[str, str]:
        return {
            "name": name,
            "table": table,
            "kind": kind,
            "role": role,
            "description": description,
            "domain": domain,
            "seen": seen,
        }

    return [
        entry(
            "crm_status", "doctors", "enum", "atributo",
            "Situação do CRM simulado; só `active` é elegível",
            "`active`, `suspended`, `expired`",
            _counts(d.crm_status for d in doctors),
        ),
        entry(
            "specialty", "doctors", "enum", "atributo",
            "Especialidade principal do médico",
            "`clinica_medica`, `pediatria`",
            _counts(d.specialty for d in doctors),
        ),
        entry(
            "max_radius_km", "doctors", "numeric", "atributo",
            "Raio máximo que o médico aceita se deslocar, em km",
            "Maior que zero; o simulador usa 10, 15, 20 e 30",
            _counts(_number(d.max_radius_km) for d in doctors),
        ),
        entry(
            "preferred_period", "doctors", "enum", "atributo",
            "Período que o médico prefere",
            "`night`, `day`, `weekend`, `any`",
            _counts(d.preferred_period for d in doctors),
        ),
        entry(
            "gender", "doctors", "enum", "auditoria",
            "Só para auditar viés; nunca entra no ranking nem vai ao LLM",
            "`F`, `M` (categorias simplificadas da simulação)",
            _counts(d.gender for d in doctors),
        ),
        entry(
            "period", "shifts", "enum", "atributo",
            "Período da vaga, derivado do início",
            "`night` (19h às 7h), `day` (7h às 19h)",
            _counts(s.period for s in shifts),
        ),
        entry(
            "urgency", "shifts", "enum", "atributo",
            "Urgência informada para a vaga",
            "`low`, `medium`, `high`",
            _counts(s.urgency for s in shifts),
        ),
        entry(
            "status", "shifts", "enum", "atributo",
            "Situação da vaga; o histórico simulado só tem vagas encerradas",
            "`open`, `offered`, `filled`, `uncovered`, `cancelled`",
            _counts(s.status for s in shifts),
        ),
        entry(
            "response", "offers", "enum", "rótulo",
            "Como o médico respondeu à oferta",
            "`accepted`, `declined`, `expired`",
            _counts(o.response for o in offers),
        ),
        entry(
            "decline_reason", "offers", "enum", "atributo",
            "Motivo da recusa; fica vazio quando não houve recusa",
            "`distance`, `fatigue`, `schedule`, `other`",
            _counts(o.decline_reason for o in offers if o.decline_reason),
        ),
        entry(
            "y_success", "offers", "bool", "rótulo",
            "**O que o modelo aprende a prever:** aceitou e compareceu",
            "Verdadeiro ou falso",
            _yes_no(o.y_success for o in offers),
        ),
        entry(
            "specialty_match", "variável do ranking", "numeric", "feature",
            "1 se a vaga é da especialidade principal; 0,5 se só da secundária",
            "0,5 ou 1",
            _counts(_number(value) for value in feature("specialty_match")),
        ),
        entry(
            "distance_km", "variável do ranking", "numeric", "feature",
            "Distância em linha reta entre a casa do médico e o hospital, em km",
            "Zero ou mais",
            _spread(feature("distance_km")),
        ),
        entry(
            "availability_overlap_hours", "variável do ranking", "numeric", "feature",
            "Horas da vaga cobertas pela disponibilidade do médico",
            "De zero à duração da vaga",
            _spread(feature("availability_overlap_hours")),
        ),
        entry(
            "acceptance_rate_90d", "variável do ranking", "numeric", "feature",
            "(aceites + 1) / (ofertas com resultado conhecido + 2), nos 90 dias anteriores",
            "De 0 a 1; 0,5 para quem não tem histórico",
            _spread(feature("acceptance_rate_90d")),
        ),
        entry(
            "attendance_rate_90d", "variável do ranking", "numeric", "feature",
            "(comparecimentos + 1) / (aceites com plantão encerrado + 2), nos 90 dias anteriores",
            "De 0 a 1; 0,5 para quem não tem histórico",
            _spread(feature("attendance_rate_90d")),
        ),
        entry(
            "hours_since_last_shift", "variável do ranking", "numeric", "feature",
            "Horas entre o fim do último plantão conhecido e o início da vaga",
            "De 0 a 168 (limite de 7 dias)",
            _spread(feature("hours_since_last_shift"), 0),
        ),
        entry(
            "night_shift_preference_match", "variável do ranking", "numeric", "feature",
            "1 se o período da vaga coincide com a preferência do médico",
            "0 ou 1",
            _counts(_number(value) for value in feature("night_shift_preference_match")),
        ),
        entry(
            "amount_brl_sim", "shift_compensation", "numeric", "restrito-econômico",
            "Valor simulado do plantão, em tabela separada; nunca entra no ranking nem vai ao LLM",
            "Valor em reais",
            _spread(list(dataset.compensation.values()), 0),
        ),
    ]


def render_dictionary(dataset: Dataset) -> str:
    """Tabela em Markdown com o exemplo concreto do dicionário de dados."""
    lines = [
        "# Dicionário de dados: exemplo concreto",
        "",
        "> **Simulação.** Os dados são sintéticos. Este arquivo é gerado por `make dicionario`: a "
        "última coluna sai dos dados, e um teste acusa se ela ficar desatualizada. O contrato "
        "completo, com todas as colunas, está no "
        "[dicionário de dados](dicionario-de-dados.md).",
        "",
        "**Papel:** `feature` entra no ranking; `rótulo` é o resultado observado; `atributo` "
        "descreve o médico ou a vaga e só entra no ranking se virar `feature`; `auditoria` e "
        "`restrito-econômico` nunca entram.",
        "",
        "| Variável | Onde está | Tipo | Papel | Descrição | Valores possíveis "
        "| Nos dados gerados |",
        "| --- | --- | --- | --- | --- | --- | --- |",
    ]
    lines += [
        f"| `{r['name']}` | {r['table']} | {r['kind']} | {r['role']} | {r['description']} | "
        f"{r['domain']} | {r['seen']} |"
        for r in dictionary_rows(dataset)
    ]
    lines.append("")
    return "\n".join(lines)
