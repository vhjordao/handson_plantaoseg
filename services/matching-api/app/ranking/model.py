"""Regressão logística em Python puro (IRLS), com explicação por contribuição de variável.

Sem dependências para rodar em qualquer máquina e na CI. As variáveis vêm exclusivamente de
`RANKING_FEATURES`, e `validar_features` barra pagamento e atributos protegidos.
"""

import math
from dataclasses import dataclass
from typing import Any

from app.ranking.features import RANKING_FEATURES, validar_features


def sigmoid(x: float) -> float:
    if x >= 0:
        return 1.0 / (1.0 + math.exp(-x))
    z = math.exp(x)
    return z / (1.0 + z)


def solve_linear(matrix: list[list[float]], vector: list[float]) -> list[float]:
    """Resolve A x = b por eliminação de Gauss com pivô parcial."""
    n = len(vector)
    a = [row[:] + [vector[i]] for i, row in enumerate(matrix)]
    for col in range(n):
        pivot = col
        for candidate in range(col + 1, n):
            if abs(a[candidate][col]) > abs(a[pivot][col]):
                pivot = candidate
        if abs(a[pivot][col]) < 1e-12:
            raise ValueError("sistema singular")
        a[col], a[pivot] = a[pivot], a[col]
        for row in range(col + 1, n):
            factor = a[row][col] / a[col][col]
            for k in range(col, n + 1):
                a[row][k] -= factor * a[col][k]
    x = [0.0] * n
    for row in range(n - 1, -1, -1):
        total = a[row][n] - sum(a[row][k] * x[k] for k in range(row + 1, n))
        x[row] = total / a[row][row]
    return x


def fit_logistic(
    rows: list[list[float]], labels: list[int], l2: float = 1.0, iterations: int = 15
) -> list[float]:
    """Ajusta os pesos (viés primeiro) por mínimos quadrados reponderados iterativamente."""
    k = len(rows[0]) + 1
    weights = [0.0] * k
    for _ in range(iterations):
        grad = [0.0] * k
        hess = [[0.0] * k for _ in range(k)]
        for x, y in zip(rows, labels, strict=True):
            xb = [1.0, *x]
            p = sigmoid(sum(w * v for w, v in zip(weights, xb, strict=True)))
            err = y - p
            curvature = p * (1.0 - p)
            for i in range(k):
                grad[i] += err * xb[i]
                scaled = curvature * xb[i]
                row_i = hess[i]
                for j in range(i + 1):
                    row_i[j] += scaled * xb[j]
        for i in range(k):
            for j in range(i):
                hess[j][i] = hess[i][j]
            if i > 0:
                hess[i][i] += l2
                grad[i] -= l2 * weights[i]
        step = solve_linear(hess, grad)
        weights = [w + s for w, s in zip(weights, step, strict=True)]
        if max(abs(s) for s in step) < 1e-6:
            break
    return weights


@dataclass
class LogisticModel:
    version: str
    feature_names: tuple[str, ...]
    means: list[float]
    stds: list[float]
    weights: list[float]  # viés + um peso por variável padronizada

    def _standardize(self, features: dict[str, float]) -> list[float]:
        return [
            (features[name] - mean) / std
            for name, mean, std in zip(self.feature_names, self.means, self.stds, strict=True)
        ]

    def probability(self, features: dict[str, float]) -> float:
        z = self.weights[0] + sum(
            w * x for w, x in zip(self.weights[1:], self._standardize(features), strict=True)
        )
        return sigmoid(z)

    def contributions(
        self, features: dict[str, float], reference: dict[str, float] | None = None
    ) -> dict[str, float]:
        """Quanto cada variável empurra o score, em relação a uma referência.

        Sem `reference`, é peso x valor padronizado. Com `reference` (por exemplo, a média dos
        elegíveis), mede o que diferencia este candidato dos demais: variável constante entre
        os elegíveis contribui zero e não aparece como motivo.
        """
        values = self._standardize(features)
        base = self._standardize(reference) if reference else [0.0] * len(values)
        return {
            name: w * (x - r)
            for name, w, x, r in zip(
                self.feature_names, self.weights[1:], values, base, strict=True
            )
        }

    def to_dict(self) -> dict[str, Any]:
        return {
            "version": self.version,
            "kind": "logistic_regression",
            "label": "simulacao",
            "feature_names": list(self.feature_names),
            "means": self.means,
            "stds": self.stds,
            "weights": self.weights,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "LogisticModel":
        names = tuple(data["feature_names"])
        validar_features(names)
        return cls(data["version"], names, data["means"], data["stds"], data["weights"])


def train_model(
    rows: list[dict[str, float]], labels: list[bool], version: str, l2: float = 1.0
) -> LogisticModel:
    """Treina a regressão logística nas variáveis permitidas e padroniza as colunas."""
    validar_features(RANKING_FEATURES)
    names = tuple(RANKING_FEATURES)
    matrix = [[row[name] for name in names] for row in rows]
    count = len(matrix)
    means = [sum(col) / count for col in zip(*matrix, strict=True)]
    stds = []
    for col, mean in zip(zip(*matrix, strict=True), means, strict=True):
        std = math.sqrt(sum((v - mean) ** 2 for v in col) / count)
        stds.append(std if std > 1e-9 else 1.0)
    standardized = [
        [(v - m) / s for v, m, s in zip(row, means, stds, strict=True)] for row in matrix
    ]
    weights = fit_logistic(standardized, [int(y) for y in labels], l2=l2)
    return LogisticModel(version, names, means, stds, weights)
