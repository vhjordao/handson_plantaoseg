# PlantãoSeguro: comandos do dia a dia. Rode `make help`.
# No Windows use Git Bash (make e sh). Se o Python for o `py -3.12`: make PYTHON="py -3.12" test

SHELL := /bin/sh
PYTHON ?= python
COMPOSE := docker compose --env-file .env -f infra/docker-compose.yml
API := services/matching-api
CLI := cd $(API) && $(PYTHON) -m app.cli

.PHONY: help doctor env up down logs seed evaluate demo analyze poc test lint

help: ## Lista os comandos
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | sed 's/:.*## /\t/'

doctor: ## Confere Docker, Node, Python, Supabase CLI, make e gh
	@sh scripts/doctor.sh

env: ## Cria o .env a partir do .env.example, se não existir
	@test -f .env || (cp .env.example .env && echo ".env criado a partir do .env.example")

up: env ## (Protótipo adiado, ADR 0004) Sobe o Supabase local e o Compose do n8n
	@if command -v supabase >/dev/null 2>&1; then supabase start; else echo "AVISO: Supabase CLI ausente; pulei o banco local (rode make doctor)."; fi
	$(COMPOSE) up -d

down: ## Derruba o Compose e o Supabase local
	$(COMPOSE) down
	@if command -v supabase >/dev/null 2>&1; then supabase stop; fi

logs: ## Acompanha os logs do Compose
	$(COMPOSE) logs -f --tail=100

seed: ## Gera os dados sintéticos, o relatório de qualidade e a amostra pequena
	$(CLI) seed --report ../../docs/dados/relatorio-de-qualidade.md --sample ../../data/synthetic/sample
	cp data/synthetic/out/dataset_manifest.json docs/dados/manifesto-da-geracao.json

evaluate: ## Treina o modelo e compara com o baseline (simulação)
	$(CLI) evaluate --report-dir ../../docs/resultados

demo: ## Vaga em texto livre -> top 5 -> aprovação -> trilha de auditoria
	$(CLI) demo --yes --fresh

analyze: ## Análise exploratória (figuras e tabelas em docs/analise)
	$(CLI) analyze

poc: seed evaluate demo analyze ## Roda a PoC mínima inteira, na ordem

test: ## Roda o pytest da matching-api
	cd $(API) && $(PYTHON) -m pytest -q

lint: ## Roda o ruff na matching-api
	cd $(API) && $(PYTHON) -m ruff check .
