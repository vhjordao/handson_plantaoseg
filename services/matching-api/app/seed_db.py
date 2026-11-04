"""Carga dos dados sintéticos no banco do Supabase: gera um arquivo SQL, sem tocar em banco nenhum.

As datas andam em semanas inteiras, para o histórico terminar perto da apresentação. Isso preserva
os dias da semana e as diferenças entre datas, então as métricas publicadas não mudam, e
`metric_differences` confere. `doctors_latent`, o gabarito do simulador, não entra, e `accepted` e
`y_success` são derivados pelo próprio banco. O arquivo se recusa a rodar em um banco com dados e
confere as contagens no fim, na mesma transação.
"""

import json
from dataclasses import fields, replace
from datetime import date, datetime, time, timedelta
from typing import Any

from app.models import Compensation, Dataset

DEMO_DAY = date(2026, 11, 17)
UTC_OFFSET = "-03:00"  # America/Sao_Paulo, sem horário de verão desde 2019
BATCH_SIZE = 500
DERIVED_COLUMNS = {"offers": {"accepted", "y_success"}}
SHIFTED_PARAMS = ("start_date", "end_date", "test_start")
IGNORED_METRICS = {"test_start"}


def _tables(dataset: Dataset) -> dict[str, list[Any]]:
    """As tabelas carregadas, na ordem em que as chaves estrangeiras permitem inserir."""
    return {
        "organizations": dataset.organizations,
        "units": list(dataset.units.values()),
        "doctors": list(dataset.doctors.values()),
        "doctor_availability": [w for windows in dataset.windows.values() for w in windows],
        "policy_config": [dataset.policy],
        "shift_requests": dataset.requests,
        "shifts": list(dataset.shifts.values()),
        "shift_compensation": [Compensation(k, v) for k, v in dataset.compensation.items()],
        "offers": dataset.offers,
    }


def _moments(row: Any) -> list[datetime]:
    moments = []
    for field in fields(row):
        value = getattr(row, field.name)
        if isinstance(value, datetime):
            moments.append(value)
        elif isinstance(value, date):
            moments.append(datetime.combine(value, time()))
    return moments


def weeks_until(dataset: Dataset, day: date = DEMO_DAY) -> int:
    """Quantas semanas inteiras cabem entre o último registro e o dia da apresentação."""
    rows = [row for table in _tables(dataset).values() for row in table]
    last = max(moment for row in rows for moment in _moments(row))
    return (datetime.combine(day, time()) - last).days // 7


def _shifted(row: Any, delta: timedelta) -> Any:
    changes = {}
    for field in fields(row):
        value = getattr(row, field.name)
        if isinstance(value, date):  # datetime também é date
            changes[field.name] = value + delta
    return replace(row, **changes) if changes else row


def shift_dataset(dataset: Dataset, weeks: int) -> Dataset:
    """Uma cópia do conjunto com todas as datas `weeks` semanas à frente."""
    delta = timedelta(weeks=weeks)
    return Dataset(
        organizations=[_shifted(row, delta) for row in dataset.organizations],
        units=dataset.units,
        doctors={key: _shifted(row, delta) for key, row in dataset.doctors.items()},
        windows={
            key: [_shifted(row, delta) for row in rows] for key, rows in dataset.windows.items()
        },
        shifts={key: _shifted(row, delta) for key, row in dataset.shifts.items()},
        requests=[_shifted(row, delta) for row in dataset.requests],
        offers=[_shifted(row, delta) for row in dataset.offers],
        policy=_shifted(dataset.policy, delta),
        compensation=dataset.compensation,
        latent=dataset.latent,
    )


def shift_params(params: dict[str, Any], weeks: int) -> dict[str, Any]:
    delta = timedelta(weeks=weeks)
    moved = {
        key: (date.fromisoformat(params[key]) + delta).isoformat() for key in SHIFTED_PARAMS
    }
    return {**params, **moved}


def metric_differences(published: Any, measured: Any, *, path: str = "") -> list[str]:
    """Onde as métricas divergem. Tolera só o ruído de arredondamento entre plataformas."""
    if isinstance(published, dict) and isinstance(measured, dict):
        differences = []
        for key in sorted((set(published) | set(measured)) - IGNORED_METRICS):
            if key not in published or key not in measured:
                differences.append(f"{path}.{key}")
            else:
                differences += metric_differences(
                    published[key], measured[key], path=f"{path}.{key}"
                )
        return differences
    if isinstance(published, list) and isinstance(measured, list):
        if len(published) != len(measured):
            return [path]
        return [
            difference
            for index, (left, right) in enumerate(zip(published, measured, strict=True))
            for difference in metric_differences(left, right, path=f"{path}[{index}]")
        ]
    if isinstance(published, int | float) and isinstance(measured, int | float):
        same = published == measured or abs(published - measured) <= 1e-9
        both_nan = published != published and measured != measured
        return [] if same or both_nan else [path]
    return [] if published == measured else [path]


def literal(value: Any) -> str:
    """Valor em SQL. Toda aspa é dobrada: os textos adversariais da simulação são entrada hostil."""
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, int | float):
        return repr(value)
    if isinstance(value, datetime):
        return f"'{value:%Y-%m-%dT%H:%M:%S}{UTC_OFFSET}'"
    if isinstance(value, date | time):
        return f"'{value.isoformat()}'"
    if isinstance(value, list):
        return "array[" + ", ".join(literal(item) for item in value) + "]::text[]"
    if isinstance(value, dict):
        return literal(json.dumps(value, ensure_ascii=False, sort_keys=True)) + "::jsonb"
    return "'" + str(value).replace("'", "''") + "'"


def _insert(table: str, columns: list[str], rows: list[tuple[Any, ...]]) -> list[str]:
    statements = []
    for start in range(0, len(rows), BATCH_SIZE):
        values = ",\n".join(
            "(" + ", ".join(literal(value) for value in row) + ")"
            for row in rows[start : start + BATCH_SIZE]
        )
        statements.append(f"insert into public.{table} ({', '.join(columns)}) values\n{values};")
    return statements


def _registry_row(registry: dict[str, Any], params: dict[str, Any]) -> dict[str, Any]:
    model, metrics = registry["model"], registry["metrics"]
    test_start = date.fromisoformat(params["test_start"])
    return {
        "model_version": model["version"],
        "kind": model["kind"],
        # O registro não guarda a hora do treino: o que importa é o corte entre treino e teste.
        "trained_at": datetime.combine(test_start, time()),
        "train_period": f"{params['start_date']}..{test_start - timedelta(days=1)}",
        "test_period": f"{test_start}..{params['end_date']}",
        "features": list(model["feature_names"]),
        "metrics": {**metrics, "test_start": params["test_start"]},
        "status": "active",
    }


def render_seed(
    dataset: Dataset, params: dict[str, Any], registry: dict[str, Any], weeks: int
) -> str:
    """O arquivo SQL da carga, com as datas já deslocadas. Mesma entrada, mesmo arquivo."""
    moved = shift_dataset(dataset, weeks)
    moved_params = shift_params(params, weeks)
    tables = _tables(moved)
    statements = [
        "-- Gerado por `python -m app.cli seed-db`. Não edite: rode o comando de novo.",
        "-- Dados fictícios (simulação), sem validade médica ou legal. Nada aqui é real.",
        f"-- Datas deslocadas {weeks} semanas à frente. Sem o gabarito do simulador.",
        "begin;",
        "do $$\nbegin\n"
        "  if exists (select 1 from public.organizations) then\n"
        "    raise exception 'o banco já tem dados: a carga só roda em um banco vazio';\n"
        "  end if;\nend;\n$$;",
    ]
    for table, rows in tables.items():
        skipped = DERIVED_COLUMNS.get(table, set())
        columns = [field.name for field in fields(rows[0]) if field.name not in skipped]
        statements += _insert(
            table, columns, [tuple(getattr(row, name) for name in columns) for row in rows]
        )
    registry_row = _registry_row(registry, moved_params)
    statements += _insert("model_registry", list(registry_row), [tuple(registry_row.values())])

    checks = [
        f"(select count(*) from public.{table}) <> {len(rows)}" for table, rows in tables.items()
    ]
    checks.append(
        "(select count(*) from public.offers where accepted) <> "
        f"{sum(offer.accepted for offer in moved.offers)}"
    )
    checks.append(
        "(select count(*) from public.offers where y_success) <> "
        f"{sum(offer.y_success for offer in moved.offers)}"
    )
    condition = "\n     or ".join(checks)
    statements.append(
        f"do $$\nbegin\n  if {condition} then\n"
        "    raise exception 'a carga não bateu com os dados gerados';\n"
        "  end if;\nend;\n$$;"
    )
    statements.append("commit;")
    return "\n".join(statements) + "\n"
