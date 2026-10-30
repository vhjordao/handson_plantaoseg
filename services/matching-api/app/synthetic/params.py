"""Parâmetros do simulador de dados sintéticos.

São premissas do projeto, sem fonte externa e sem validação com dados reais. Quem altera
um valor registra a mudança no manifesto (ele guarda os parâmetros usados).
"""

import json
from copy import deepcopy
from pathlib import Path
from typing import Any

GENERATOR_VERSION = "0.1.0"
DICTIONARY_VERSION = "v0.2"

DEFAULTS: dict[str, Any] = {
    "seed": 20261030,
    "start_date": "2025-10-01",
    "end_date": "2026-09-30",
    "test_start": "2026-08-01",
    "n_doctors": 300,
    "share_pediatria": 0.45,
    "p_night_shift": 0.9,
    "p_weekend_day_shift": 0.8,
    "max_offers_per_shift": 8,
    "ttl_minutes": 60,
    "double_shift_boost": 60.0,
    "historical_bias_scenario": True,
    "zone_exposure": {"centro": 1.8, "norte": 1.0, "sul": 1.0, "leste": 0.6, "oeste": 0.6},
    "age_exposure": {"25-34": 0.8, "35-44": 1.5, "45-54": 1.0, "55+": 0.5},
    "text_requests": 400,
    "accept": {
        "b0": 0.2,
        "distance": -0.09,
        "preference": 0.7,
        "reliability": 2.2,
        "not_covered": -2.0,
        "contiguous": -0.5,
        "rest_lt_11": -2.0,
        "rest_lt_24": -0.5,
        "load_30d": -0.15,
        "urgency_high": 0.4,
        "secondary_specialty": -0.5,
    },
}


def load_params(
    path: Path | None = None, overrides: dict[str, Any] | None = None
) -> dict[str, Any]:
    """Parâmetros padrão, sobrescritos por um JSON e depois por `overrides`."""
    params = deepcopy(DEFAULTS)
    if path is not None and path.exists():
        params.update(json.loads(path.read_text(encoding="utf-8")))
    if overrides:
        params.update(overrides)
    return params
