#!/usr/bin/env bash
# PlantãoSeguro: publica o workflow da cascata no n8n do servidor (ADR 0013).
# Roda no servidor, a partir de uma cópia desta pasta. O comando está em n8n/README.md.
# Pode repetir: a credencial e o workflow têm ID fixo, e são substituídos.
#
# O segredo sai do .env do servidor e vai direto para dentro do contêiner, pelo stdin. Ele não passa
# pela linha de comando, pelo chat nem pelo Git, e o arquivo temporário sai no fim, mesmo com erro.
set -euo pipefail

PASTA="$(cd "$(dirname "$0")" && pwd)"
COMPOSE_DIR="${COMPOSE_DIR:-/docker/n8n}"
WORKFLOW_ID="cascataOfertas01"
CREDENCIAL_ID="segredoInterno01"
CREDENCIAL_TMP="/tmp/credencial-cascata.json"
WORKFLOW_TMP="/tmp/workflow-cascata.json"

cd "$COMPOSE_DIR"
CONTAINER="$(docker compose ps -q n8n </dev/null)"
if [ -z "$CONTAINER" ]; then
  echo "O n8n não está no ar em $COMPOSE_DIR." >&2
  exit 1
fi

limpar() {
  docker exec "$CONTAINER" rm -f "$CREDENCIAL_TMP" "$WORKFLOW_TMP" </dev/null >/dev/null 2>&1 || true
}
trap limpar EXIT

echo "1/4 Credencial do segredo interno"
CREDENCIAL_ID="$CREDENCIAL_ID" python3 - <<'PY' | docker exec -i "$CONTAINER" sh -c "umask 077; cat > $CREDENCIAL_TMP"
import json
import os
import sys

secret = ""
with open(".env", encoding="utf-8") as env:
    for line in env:
        if line.startswith("N8N_WEBHOOK_SECRET="):
            secret = line.split("=", 1)[1].strip().strip("\"'")
if not secret:
    sys.exit("Falta N8N_WEBHOOK_SECRET no .env do servidor.")
json.dump(
    [
        {
            "id": os.environ["CREDENCIAL_ID"],
            "name": "Segredo interno (API e n8n)",
            "type": "httpHeaderAuth",
            "data": {"name": "X-Internal-Secret", "value": secret},
        }
    ],
    sys.stdout,
)
PY
docker exec "$CONTAINER" n8n import:credentials --input="$CREDENCIAL_TMP" </dev/null

echo "2/4 Workflow"
docker exec -i "$CONTAINER" sh -c "cat > $WORKFLOW_TMP" <"$PASTA/workflows/cascata-de-ofertas.json"
docker exec "$CONTAINER" n8n import:workflow --input="$WORKFLOW_TMP" </dev/null

echo "3/4 Publicação"
docker exec "$CONTAINER" n8n publish:workflow --id="$WORKFLOW_ID" </dev/null
limpar

echo "4/4 Reinício do n8n, que registra o webhook ao subir"
docker compose restart n8n n8n-worker </dev/null
for tentativa in $(seq 1 60); do
  if curl -fs -m 3 -o /dev/null http://127.0.0.1:5678/healthz </dev/null; then
    echo "O n8n voltou (tentativa $tentativa)."
    exit 0
  fi
  sleep 2
done
echo "O n8n não voltou em 2 minutos: veja docker compose logs n8n." >&2
exit 1
