"""Carrega os pesos do modelo e confere que são os da linha ativa de `model_registry` (ADR 0010)."""

import json
from pathlib import Path
from typing import Any

from app.ranking.features import RANKING_FEATURES
from app.ranking.model import LogisticModel

ACTIVE_MODEL_PATH = Path(__file__).resolve().parents[1] / "ranking" / "modelo_ativo.json"


class ModelMismatchError(RuntimeError):
    """Os pesos do arquivo não são os do modelo ativo no banco: a API não sobe."""


def load_active_model(path: Path = ACTIVE_MODEL_PATH) -> LogisticModel:
    """Lê os pesos. `from_dict` já barra variável proibida; aqui só entram as do contrato."""
    model = LogisticModel.from_dict(json.loads(path.read_text(encoding="utf-8")))
    if set(model.feature_names) != set(RANKING_FEATURES):
        raise ModelMismatchError("o arquivo do modelo não usa as variáveis do contrato")
    return model


def check_against_registry(model: LogisticModel, active_rows: list[dict[str, Any]]) -> None:
    """A versão e as variáveis precisam bater com a única linha ativa do registro."""
    if len(active_rows) != 1:
        raise ModelMismatchError(f"esperada 1 linha ativa em model_registry; há {len(active_rows)}")
    row = active_rows[0]
    if row["model_version"] != model.version:
        raise ModelMismatchError(
            f"o banco diz {row['model_version']} e o arquivo diz {model.version}"
        )
    if set(row["features"]) != set(model.feature_names):
        raise ModelMismatchError("as variáveis do registro diferem das do arquivo")
