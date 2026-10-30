"""Linha de comando do PlantãoSeguro (PoC sem interface): seed, evaluate, demo e analyze.

Uso, a partir de `services/matching-api`:

    python -m app.cli seed        # gera os dados sintéticos e o relatório de qualidade
    python -m app.cli evaluate    # treina o modelo e compara com o baseline (simulação)
    python -m app.cli demo --yes  # vaga em texto livre -> top 5 -> aprovação -> auditoria
    python -m app.cli analyze     # análise exploratória (figuras e tabelas)

Tudo é simulação com dados sintéticos; nada tem validade médica ou legal.
"""

import argparse
import json
import shutil
import sys
from datetime import date, datetime, time
from pathlib import Path
from typing import Any

from app.audit import AuditLog
from app.llm.client import LLMClient, client_from_env
from app.llm.extraction import ExtractionResult, extract
from app.models import Dataset, load_dataset
from app.pipeline import Recommendation, approve, recommend
from app.ranking.compute import FeatureStore
from app.ranking.evaluate import evaluate
from app.ranking.model import LogisticModel
from app.ranking.report import render_metrics
from app.rules import RULE_TEXTS
from app.synthetic.generator import generate, generate_sample, save_dataset, write_manifest
from app.synthetic.params import load_params
from app.synthetic.quality import null_report, render_report, run_checks, summary_stats

REPO_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_DATA = REPO_ROOT / "data" / "synthetic" / "out"
DEFAULT_PARAMS = REPO_ROOT / "data" / "synthetic" / "params.json"
DEFAULT_SAMPLE = REPO_ROOT / "data" / "synthetic" / "sample"
DEFAULT_TEXT = (
    "Preciso de um pediatra para o plantão noturno de sexta, 19h às 7h, "
    "Hospital Modelo Centro, urgência alta"
)
WEEKDAYS_PT = ("segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo")
URGENCY_PT = {"high": "alta", "medium": "média", "low": "baixa"}


def _when(moment: datetime) -> str:
    return f"{WEEKDAYS_PT[moment.weekday()]} {moment:%d/%m} {moment:%H}h"


def _pt(value: float, decimals: int = 2) -> str:
    return f"{value:.{decimals}f}".replace(".", ",")


def render_extraction(text: str, result: ExtractionResult, dataset: Dataset) -> str:
    fields = result.fields
    unit = dataset.units[fields.unit_id].name if fields.unit_id else "(não identificada)"
    lines = [
        "1) Texto da vaga (entrada não confiável, tratada como dado):",
        f'   "{text}"',
        f"2) Campos extraídos (fonte: {result.source}). O coordenador confere antes de seguir:",
        f"   Unidade: {unit}",
        f"   Especialidade: {fields.specialty or '(não identificada)'}",
        f"   Início: {_when(fields.starts_at) if fields.starts_at else '(não identificado)'}",
        f"   Fim: {_when(fields.ends_at) if fields.ends_at else '(não identificado)'}",
        f"   Urgência: {URGENCY_PT.get(fields.urgency or '', '(não informada)')}",
    ]
    if result.flags:
        lines.append(f"   ATENÇÃO, sinais de texto suspeito: {', '.join(result.flags)}")
        lines.append("   (o texto não foi enviado ao LLM; só as regras foram usadas)")
    if result.llm_error:
        lines.append(f"   LLM não usado: {result.llm_error}")
    return "\n".join(lines)


def render_recommendation(rec: Recommendation, dataset: Dataset) -> str:
    lines = [
        f"3) Recomendação do modelo {rec.model_version} (simulação): {rec.eligible_count} "
        f"elegíveis entre {rec.pool_size} médicos. Top {len(rec.candidates)}:",
    ]
    for c in rec.candidates:
        doctor = dataset.doctors[c.doctor_id]
        lines.append(
            f"   {c.rank}. {doctor.name_sim} ({doctor.crm_sim}, id {c.doctor_id[:8]}) "
            f"score {_pt(c.score)}"
        )
        lines.append(f"      {c.explanation.text}")
        if c.alerts:
            lines.append(f"      Atenção (jornada): {'; '.join(c.alerts)}")
        if c.explanation_fallback:
            lines.append(f"      (explicação em template: {c.explanation_fallback})")
    lines.append(f"4) Excluídos pelas regras ({len(rec.exclusions)}), com a regra que barrou:")
    for code, count in rec.exclusion_counts().items():
        lines.append(f"   {count:4d}  {RULE_TEXTS.get(code, code)}")
    examples = rec.exclusions[:3]
    if examples:
        lines.append("   Exemplos:")
        for item in examples:
            doctor = dataset.doctors[item.doctor_id]
            lines.append(f"   - {doctor.name_sim} (id {item.doctor_id[:8]}): {item.rule_text}")
    return "\n".join(lines)


def _load(data_dir: Path) -> tuple[Dataset, dict[str, Any]]:
    if not (data_dir / "dataset_manifest.json").exists():
        raise SystemExit(f"Sem dados em {data_dir}. Rode primeiro: python -m app.cli seed")
    manifest = json.loads((data_dir / "dataset_manifest.json").read_text(encoding="utf-8"))
    return load_dataset(data_dir), manifest["params"]


def cmd_seed(args: argparse.Namespace) -> int:
    params_path = Path(args.params) if args.params else DEFAULT_PARAMS
    params = load_params(params_path)
    dataset = generate(params)
    out = Path(args.out)
    counts = save_dataset(dataset, out)
    write_manifest(out, params, counts)
    results = run_checks(dataset)
    report = render_report(results, counts, summary_stats(dataset), null_report(out), params)
    (out / "quality_report.md").write_text(report, encoding="utf-8")
    if args.report:
        Path(args.report).parent.mkdir(parents=True, exist_ok=True)
        Path(args.report).write_text(report, encoding="utf-8")
    if args.sample:
        sample_dir = Path(args.sample)
        if sample_dir.exists():
            shutil.rmtree(sample_dir)
        generate_sample(sample_dir, params_path)
    print(f"Dados sintéticos (simulação) gravados em {out}")
    for name, count in counts.items():
        print(f"  {name:22s} {count:7d} linhas")
    passed = sum(1 for r in results if r.passed)
    print(f"Qualidade: {passed} de {len(results)} regras passaram")
    for r in results:
        if not r.passed:
            print(f"  FALHOU: {r.rule} ({r.detail})")
    return 0 if passed == len(results) else 1


def cmd_evaluate(args: argparse.Namespace) -> int:
    data_dir = Path(args.data)
    dataset, params = _load(data_dir)
    model, metrics = evaluate(dataset, params)
    registry = {"model": model.to_dict(), "metrics": metrics}
    (data_dir / "model_registry.json").write_text(
        json.dumps(registry, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    report = render_metrics(metrics)
    if args.report_dir:
        report_dir = Path(args.report_dir)
        report_dir.mkdir(parents=True, exist_ok=True)
        (report_dir / "metricas-ranking.md").write_text(report, encoding="utf-8")
        (report_dir / "metricas-ranking.json").write_text(
            json.dumps(metrics, ensure_ascii=False, indent=2), encoding="utf-8"
        )
    cf = metrics["counterfactual"]
    print("Avaliação do ranking (SIMULAÇÃO, dados sintéticos)")
    print(f"  AUC no teste: baseline {_pt(metrics['auc_baseline'], 3)} | "
          f"modelo {_pt(metrics['auc_model'], 3)}")
    print(f"  Chance média de sucesso no top-5 ({cf['n_shifts']:.0f} vagas de teste):")
    print(f"    oráculo {_pt(cf['oracle'] * 100, 1)}% | modelo {_pt(cf['model'] * 100, 1)}% | "
          f"baseline {_pt(cf['baseline'] * 100, 1)}% | sorteio {_pt(cf['random'] * 100, 1)}%")
    return 0


def _load_model(data_dir: Path, dataset: Dataset, params: dict[str, Any]) -> LogisticModel:
    registry = data_dir / "model_registry.json"
    if registry.exists():
        return LogisticModel.from_dict(json.loads(registry.read_text(encoding="utf-8"))["model"])
    model, _ = evaluate(dataset, params)
    return model


def cmd_demo(args: argparse.Namespace) -> int:
    data_dir = Path(args.data)
    dataset, params = _load(data_dir)
    model = _load_model(data_dir, dataset, params)
    today = date.fromisoformat(args.today)
    now = datetime.combine(today, time(9, 0))
    text = args.text or DEFAULT_TEXT
    client: LLMClient | None = client_from_env() if args.llm == "gemini" else None
    audit_path = Path(args.audit)
    if args.fresh and audit_path.exists():
        audit_path.unlink()
    audit = AuditLog(audit_path)

    print("PlantãoSeguro, PoC mínima (SIMULAÇÃO: dados sintéticos, sem validade médica ou legal)")
    print(f"Hoje (simulado): {_when(now)}. A IA recomenda; o humano decide.\n")
    result = extract(text, today, dataset.units, client)
    print(render_extraction(text, result, dataset))
    missing = result.fields.missing_required()
    if missing:
        print(f"\nFaltam campos obrigatórios ({', '.join(missing)}): o coordenador completa.")
        return 2
    coordinator = "coordenador-demo"
    audit.append(
        now=now, actor_role="coordinator", actor_pseudo_id=coordinator, action="shift_published",
        entity_type="shift_request", entity_id="demo",
        details={"extraction_source": result.source, "flags": list(result.flags)},
    )
    audit.append(
        now=now, actor_role="coordinator", actor_pseudo_id=coordinator,
        action="extraction_confirmed", entity_type="shift_request", entity_id="demo",
        details={"missing_optional": result.fields.missing()},
    )
    rec = recommend(
        dataset, FeatureStore(dataset), model, result.fields, now, client=client, audit=audit
    )
    print("\n" + render_recommendation(rec, dataset))
    if not rec.candidates:
        print("\nNenhum candidato elegível.")
        return 3
    if args.yes:
        chosen = [c.doctor_id for c in rec.candidates[:3]]
        mode = "automatico_apenas_demo"
        print("\n5) Aprovação: --yes aprova os 3 primeiros apenas para a demonstração.")
    else:
        answer = input("\n5) Aprovar quais candidatos? (ex.: 1,2,3; Enter = nenhum) ").strip()
        ranks = {int(p) for p in answer.split(",") if p.strip().isdigit()}
        chosen = [c.doctor_id for c in rec.candidates if c.rank in ranks]
        mode = "humano"
    if chosen:
        approve(audit, rec, chosen, now=now, coordinator_id=coordinator, mode=mode)
        print(f"   Aprovados: {len(chosen)}. A oferta em cascata (n8n) é evolução futura.")
    else:
        print("   Nenhuma aprovação: nenhuma oferta sai.")
    intact, count = audit.verify()
    print(f"\n6) Trilha de auditoria: {count} registros, cadeia de hash "
          f"{'íntegra' if intact else 'ADULTERADA'} ({audit_path.name}).")
    return 0


def cmd_analyze(args: argparse.Namespace) -> int:
    from app.analysis import write_analysis

    dataset, params = _load(Path(args.data))
    out_dir = Path(args.out)
    write_analysis(dataset, params, out_dir)
    print(f"Análise exploratória gravada em {out_dir}")
    return 0


def cmd_walkthrough(args: argparse.Namespace) -> int:
    from app.walkthrough import render_walkthrough

    data_dir = Path(args.data)
    dataset, params = _load(data_dir)
    model = _load_model(data_dir, dataset, params)
    markdown = render_walkthrough(
        dataset, model, args.text or DEFAULT_TEXT, date.fromisoformat(args.today), Path(args.audit)
    )
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(markdown, encoding="utf-8")
    print(f"Exemplo trabalhado gravado em {out}")
    return 0


def cmd_build_doc(args: argparse.Namespace) -> int:
    from app.docbuild import render

    source = Path(args.source)
    html = render(source.read_text(encoding="utf-8"), source.parent)
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html, encoding="utf-8")
    print(f"HTML imprimível gravado em {out} ({len(html) // 1024} KB)")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="python -m app.cli", description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)

    seed = sub.add_parser("seed", help="gera os dados sintéticos")
    seed.add_argument("--out", default=str(DEFAULT_DATA))
    seed.add_argument("--params", default=None)
    seed.add_argument("--report", default=None, help="também grava o relatório de qualidade aqui")
    seed.add_argument("--sample", default=None, help="gera um conjunto pequeno neste diretório")
    seed.set_defaults(func=cmd_seed)

    ev = sub.add_parser("evaluate", help="treina o modelo e compara com o baseline")
    ev.add_argument("--data", default=str(DEFAULT_DATA))
    ev.add_argument("--report-dir", default=None)
    ev.set_defaults(func=cmd_evaluate)

    demo = sub.add_parser("demo", help="fluxo completo para uma vaga em texto livre")
    demo.add_argument("--data", default=str(DEFAULT_DATA))
    demo.add_argument("--text", default=None)
    demo.add_argument("--today", default="2026-10-01")
    demo.add_argument("--llm", choices=("none", "gemini"), default="none")
    demo.add_argument("--audit", default=str(DEFAULT_DATA / "audit_log.jsonl"))
    demo.add_argument("--fresh", action="store_true", help="recomeça a trilha de auditoria")
    demo.add_argument("--yes", action="store_true", help="aprova os 3 primeiros (só para a demo)")
    demo.set_defaults(func=cmd_demo)

    walk = sub.add_parser("walkthrough", help="exemplo trabalhado, passo a passo, em Markdown")
    walk.add_argument("--data", default=str(DEFAULT_DATA))
    walk.add_argument("--text", default=None)
    walk.add_argument("--today", default="2026-10-01")
    walk.add_argument("--audit", default=str(DEFAULT_DATA / "audit_walkthrough.jsonl"))
    walk.add_argument("--out", default=str(REPO_ROOT / "docs" / "exemplo-trabalhado.md"))
    walk.set_defaults(func=cmd_walkthrough)

    doc = sub.add_parser("build-doc", help="converte um documento Markdown em HTML imprimível")
    docs_dir = REPO_ROOT / "docs"
    doc.add_argument("--source", default=str(docs_dir / "03-entrega-2-prova-de-conceito.md"))
    doc.add_argument("--out", default=str(docs_dir / "entrega-2" / "Entrega2-PlantaoSeguro.html"))
    doc.set_defaults(func=cmd_build_doc)

    analyze = sub.add_parser("analyze", help="análise exploratória dos dados")
    analyze.add_argument("--data", default=str(DEFAULT_DATA))
    analyze.add_argument("--out", default=str(REPO_ROOT / "docs" / "analise"))
    analyze.set_defaults(func=cmd_analyze)
    return parser


def main(argv: list[str] | None = None) -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    args = build_parser().parse_args(argv)
    return int(args.func(args))


if __name__ == "__main__":
    raise SystemExit(main())
