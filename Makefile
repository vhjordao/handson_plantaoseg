# PlantãoSeguro: comandos do dia a dia. Rode `make help`.
# No Windows use Git Bash (make e sh). Se o Python for o `py -3.12`: make PYTHON="py -3.12" test

SHELL := /bin/sh
PYTHON ?= python
COMPOSE := docker compose --env-file .env -f infra/docker-compose.yml
API := services/matching-api
CLI := cd $(API) && $(PYTHON) -m app.cli

.PHONY: help doctor env up down logs seed evaluate flow demo walkthrough analyze robustez entrega kit-entrevistas poc test lint

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

flow: ## Fluxo recomendado contra o processo manual: tempo, ofertas e concentração (simulação)
	$(CLI) flow --report-dir ../../docs/resultados

demo: ## Vaga em texto livre -> top 5 -> aprovação -> trilha de auditoria
	$(CLI) demo --yes --fresh

analyze: ## Análise exploratória (figuras e tabelas em docs/analise)
	$(CLI) analyze

walkthrough: ## Exemplo trabalhado (docs/exemplo-trabalhado.md) com as contas à vista
	$(CLI) walkthrough

robustez: ## Teste de premissas e simulação de lançamento (simulação; leva alguns minutos)
	$(CLI) robustness --report-dir ../../docs/resultados

entrega: ## Gera o HTML e o PDF do documento da Etapa 2 (precisa de Edge ou Chrome)
	$(CLI) build-doc
	sh scripts/gerar-pdf.sh

kit-entrevistas: ## Gera os casos da revisão às cegas e os PDFs do kit (precisa de Edge ou Chrome)
	$(CLI) blind-review
	$(CLI) build-doc --source ../../docs/entrevistas/kit-do-entrevistador.md --out ../../docs/entrevistas/Kit-do-entrevistador.html
	$(CLI) build-doc --source ../../docs/entrevistas/revisao-cega-casos.md --out ../../docs/entrevistas/Casos-revisao-cega.html
	sh scripts/gerar-pdf.sh docs/entrevistas/Kit-do-entrevistador.html docs/entrevistas/Kit-do-entrevistador.pdf
	sh scripts/gerar-pdf.sh docs/entrevistas/Casos-revisao-cega.html docs/entrevistas/Casos-revisao-cega.pdf
	rm -f docs/entrevistas/Kit-do-entrevistador.html docs/entrevistas/Casos-revisao-cega.html

poc: seed evaluate flow demo walkthrough analyze ## Roda a PoC mínima inteira, na ordem

test: ## Roda o pytest da matching-api
	cd $(API) && $(PYTHON) -m pytest -q

lint: ## Roda o ruff na matching-api
	cd $(API) && $(PYTHON) -m ruff check .

.PHONY: web-install web web-check

web-install: ## Instala as dependências da interface web (precisa de Node 26)
	npm --prefix apps/web ci

web: ## Sobe a interface web em desenvolvimento (http://localhost:3000)
	npm --prefix apps/web run dev

web-check: ## Confere a interface web: lint, tipos e build
	npm --prefix apps/web run lint
	npm --prefix apps/web run typecheck
	npm --prefix apps/web run build
