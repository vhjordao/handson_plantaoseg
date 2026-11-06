"""A evidência numérica de cada exclusão ("Mora a 18,2 km; o raio declarado é 15 km.").

O texto genérico da regra está em `RULE_TEXTS`; aqui fica o número que a justifica, calculado com
as mesmas funções de `rules.py`. Serve à API e ao exportador da demonstração, para os dois modos
da tela mostrarem a mesma frase. Nunca cita nome, CRM nem telefone.
"""

from datetime import datetime

from app.models import Doctor, Policy
from app.rules import RULE_TEXTS, Check, contiguous_hours

ESPECIALIDADE_PT = {"clinica_medica": "clínica médica", "pediatria": "pediatria"}
SITUACAO_CRM_PT = {"suspended": "suspenso", "expired": "vencido", "inactive": "inativo"}

Interval = tuple[datetime, datetime]


def pt(value: float, casas: int = 1) -> str:
    """Número no formato do Brasil: vírgula decimal."""
    return f"{value:.{casas}f}".replace(".", ",")


def numero(value: float) -> str:
    """Número sem casas inúteis, com vírgula decimal (15 vira "15", 12.5 vira "12,5")."""
    return f"{value:g}".replace(".", ",")


def horas(value: float) -> str:
    """Horas sem casa decimal quando são inteiras (12), com uma casa quando não são (3,5)."""
    return str(round(value)) if abs(value - round(value)) < 0.05 else pt(value, 1)


def dia_hora(moment: datetime) -> str:
    texto = f"{moment:%d/%m} {moment.hour}h"
    return texto if moment.minute == 0 else f"{texto}{moment.minute:02d}"


def folgas_em_horas(agenda: list[Interval], inicio: datetime, fim: datetime) -> list[float]:
    """Intervalos (h) entre a vaga e o plantão anterior e o seguinte, como em `schedule_check`."""
    anteriores = [termino for _, termino in agenda if termino <= inicio]
    seguintes = [comeco for comeco, _ in agenda if comeco >= fim]
    folgas = []
    if anteriores:
        folgas.append((inicio - max(anteriores)).total_seconds() / 3600)
    if seguintes:
        folgas.append((min(seguintes) - fim).total_seconds() / 3600)
    return folgas


def exclusion_evidence(
    doctor: Doctor,
    check: Check,
    *,
    specialty: str,
    starts_at: datetime,
    ends_at: datetime,
    policy: Policy,
    agenda: list[Interval],
) -> str:
    """A evidência da regra que barrou o médico. `agenda` é a do instante da recomendação."""
    codigo = check.rule_code
    if codigo == "crm_inactive":
        situacao = SITUACAO_CRM_PT.get(doctor.crm_status, doctor.crm_status)
        return f"Situação do CRM simulado: {situacao}."
    if codigo == "specialty_mismatch":
        return (
            f"Especialidade: {ESPECIALIDADE_PT[doctor.specialty]}; "
            f"a vaga pede {ESPECIALIDADE_PT[specialty]}."
        )
    if codigo == "outside_radius":
        raio = doctor.max_radius_km or policy.default_radius_km
        return f"Mora a {pt(check.distance_km, 1)} km; o raio declarado é {numero(raio)} km."
    if codigo == "unavailable":
        duracao = (ends_at - starts_at).total_seconds() / 3600
        return f"Cobre {horas(check.overlap_hours)} h das {horas(duracao)} h da vaga."
    if codigo == "schedule_conflict":
        comeco, termino = min((s, e) for s, e in agenda if s < ends_at and e > starts_at)
        return f"Já tem plantão de {dia_hora(comeco)} a {dia_hora(termino)}, no mesmo horário."
    if codigo == "continuous_hours_exceeded":
        cadeia = contiguous_hours(agenda, starts_at, ends_at)
        return f"Faria {horas(cadeia)} h contínuas; o limite é {policy.max_continuous_hours} h."
    if codigo == "rest_violation":
        minimo = policy.min_rest_hours
        curta = min(f for f in folgas_em_horas(agenda, starts_at, ends_at) if 0 < f < minimo)
        return f"Descansaria {horas(curta)} h entre os plantões; o mínimo é {minimo} h."
    return f"{RULE_TEXTS.get(codigo or '', 'Regra desconhecida')}."
