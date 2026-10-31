"""Gráficos de colunas em SVG puro (sem dependências), para os relatórios em Markdown.

Segue as regras de visualização do projeto: um eixo só, colunas finas (até 24 px) com a ponta
arredondada e a base reta, 2 px de folga entre colunas coladas, grade em linha fina e apagada,
rótulo direto no topo (nunca na cor da série), legenda sempre que houver duas séries ou mais
e uma tabela com os mesmos números ao lado de cada figura (feita por quem usa o gráfico).
As cores são os slots 1 (azul) e 2 (laranja) da paleta categórica validada do projeto, sobre
a superfície clara; a figura leva o próprio fundo para ficar legível em tema claro ou escuro.
"""

import math
from collections.abc import Callable
from html import escape

SURFACE = "#fcfcfb"
INK = "#0b0b0b"
INK_2 = "#52514e"
MUTED = "#898781"
GRID = "#e1e0d9"
AXIS = "#c3c2b7"
SERIES = ("#2a78d6", "#eb6834")
FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif'

WIDTH, HEIGHT = 640, 360
COMPACT = {"width": 440, "height": 300}  # para figuras lado a lado em uma página A4
LEFT, RIGHT, TOP, BOTTOM = 56, 24, 96, 64
MAX_BAR = 24
GAP = 2


def nice_ticks(raw_max: float) -> list[float]:
    """Marcas do eixo com passo redondo (1, 2, 2,5 ou 5 x 10^n), com no máximo 6 intervalos."""
    if raw_max <= 0:
        return [0.0, 1.0]
    base = 10 ** math.floor(math.log10(raw_max))
    step = base
    for multiplier in (1, 2, 2.5, 5, 10, 20):
        step = multiplier * base
        if math.ceil(raw_max / step) <= 6:
            break
    count = math.ceil(raw_max / step)
    return [index * step for index in range(count + 1)]


def _wrap(label: str, width: int = 14) -> list[str]:
    words, lines, current = label.split(), [], ""
    for word in words:
        if current and len(current) + 1 + len(word) > width:
            lines.append(current)
            current = word
        else:
            current = f"{current} {word}".strip()
    return [*lines, current] if current else [label]


def _bar_path(x: float, y: float, width: float, base: float) -> str:
    """Coluna com a ponta de cima arredondada (4 px) e a base reta."""
    height = base - y
    radius = min(4.0, width / 2, height)
    return (
        f"M{x:.1f},{base:.1f} L{x:.1f},{y + radius:.1f} Q{x:.1f},{y:.1f} {x + radius:.1f},{y:.1f} "
        f"L{x + width - radius:.1f},{y:.1f} Q{x + width:.1f},{y:.1f} {x + width:.1f},"
        f"{y + radius:.1f} L{x + width:.1f},{base:.1f} Z"
    )


def column_chart(
    title: str,
    subtitle: str,
    categories: list[str],
    series: list[tuple[str, list[float]]],
    fmt: Callable[[float], str],
    description: str,
    *,
    width: int = WIDTH,
    height: int = HEIGHT,
) -> str:
    """Gera o SVG de um gráfico de colunas simples (uma série) ou agrupado (até duas).

    `width` e `height` dão o tamanho do desenho. Um gráfico menor, mostrado na mesma largura
    de página, fica com o texto proporcionalmente maior (títulos e rótulos têm de caber).
    """
    if not 1 <= len(series) <= len(SERIES):
        raise ValueError("o gráfico aceita de 1 a 2 séries")
    top_value = max(max(values) for _, values in series)
    ticks = nice_ticks(top_value * 1.12)
    y_max = ticks[-1]
    plot_left, plot_right = LEFT, width - RIGHT
    plot_top, plot_base = TOP, height - BOTTOM
    scale = (plot_base - plot_top) / y_max
    band = (plot_right - plot_left) / len(categories)
    wrap = 14 if width == WIDTH else max(6, int(band / 6.4))
    count = len(series)
    thickness = min(MAX_BAR, (band * 0.7 - GAP * (count - 1)) / count)
    label_all = len(categories) * count <= 12
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" role="img" '
        f"aria-labelledby=\"t d\" font-family='{FONT}'>",
        f'<title id="t">{escape(title)}</title><desc id="d">{escape(description)}</desc>',
        f'<rect width="{width}" height="{height}" fill="{SURFACE}"/>',
        f'<text x="{LEFT}" y="28" font-size="16" font-weight="600" fill="{INK}">'
        f"{escape(title)}</text>",
        f'<text x="{LEFT}" y="48" font-size="12" fill="{INK_2}">{escape(subtitle)}</text>',
    ]
    if count > 1:
        x = float(LEFT)
        for index, (name, _) in enumerate(series):
            parts.append(
                f'<rect x="{x:.1f}" y="62" width="10" height="10" rx="2" fill="{SERIES[index]}"/>'
                f'<text x="{x + 16:.1f}" y="71" font-size="12" fill="{INK_2}">{escape(name)}</text>'
            )
            x += 16 + 7 * len(name) + 24
    for step, value in enumerate(ticks):
        y = plot_base - value * scale
        stroke = AXIS if step == 0 else GRID
        parts.append(
            f'<line x1="{plot_left}" x2="{plot_right}" y1="{y:.1f}" y2="{y:.1f}" '
            f'stroke="{stroke}" stroke-width="1"/>'
            f'<text x="{plot_left - 8}" y="{y + 4:.1f}" font-size="11" text-anchor="end" '
            f'fill="{MUTED}">{escape(fmt(value))}</text>'
        )
    best = max(
        ((s, i) for s, (_, values) in enumerate(series) for i in range(len(values))),
        key=lambda pos: series[pos[0]][1][pos[1]],
    )
    for index, category in enumerate(categories):
        group = count * thickness + GAP * (count - 1)
        start = plot_left + band * index + (band - group) / 2
        for s, (_, values) in enumerate(series):
            value = values[index]
            x = start + s * (thickness + GAP)
            y = plot_base - value * scale
            if value > 0:
                parts.append(
                    f'<path d="{_bar_path(x, y, thickness, plot_base)}" ' f'fill="{SERIES[s]}"/>'
                )
            if label_all or (s, index) == best:
                parts.append(
                    f'<text x="{x + thickness / 2:.1f}" y="{y - 6:.1f}" font-size="11" '
                    f'text-anchor="middle" fill="{INK_2}">{escape(fmt(value))}</text>'
                )
        for line, text in enumerate(_wrap(category, wrap)):
            parts.append(
                f'<text x="{plot_left + band * (index + 0.5):.1f}" '
                f'y="{plot_base + 18 + 14 * line:.1f}" font-size="11" text-anchor="middle" '
                f'fill="{INK_2}">{escape(text)}</text>'
            )
    parts.append("</svg>")
    return "\n".join(parts)
