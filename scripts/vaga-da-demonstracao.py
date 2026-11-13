#!/usr/bin/env python3
"""Confere onde os médicos que têm login aparecem na vaga do roteiro da demonstração.

O roteiro (`docs/apresentacao/roteiro-da-demonstracao.md`) manda o coordenador aprovar os médicos
que têm login, para a cascata cair em quem o Victor controla. Esses nomes só aparecem entre os
cinco primeiros em poucas vagas. Este script roda o mesmo motor da API, sobre os mesmos dados e os
mesmos pesos, com o banco limpo (sem exposição no rodízio), e mostra a posição de cada um.

    py -3.12 scripts/vaga-da-demonstracao.py
    py -3.12 scripts/vaga-da-demonstracao.py --agora 2026-11-17T09:00 --dia 2026-11-20
    py -3.12 scripts/vaga-da-demonstracao.py --buscar

Só lê arquivos locais (`data/synthetic/out`) e não fala com o servidor, com o banco nem com o
Gemini. Tudo é simulação com dados sintéticos.
"""

import argparse
import json
import sys
from datetime import date, datetime, time, timedelta
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / "services" / "matching-api"))

from app.llm.guardrails import ShiftFields  # noqa: E402
from app.models import load_dataset  # noqa: E402
from app.pipeline import recommend  # noqa: E402
from app.ranking.compute import FeatureStore  # noqa: E402
from app.ranking.model import LogisticModel  # noqa: E402

ZONA_DO_ROTEIRO = "centro"
ESPECIALIDADE_DO_ROTEIRO = "pediatria"
DIAS = ("seg", "ter", "qua", "qui", "sex", "sáb", "dom")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--dados", default=str(REPO / "data" / "synthetic" / "out"))
    parser.add_argument("--agora", default=None, help="AAAA-MM-DDTHH:MM (padrão: agora)")
    parser.add_argument("--dia", default="2026-11-18", help="dia do plantão (noturno, 19h às 7h)")
    parser.add_argument("--buscar", action="store_true", help="varre os próximos 7 dias")
    args = parser.parse_args()

    data_dir = Path(args.dados)
    if not (data_dir / "model_registry.json").exists():
        print(f"Sem dados em {data_dir}. Rode: make seed (em services/matching-api).")
        return 2
    dataset = load_dataset(data_dir)
    registry = json.loads((data_dir / "model_registry.json").read_text(encoding="utf-8"))
    model = LogisticModel.from_dict(registry["model"])
    store = FeatureStore(dataset)

    world = json.loads((REPO / "apps/web/lib/demo/mundo.json").read_text(encoding="utf-8"))
    doctors = [p["medico"] for p in world["personas"] if p["papel"] == "medico"]
    logins = {d["id"]: d["nome"] for d in doctors[:3]}  # os três do comando `demonstracao`
    unit = next(u for u in dataset.units.values() if u.zone == ZONA_DO_ROTEIRO)
    now = datetime.fromisoformat(args.agora) if args.agora else datetime.now().replace(second=0)

    days = [date.fromisoformat(args.dia)]
    if args.buscar:
        days = [now.date() + timedelta(days=offset) for offset in range(1, 8)]
    print(
        f"Agora: {now:%d/%m/%Y %H:%M}. {unit.name}, {ESPECIALIDADE_DO_ROTEIRO}, "
        "noturno, banco limpo."
    )
    print(f"Logins da demonstração: {', '.join(logins.values())}\n")
    for day in days:
        starts = datetime.combine(day, time(19))
        ends = starts + timedelta(hours=12)
        fields = ShiftFields(unit.id, ESPECIALIDADE_DO_ROTEIRO, starts, ends, "high")
        rec = recommend(dataset, store, model, fields, now, top_k=5, exposure={})
        marks = []
        for candidate in rec.candidates:
            name = logins.get(candidate.doctor_id)
            alert = f" ALERTA {','.join(candidate.alerts)}" if candidate.alerts else ""
            marks.append(f"{candidate.rank}: {name or '(sem login)'}{alert}")
        inside = sum(1 for c in rec.candidates if c.doctor_id in logins)
        verdict = "serve" if inside == 3 else f"só {inside} dos 3 no top-5"
        print(f"{DIAS[day.weekday()]} {day:%d/%m} ({rec.eligible_count} elegíveis) {verdict}")
        print("   " + " | ".join(marks))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
