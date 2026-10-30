"""Conversor mínimo de Markdown para HTML imprimível (só biblioteca padrão).

Cobre o subconjunto usado nos documentos do projeto: títulos, parágrafos, listas, tabelas,
blocos de código, citações, imagens (embutidas em base64, para o HTML ficar autônomo),
negrito, itálico, código em linha e links. Links relativos viram links absolutos do GitHub.
A impressão em PDF fica a cargo do navegador (`scripts/gerar-pdf.sh`).
"""

import base64
import posixpath
import re
from html import escape
from pathlib import Path

REPO_URL = "https://github.com/vhjordao/handson_plantaoseg/blob/main/"

CSS = """
@page { size: A4; margin: 14mm 14mm 15mm 14mm; }
* { box-sizing: border-box; }
body { font-family: "Segoe UI", system-ui, Arial, sans-serif; font-size: 10.4pt; line-height: 1.42;
  color: #0b0b0b; margin: 0; }
h1 { font-size: 18pt; margin: 0 0 2pt; line-height: 1.15; }
h2 { font-size: 12.5pt; margin: 11pt 0 3pt; padding-bottom: 2pt; border-bottom: 1.5px solid #2a78d6;
  break-after: avoid; }
h3 { font-size: 10.5pt; margin: 8pt 0 2pt; break-after: avoid; }
p { margin: 3pt 0; }
ul, ol { margin: 3pt 0 3pt 15pt; padding: 0; }
li { margin: 1pt 0; }
table { width: 100%; border-collapse: collapse; margin: 5pt 0; font-size: 9pt;
  line-height: 1.3; }
th { background: #e1e0d9; text-align: left; padding: 2.5pt 4pt; }
td { padding: 2.5pt 4pt; border-bottom: 1px solid #e1e0d9; vertical-align: top; }
tr { break-inside: avoid; }
code { font-family: Consolas, "Cascadia Mono", monospace; font-size: 8.3pt; background: #f1f0ec;
  padding: 0 2px; border-radius: 2px; }
pre { background: #f6f5f1; border: 1px solid #e1e0d9; padding: 5pt; margin: 4pt 0; font-size: 7.6pt;
  line-height: 1.25; white-space: pre-wrap; break-inside: avoid; }
pre code { background: none; padding: 0; font-size: inherit; }
blockquote { margin: 4pt 0; padding: 2pt 8pt; border-left: 3px solid #eb6834; background: #faf6f2;
  color: #3a3935; }
blockquote p { margin: 1pt 0; }
figure { margin: 4pt 0; text-align: center; break-inside: avoid; }
figure img { max-width: 100%; max-height: 62mm; }
figcaption { font-size: 8pt; color: #52514e; }
a { color: #1c5cab; text-decoration: none; }
.meta { color: #52514e; font-size: 9pt; margin-bottom: 4pt; }
"""

_SCHEME = re.compile(r"^(https?:|mailto:|#)")


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


def _table(lines: list[str], doc_dir: str) -> str:
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
    return f"<table><thead><tr>{head}</tr></thead><tbody>{body}</tbody></table>"


def render(markdown: str, base_dir: Path, doc_dir: str = "docs") -> str:
    """Converte o Markdown em um documento HTML completo e autônomo."""
    lines = markdown.splitlines()
    out: list[str] = []
    title = "Documento"
    i = 0
    while i < len(lines):
        line = lines[i]
        if line.startswith("```"):
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
            if level == 1 and title == "Documento":
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
            out.append(_table(block, doc_dir))
        elif re.match(r"^!\[.*\]\(.+\)$", line.strip()):
            alt, src = re.match(r"^!\[(.*)\]\((.+)\)$", line.strip()).groups()  # type: ignore[union-attr]
            uri = _data_uri((base_dir / src).resolve())
            caption = inline(alt, doc_dir)
            out.append(
                f'<figure><img src="{uri}" alt="{escape(alt)}">'
                f"<figcaption>{caption}</figcaption></figure>"
            )
            i += 1
        elif line.startswith(">"):
            block = []
            while i < len(lines) and lines[i].startswith(">"):
                block.append(lines[i][1:].strip())
                i += 1
            out.append(f"<blockquote><p>{inline(' '.join(block), doc_dir)}</p></blockquote>")
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
            out.append(f"<p>{inline(' '.join(block), doc_dir)}</p>")
    body = "\n".join(out)
    return (
        '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">'
        f"<title>{escape(title)}</title><style>{CSS}</style></head><body>\n{body}\n</body></html>\n"
    )
