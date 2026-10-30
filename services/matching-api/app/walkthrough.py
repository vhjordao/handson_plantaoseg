"""Exemplo trabalhado: o passo a passo de uma vaga, com as contas à vista.

Gera o Markdown de `docs/exemplo-trabalhado.md` a partir de uma execução real da PoC sobre os
dados sintéticos. Serve para explicar a solução a quem não vai rodar o código.
"""

import json
from datetime import date, datetime, time
from pathlib import Path

from app.audit import AuditLog
from app.llm.extraction import extract
from app.models import Dataset
from app.pipeline import Recommendation, approve, recommend
from app.ranking.baseline import baseline_score
from app.ranking.compute import FeatureStore
from app.ranking.features import RANKING_FEATURES
from app.ranking.model import LogisticModel, sigmoid
from app.ranking.report import FEATURE_LABELS, num, pct
from app.rules import RULE_TEXTS, evaluate_candidate

WEEKDAYS = ("segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo")
URGENCY_PT = {"high": "alta", "medium": "média", "low": "baixa"}


def _when(moment: datetime) -> str:
    return f"{WEEKDAYS[moment.weekday()]}, {moment:%d/%m/%Y} às {moment:%H}h"


def _table(header: list[str], rows: list[list[str]], right: tuple[int, ...] = ()) -> str:
    align = ["---:" if i in right else "---" for i in range(len(header))]
    lines = ["| " + " | ".join(header) + " |", "| " + " | ".join(align) + " |"]
    return "\n".join(lines + ["| " + " | ".join(row) + " |" for row in rows])


def _evidence(dataset: Dataset, store: FeatureStore, rec: Recommendation, doctor_id: str) -> str:
    doctor = dataset.doctors[doctor_id]
    fields = rec.fields
    assert fields.specialty and fields.starts_at and fields.ends_at  # garantido por recommend()
    check = evaluate_candidate(
        doctor,
        specialty=fields.specialty,
        starts_at=fields.starts_at,
        ends_at=fields.ends_at,
        unit=rec.unit,
        policy=dataset.policy,
        windows=dataset.windows.get(doctor_id, []),
        assignments=store.assignments_at(doctor_id, rec.now),
    )
    duration = (fields.ends_at - fields.starts_at).total_seconds() / 3600
    code = check.rule_code
    if code == "crm_inactive":
        return f"situação do CRM simulado: `{doctor.crm_status}`"
    if code == "specialty_mismatch":
        return f"especialidade `{doctor.specialty}` (secundária: `{doctor.secondary_specialty}`)"
    if code == "outside_radius":
        radius = f"{doctor.max_radius_km:.0f} km"
        return f"{num(check.distance_km, 1)} km de distância; raio do médico: {radius}"
    if code == "unavailable":
        return f"disponibilidade cobre {num(check.overlap_hours, 0)} h de {duration:.0f} h exigidas"
    spans = "; ".join(
        f"{s:%d/%m %Hh} a {e:%d/%m %Hh}"
        for s, e in sorted(store.assignments_at(doctor_id, rec.now))
    )
    return f"plantões já aceitos: {spans or 'nenhum'}"


def render_walkthrough(
    dataset: Dataset,
    model: LogisticModel,
    text: str,
    today: date,
    audit_path: Path,
) -> str:
    """Executa a PoC para um pedido e descreve cada etapa com os números reais."""
    store = FeatureStore(dataset)
    now = datetime.combine(today, time(9, 0))
    result = extract(text, today, dataset.units)
    fields = result.fields
    audit = AuditLog(audit_path)
    if audit_path.exists():
        audit_path.unlink()
    rec = recommend(dataset, store, model, fields, now, audit=audit)
    top = rec.candidates[0]
    approve(
        audit,
        rec,
        [c.doctor_id for c in rec.candidates[:3]],
        now=now,
        coordinator_id="coordenador-demo",
        mode="automatico_apenas_demo",
    )
    unit_name = dataset.units[fields.unit_id].name if fields.unit_id else "?"
    duration = (
        (fields.ends_at - fields.starts_at).total_seconds() / 3600
        if fields.ends_at and fields.starts_at
        else 12
    )

    lines = [
        "# Exemplo trabalhado: uma vaga, do texto livre à aprovação",
        "",
        "> **Simulação.** Gerado por `python -m app.cli walkthrough` sobre os dados sintéticos; "
        "nomes, CRM e números são fictícios e nada tem validade médica ou legal. Cada passo "
        "mostra as contas para quem não vai rodar o código.",
        "",
        "## Passo 1. O pedido em texto livre (entrada não confiável)",
        "",
        f"> {text}",
        "",
        f'Data de referência ("hoje"): {_when(now)}.',
        "",
        "## Passo 2. Campos extraídos (o coordenador confere)",
        "",
        f"Fonte: **{result.source}**. Sem chave do Gemini, o caminho por regras é o que roda; "
        "com a chave, o Gemini propõe os campos e o código só aceita a resposta se ela passar pelo "
        "esquema fechado (ver `docs/solucao-ia.md`).",
        "",
        _table(
            ["Campo", "Valor extraído"],
            [
                ["Hospital", unit_name],
                ["Especialidade", str(fields.specialty)],
                ["Início", _when(fields.starts_at) if fields.starts_at else "?"],
                ["Fim", _when(fields.ends_at) if fields.ends_at else "?"],
                ["Urgência", URGENCY_PT.get(fields.urgency or "", "?")],
            ],
        ),
        "",
        "## Passo 3. Filtro de regras (código, sem IA)",
        "",
        f"Dos {rec.pool_size} médicos, **{rec.eligible_count} são elegíveis** e "
        f"{len(rec.exclusions)} ficam de fora. Cada excluído mostra a primeira regra que o barrou, "
        "com a evidência:",
        "",
    ]
    rows = []
    for code in rec.exclusion_counts():
        sample = next(e for e in rec.exclusions if e.rule_code == code)
        count = rec.exclusion_counts()[code]
        rows.append(
            [
                RULE_TEXTS[code],
                str(count),
                f"id `{sample.doctor_id[:8]}`: " + _evidence(dataset, store, rec, sample.doctor_id),
            ]
        )
    lines += [
        _table(["Regra", "Excluídos", "Exemplo e evidência"], rows, right=(1,)),
        "",
        f"Limites de jornada em vigor (configuração do projeto, não norma verificada): "
        f"{dataset.policy.max_continuous_hours} h contínuas e {dataset.policy.min_rest_hours} h de "
        "descanso. Os casos de borda estão em `tests/test_rules.py`.",
        "",
        "## Passo 4. Variáveis e score do primeiro colocado",
        "",
        f"Candidato: **{dataset.doctors[top.doctor_id].name_sim}** "
        f"(id `{top.doctor_id[:8]}`, dado fictício). As {len(RANKING_FEATURES)} variáveis do "
        "ranking são calculadas só com o que já era conhecido antes do pedido. Cada uma é "
        "padronizada (valor menos a média do treino, dividido pelo desvio) e multiplicada pelo "
        "peso aprendido; a soma, mais o viés, passa pela função sigmoide.",
        "",
    ]
    reference = {
        name: sum(f[name] for _, _, f in rec.scored) / len(rec.scored) for name in RANKING_FEATURES
    }
    contrib_ref = model.contributions(top.features, reference)
    rows, total = [], model.weights[0]
    for index, name in enumerate(model.feature_names):
        z = (top.features[name] - model.means[index]) / model.stds[index]
        weight = model.weights[index + 1]
        total += weight * z
        rows.append(
            [
                FEATURE_LABELS[name],
                num(top.features[name], 2),
                num(z, 2),
                num(weight, 3),
                num(weight * z, 3),
                num(contrib_ref[name], 3),
            ]
        )
    lines += [
        _table(
            [
                "Variável",
                "Valor",
                "Padronizado (z)",
                "Peso",
                "Peso x z",
                "Em relação à média dos elegíveis",
            ],
            rows,
            right=(1, 2, 3, 4, 5),
        ),
        "",
        f"Viés do modelo: {num(model.weights[0], 3)}. Soma total = {num(total, 3)}. "
        f"Score = sigmoide({num(total, 3)}) = **{num(sigmoid(total), 3)}** "
        f"(o sistema mostrou {num(top.score, 3)}).",
        "",
        "A última coluna é o que vira motivo: só contam as variáveis em que o candidato está "
        "**acima da média dos elegíveis**. Variável igual para todos (como a cobertura da vaga) "
        "não explica por que este médico e não outro.",
        "",
        "## Passo 5. Top 5, baseline e explicação",
        "",
        "O baseline é o que uma coordenação faria no olho: mais perto e com a janela cobrindo a "
        "vaga. A tabela compara a posição de cada um dos 5 recomendados nos dois rankings.",
        "",
    ]
    base_scores = {
        doctor_id: baseline_score(
            f, radius_km=dataset.doctors[doctor_id].max_radius_km, duration_h=duration
        )
        for doctor_id, _, f in rec.scored
    }
    base_order = sorted(base_scores, key=lambda d: (-base_scores[d], d))
    rows = []
    for c in rec.candidates:
        rows.append(
            [
                str(c.rank),
                str(base_order.index(c.doctor_id) + 1),
                f"`{c.doctor_id[:8]}`",
                num(c.score, 3),
                num(base_scores[c.doctor_id], 3),
                "; ".join(c.alerts) or "-",
            ]
        )
    lines += [
        _table(
            [
                "Posição no modelo",
                "Posição no baseline",
                "Médico",
                "Score",
                "Score do baseline",
                "Alertas de jornada",
            ],
            rows,
            right=(0, 1, 3, 4),
        ),
        "",
        "Explicações geradas (texto fixo a partir dos fatores; o Gemini só reescreve, e só se "
        "não acrescentar nada):",
        "",
    ]
    lines += [f"{c.rank}. {c.explanation.text}" for c in rec.candidates]
    lines += [
        "",
        "## Passo 6. Decisão humana e trilha de auditoria",
        "",
        "Recomendar não envia oferta. A oferta só pode sair depois da aprovação do coordenador, "
        "que fica registrada. Nesta execução a aprovação foi automática, **apenas para a "
        "demonstração**; no uso real é um clique humano.",
        "",
    ]
    records = [json.loads(line) for line in audit_path.read_text(encoding="utf-8").splitlines()]
    rows = [
        [str(r["seq"]), r["actor_role"], r["action"], r["prev_hash"][:8], r["hash"][:8]]
        for r in records
    ]
    intact, count = audit.verify()
    lines += [
        _table(["Seq", "Quem", "Ação", "Hash anterior", "Hash"], rows, right=(0,)),
        "",
        f"A cadeia de hash {'está íntegra' if intact else 'foi ADULTERADA'} ({count} registros). "
        "Alterar ou apagar qualquer linha quebra a verificação (ver `tests/test_audit.py`). A "
        "trilha guarda só IDs pseudônimos e a versão do modelo "
        f"(`{model.version}`); nenhum nome, CRM ou telefone.",
        "",
        f"Resumo do resultado: o modelo recomendou com {pct(top.score)} de chance estimada para o "
        "primeiro colocado, em simulação; esse número vem do simulador e não prevê o mundo real.",
        "",
    ]
    return "\n".join(lines)
