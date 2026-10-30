# PlantãoSeguro: comandos do dia a dia. Rode `make help`.
# No Windows use Git Bash (make e sh). Se o Python for o `py -3.12`: make PYTHON="py -3.12" test

SHELL := /bin/sh
PYTHON ?= python
COMPOSE := docker compose --env-file .env -f infra/docker-compose.yml
API := services/matching-api

.PHONY: help doctor env up down logs seed test lint

help: ## Lista os comandos
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | sed 's/:.*## /\t/'

doctor: ## Confere Docker, Node, Python, Supabase CLI, make e gh
	@sh scripts/doctor.sh

env: ## Cria o .env a partir do .env.example, se não existir
	@test -f .env || (cp .env.example .env && echo ".env criado a partir do .env.example")

up: env ## Sobe o Supabase local (se houver CLI) e o Compose (n8n, worker, Redis, Postgres do n8n)
	@if command -v supabase >/dev/null 2>&1; then supabase start; else echo "AVISO: Supabase CLI ausente; pulei o banco local (rode make doctor)."; fi
	$(COMPOSE) up -d

down: ## Derruba o Compose e o Supabase local
	$(COMPOSE) down
	@if command -v supabase >/dev/null 2>&1; then supabase stop; fi

logs: ## Acompanha os logs do Compose
	$(COMPOSE) logs -f --tail=100

seed: ## Carrega os dados sintéticos (Fase 1; ainda não implementado)
	@echo "ERRO: make seed ainda não existe. Entra na Fase 1 (data/synthetic)." >&2; exit 1

test: ## Roda o pytest da matching-api
	cd $(API) && $(PYTHON) -m pytest -q

lint: ## Roda o ruff na matching-api
	cd $(API) && $(PYTHON) -m ruff check .
