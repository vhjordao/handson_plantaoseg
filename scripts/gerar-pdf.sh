#!/bin/sh
# Gera o PDF do documento da Etapa 2 a partir do HTML imprimível, com o navegador em modo headless.
# Uso: sh scripts/gerar-pdf.sh [entrada.html] [saida.pdf]
# Pré-requisito: Microsoft Edge ou Google Chrome instalado. Conta as páginas com pdftotext, se houver.

ENTRADA="${1:-docs/entrega-2/Entrega2-PlantaoSeguro.html}"
SAIDA="${2:-docs/entrega-2/Entrega2-PlantaoSeguro.pdf}"

NAVEGADOR=""
for candidato in \
  "/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" \
  "/c/Program Files/Microsoft/Edge/Application/msedge.exe" \
  "/c/Program Files/Google/Chrome/Application/chrome.exe" \
  "/usr/bin/google-chrome" "/usr/bin/chromium" "/usr/bin/chromium-browser"; do
  if [ -x "$candidato" ]; then NAVEGADOR="$candidato"; break; fi
done
if [ -z "$NAVEGADOR" ]; then
  echo "ERRO: instale o Microsoft Edge ou o Google Chrome para gerar o PDF." >&2
  exit 1
fi

# No Windows (Git Bash) o navegador precisa de caminhos no formato C:/...
if command -v pwd >/dev/null 2>&1 && pwd -W >/dev/null 2>&1; then
  RAIZ="$(pwd -W)"
else
  RAIZ="$(pwd)"
fi
mkdir -p "$(dirname "$SAIDA")"
"$NAVEGADOR" --headless=new --disable-gpu --no-pdf-header-footer \
  --print-to-pdf="$RAIZ/$SAIDA" "file:///$RAIZ/$ENTRADA" >/dev/null 2>&1

if [ ! -s "$SAIDA" ]; then
  echo "ERRO: o PDF não foi gerado." >&2
  exit 1
fi
if command -v pdftotext >/dev/null 2>&1; then
  PAGINAS=$(pdftotext "$SAIDA" - 2>/dev/null | tr -cd '\f' | wc -c | tr -d ' ')
  echo "PDF gerado: $SAIDA ($PAGINAS páginas)"
else
  echo "PDF gerado: $SAIDA"
fi
