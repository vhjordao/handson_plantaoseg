"""Conversor mínimo de Markdown para HTML imprimível (só biblioteca padrão).

Cobre o subconjunto usado nos documentos do projeto: títulos, parágrafos, listas, tabelas,
blocos de código, citações, imagens (embutidas em base64, para o HTML ficar autônomo),
negrito, itálico, código em linha e links. Links relativos viram links absolutos do GitHub.
A impressão em PDF fica a cargo do navegador (`scripts/gerar-pdf.sh`).

Recursos de apresentação, todos com um Markdown que também funciona no GitHub:

* `> [!NOTE]` (ou `IMPORTANT`, `WARNING`, `TIP`, `CAUTION`) abre uma caixa de destaque; o conteúdo
  da citação é Markdown de verdade (parágrafos e listas);
* `<!-- kpis -->` antes de uma tabela de 3 colunas (valor, indicador, nota) a desenha como
  cartões lado a lado;
* `<!-- keep -->` antes de uma tabela impede que ela seja partida entre duas páginas;
* imagens em linhas seguidas, sem linha em branco entre elas, ficam lado a lado;
* o parágrafo logo depois do título vira a linha de identificação do documento.
"""

import base64
import posixpath
import re
from html import escape
from pathlib import Path

REPO_URL = "https://github.com/vhjordao/handson_plantaoseg/blob/main/"

CSS = """
@page { size: A4; margin: 13mm 13mm 16mm 13mm;
  @bottom-left { content: "PlantãoSeguro · simulação com dados sintéticos";
    font: 7.5pt "Segoe UI", system-ui, Arial, sans-serif; color: #898781; }
  @bottom-right { content: "Página " counter(page) " de " counter(pages);
    font: 7.5pt "Segoe UI", system-ui, Arial, sans-serif; color: #898781; } }
* { box-sizing: border-box; }
body { font-family: "Segoe UI", system-ui, Arial, sans-serif; font-size: 10pt; line-height: 1.4;
  color: #0b0b0b; margin: 0; }
h1 { font-size: 19pt; margin: 0 0 3pt; line-height: 1.15; padding-left: 8pt;
  border-left: 5px solid #2a78d6; }
h2 { font-size: 12.5pt; margin: 12pt 0 3pt; padding-bottom: 2pt; border-bottom: 1.5px solid #2a78d6;
  break-after: avoid; }
h3 { font-size: 10.5pt; margin: 8pt 0 2pt; break-after: avoid; }
p { margin: 3pt 0; }
ul, ol { margin: 3pt 0 3pt 15pt; padding: 0; }
li { margin: 1.5pt 0; }
table { width: 100%; border-collapse: collapse; margin: 5pt 0; font-size: 8.6pt;
  line-height: 1.3; }
th { background: #ecebe5; text-align: left; padding: 2.5pt 4.5pt; font-weight: 600;
  border-bottom: 1.5px solid #c3c2b7; }
td { padding: 2.5pt 4.5pt; border-bottom: 1px solid #e1e0d9; vertical-align: top; }
tbody tr:nth-child(even) td { background: #faf9f6; }
tr { break-inside: avoid; }
table.keep { break-inside: avoid; }
code { font-family: Consolas, "Cascadia Mono", monospace; font-size: 8.3pt; background: #f1f0ec;
  padding: 0 2px; border-radius: 2px; }
pre { background: #f6f5f1; border: 1px solid #e1e0d9; padding: 5pt; margin: 4pt 0; font-size: 7.6pt;
  line-height: 1.25; white-space: pre-wrap; break-inside: avoid; }
pre code { background: none; padding: 0; font-size: inherit; }
blockquote { margin: 5pt 0; padding: 3pt 9pt; border-left: 3px solid #898781; background: #f6f5f1;
  color: #1c1b19; border-radius: 0 3px 3px 0; break-inside: avoid; }
blockquote.note, blockquote.tip { border-left-color: #2a78d6; background: #f0f5fc; }
blockquote.important, blockquote.warning, blockquote.caution { border-left-color: #eb6834;
  background: #fdf4ef; }
blockquote p { margin: 2pt 0; }
blockquote ul, blockquote ol { margin: 2pt 0 2pt 14pt; }
figure { margin: 4pt 0; text-align: center; break-inside: avoid; }
figure img { max-width: 100%; max-height: 54mm; }
figcaption { font-size: 8pt; color: #52514e; }
.figs { display: flex; gap: 8pt; margin: 4pt 0; break-inside: avoid; }
.figs figure { flex: 1 1 0; min-width: 0; margin: 0; }
.figs figure img { width: 100%; max-height: 56mm; object-fit: contain; }
.kpis { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 6pt; margin: 6pt 0;
  break-inside: avoid; }
.kpi { border: 1px solid #e1e0d9; border-top: 3px solid #2a78d6; border-radius: 4px;
  padding: 5pt 7pt 6pt; background: #fcfcfb; }
.kpi b { display: block; font-size: 17pt; line-height: 1.1; color: #0b0b0b; }
.kpi span { display: block; font-size: 8.4pt; font-weight: 600; margin-top: 1pt;
  line-height: 1.25; }
.kpi small { display: block; font-size: 7.6pt; color: #52514e; margin-top: 2pt; line-height: 1.25; }
a { color: #1c5cab; text-decoration: none; }
.meta { color: #3a3935; font-size: 9pt; margin: 2pt 0 5pt; padding-left: 13pt; }
"""

_SCHEME = re.compile(r"^(https?:|mailto:|#)")
_IMAGE = re.compile(r"^!\[(.*)\]\((.+)\)$")
_ALERT = re.compile(r"^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*$")


def _resolve(href: str, doc_dir: str) -> str:
    if _SCHEME.match(href):
        return href
    path, _, anchor = href.partition("#")
    resolved = posixpath.normpath(posixpath.join(doc_dir, path))
    return REPO_URL + resolved + (f"#{anchor}" if anchor else "")


def inline(text: str, doc_dir: str = "docs") -> str:
    """Negrito, itálico, código em linha e links, com o HTML escapado."""
    codes: list[str] = []

    def keep(match: re.Match[str]) -> str:
        codes.append(f"<code>{escape(match.group(1), quote=False)}</code>")
        return f"\x00{len(codes) - 1}\x00"

    text = re.sub(r"`([^`]+)`", keep, text)
    text = escape(text, quote=False)
    text = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"(?<![*\w])\*(?!\s)(.+?)(?<!\s)\*(?![*\w])", r"<em>\1</em>", text)
    text = re.sub(
        r"\[([^\]]+)\]\(([^)]+)\)",
        lambda m: f'<a href="{escape(_resolve(m.group(2), doc_dir))}">{m.group(1)}</a>',
        text,
    )
    return re.sub(r"\x00(\d+)\x00", lambda m: codes[int(m.group(1))], text)


def _data_uri(path: Path) -> str:
    kind = "image/svg+xml" if path.suffix.lower() == ".svg" else "image/png"
    return f"data:{kind};base64," + base64.b64encode(path.read_bytes()).decode("ascii")


def _cells(line: str) -> list[str]:
    return [cell.strip() for cell in line.strip().strip("|").split("|")]


def _table(lines: list[str], doc_dir: str, keep: bool = False) -> str:
    header, rule, rows = _cells(lines[0]), _cells(lines[1]), [_cells(x) for x in lines[2:]]
    align = ["right" if c.endswith(":") and not c.startswith(":") else "left" for c in rule]
    head = "".join(
        f'<th style="text-align:{a}">{inline(c, doc_dir)}</th>'
        for c, a in zip(header, align, strict=False)
    )
    body = "".join(
        "<tr>"
        + "".join(
            f'<td style="text-align:{a}">{inline(c, doc_dir)}</td>'
            for c, a in zip(row, align, strict=False)
        )
        + "</tr>"
        for row in rows
    )
    tag = '<table class="keep">' if keep else "<table>"
    return f"{tag}<thead><tr>{head}</tr></thead><tbody>{body}</tbody></table>"


def _kpis(lines: list[str], doc_dir: str) -> str:
    """Tabela (valor, indicador, nota) desenhada como cartões lado a lado."""
    tiles = []
    for row in (_cells(line) for line in lines[2:]):
        note = f"<small>{inline(row[2], doc_dir)}</small>" if len(row) > 2 and row[2] else ""
        tiles.append(
            f'<div class="kpi"><b>{inline(row[0], doc_dir)}</b>'
            f"<span>{inline(row[1], doc_dir)}</span>{note}</div>"
        )
    return f'<div class="kpis">{"".join(tiles)}</div>'


def _figure(line: str, base_dir: Path, doc_dir: str) -> str:
    alt, src = _IMAGE.match(line).groups()  # type: ignore[union-attr]
    uri = _data_uri((base_dir / src).resolve())
    return (
        f'<figure><img src="{uri}" alt="{escape(alt)}">'
        f"<figcaption>{inline(alt, doc_dir)}</figcaption></figure>"
    )


def _callout(lines: list[str], base_dir: Path, doc_dir: str) -> str:
    kind = ""
    if lines and (match := _ALERT.match(lines[0].strip())):
        kind = f' class="{match.group(1).lower()}"'
        lines = lines[1:]
    inner, _ = _blocks(lines, base_dir, doc_dir)
    return f"<blockquote{kind}>{''.join(inner)}</blockquote>"


def _blocks(lines: list[str], base_dir: Path, doc_dir: str) -> tuple[list[str], str]:
    """Blocos HTML das linhas dadas e o texto do primeiro título de nível 1 (se houver)."""
    out: list[str] = []
    title = ""
    kpis = keep = False
    i = 0
    while i < len(lines):
        line = lines[i]
        if line.strip() == "<!-- kpis -->":
            kpis = True
            i += 1
        elif line.strip() == "<!-- keep -->":
            keep = True
            i += 1
        elif line.startswith("```"):
            block = []
            i += 1
            while i < len(lines) and not lines[i].startswith("```"):
                block.append(lines[i])
                i += 1
            out.append(f"<pre><code>{escape(chr(10).join(block), quote=False)}</code></pre>")
            i += 1
        elif re.match(r"^#{1,3} ", line):
            level = len(line) - len(line.lstrip("#"))
            text = line[level + 1 :].strip()
            if level == 1 and not title:
                title = text
            out.append(f"<h{level}>{inline(text, doc_dir)}</h{level}>")
            i += 1
        elif (
            line.startswith("|")
            and i + 1 < len(lines)
            and re.match(r"^\|[\s:|-]+\|$", lines[i + 1])
        ):
            block = []
            while i < len(lines) and lines[i].startswith("|"):
                block.append(lines[i])
                i += 1
            out.append(_kpis(block, doc_dir) if kpis else _table(block, doc_dir, keep))
            kpis = keep = False
        elif _IMAGE.match(line.strip()):
            figures = []
            while i < len(lines) and _IMAGE.match(lines[i].strip()):
                figures.append(_figure(lines[i].strip(), base_dir, doc_dir))
                i += 1
            row = figures[0] if len(figures) == 1 else f'<div class="figs">{"".join(figures)}</div>'
            out.append(row)
        elif line.startswith(">"):
            block = []
            while i < len(lines) and lines[i].startswith(">"):
                block.append(lines[i][1:].removeprefix(" "))
                i += 1
            out.append(_callout(block, base_dir, doc_dir))
        elif re.match(r"^(- |\d+\. )", line):
            ordered = bool(re.match(r"^\d+\. ", line))
            items: list[str] = []
            while i < len(lines) and re.match(r"^(- |\d+\. |  +\S)", lines[i]):
                if re.match(r"^(- |\d+\. )", lines[i]):
                    items.append(re.sub(r"^(- |\d+\. )", "", lines[i]))
                else:
                    items[-1] += " " + lines[i].strip()
                i += 1
            tag = "ol" if ordered else "ul"
            out.append(
                f"<{tag}>" + "".join(f"<li>{inline(x, doc_dir)}</li>" for x in items) + f"</{tag}>"
            )
        elif not line.strip():
            i += 1
        else:
            block = []
            while (
                i < len(lines)
                and lines[i].strip()
                and not re.match(r"^(#|\||>|```|- |\d+\. |!\[)", lines[i])
            ):
                block.append(lines[i].strip())
                i += 1
            if not block:  # linha que parece início de bloco mas não foi reconhecida
                block = [lines[i].strip()]
                i += 1
            after_title = bool(out) and out[-1].startswith("<h1")
            tag = '<p class="meta">' if after_title else "<p>"
            out.append(f"{tag}{inline(' '.join(block), doc_dir)}</p>")
    return out, title


def render(markdown: str, base_dir: Path, doc_dir: str = "docs") -> str:
    """Converte o Markdown em um documento HTML completo e autônomo."""
    blocks, title = _blocks(markdown.splitlines(), base_dir, doc_dir)
    body = "\n".join(blocks)
    return (
        '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">'
        f"<title>{escape(title or 'Documento')}</title><style>{CSS}</style></head>"
        f"<body>\n{body}\n</body></html>\n"
    )
