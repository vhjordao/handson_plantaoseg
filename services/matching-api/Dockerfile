# Imagem da API de matching. É construída no servidor, com a versão fixada no Compose (infra/README.md).
FROM python:3.12.14-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /srv/matching-api

COPY requirements-api.txt .
RUN pip install -r requirements-api.txt

COPY app/ app/

USER 10001:10001

# Um processo só: as travas por vaga de app/api/service.py valem dentro dele, e há só 1 vCPU.
CMD ["uvicorn", "--factory", "app.api.main:create_app_from_env", "--host", "0.0.0.0", "--port", "8000", "--workers", "1", "--no-access-log", "--no-server-header"]
