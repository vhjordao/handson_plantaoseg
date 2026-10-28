# Plano da Etapa 2: prova de conceito

- **Status:** proposta de 28/10/2026, **aguardando aprovação do Victor** (nenhum item abaixo é executado antes do "ok" do portão correspondente).
- **Prazo:** entrega em **sábado, 31/10/2026**. Hoje é quarta (28/10): restam 3 dias de trabalho.
- **O que o professor cobra** (slides de 27/10 e feedback): 4 entregáveis, **Dados, Análise, Solução de IA e PoC**, mais Cybersecurity em seção curta, em documento de **5 a 8 páginas**, amarrado ao problema e com **justificativa de cada escolha** ([rastreabilidade](rastreabilidade-professor.md)).

## 1. Escopo (ADR 0002)

| Camada | Itens | Regra |
| --- | --- | --- |
| **Núcleo** (medido e documentado a fundo) | Extração da vaga, filtro de elegibilidade e jornada, ranking (baseline e modelo), explicação com fallback | Nunca é cortado |
| **Apoio mínimo** | Aprovação humana, `audit_log`, tela do médico, oferta em cascata no n8n | Entra depois do núcleo |
| **Evolução futura** | Check-in e pagamento, contestação completa, telão, Telegram, previsão, equidade, kit da Comissão de IA | Só descrita no documento |

Segmento: UPA e pronto-socorro, plantão noturno de 12 h e fim de semana, clínica médica e pediatria (ADR 0001).

**Ordem de corte se o prazo apertar** (de baixo para cima): telão e Telegram, contestação, check-in e pagamento, cascata (fica só a oferta simples), tela do médico. Segurança, regras inegociáveis e o núcleo não entram no corte.

## 2. O que será entregue, mapeado ao que o professor pede

| Exigência | Artefato | Frente |
| --- | --- | --- |
| **Dados** (origem, dicionário, volume, variáveis, qualidade, tratamento) | `data/synthetic/` com gerador reprodutível, dicionário de dados e relatório de qualidade | F2 |
| **Análise** (estatísticas, visualizações, correlações, padrões, análise textual) | `docs/analise/` com figuras geradas por script: distribuições, aceite por distância e turno, concentração de ofertas, análise das vagas em texto livre | F2 |
| **Solução de IA** (entrada, processamento de IA, saída, usuário) | Seção do `docs/03` + fichas de F3 e F4; baseline contra modelo; explicação e guardrails | F3, F4 |
| **PoC** (API, interface, fluxo automatizado, sistema de recomendação) | `services/matching-api`, `apps/web`, fluxo do n8n, demo de ponta a ponta | F3 a F6 |
| **Cybersecurity** (dados, pessoais, onde ficam, quem acessa, ameaças, proteções) | `docs/seguranca-ameacas.md` (STRIDE leve), testes de RLS e de injeção de prompt | F1, F4, F6 |
| **Metas com linha de base** (FB-3) | Seção "Metas e linha de base" (proposta na seção 6 deste plano) | Victor |
| **Normas conferidas** (FB-4) | `docs/conformidade/` com os textos oficiais lidos e o que depende de jurídico | Victor, F6 |
| **Justificar escolhas e amarrar ao problema** | Tabela "por que esta e não outra" em cada ficha do componente e no `docs/03` | Todas |

## 3. Frentes de trabalho

Donos sugeridos a definir pelo Victor (uma pessoa por frente; o Victor coordena, integra e escreve o `docs/03` a partir das fichas). Cada frente entrega a **ficha do componente** ([modelo](templates/ficha-componente.md)).

| Frente | O que entrega | Pastas | Pronto quando | Depende de |
| --- | --- | --- | --- | --- |
| **F1 Banco e RLS** | Migrações das tabelas de `docs/02`; RLS por organização e papel; função SQL de jornada (24 h contínuas, 11 h de descanso, em `policy_config`); `audit_log` só de inserção; testes SQL e job de CI com Postgres | `supabase/` | Migrações aplicam do zero; teste "hospital A não lê hospital B" passa; UPDATE e DELETE no `audit_log` são rejeitados | Contratos (G1) |
| **F2 Dados sintéticos e análise** | Gerador com semente (3 unidades, cerca de 300 médicos, histórico de ofertas com aceite e comparecimento); dicionário; qualidade; análise exploratória com figuras | `data/synthetic/`, `docs/analise/` | `make seed` carrega; mesma semente gera os mesmos dados; relatório com pelo menos 6 figuras e as limitações | Contratos (G1) |
| **F3 Núcleo de matching** | Filtro de elegibilidade e jornada em Python; ranking baseline e regressão logística; validação temporal; precision@5 e recall@5 contra o baseline; fatores por candidato | `services/matching-api/app/rules`, `.../ranking` | Testes de jornada e elegibilidade; métricas reproduzíveis; teste de neutralidade passa | Contratos (G1), dados de F2 |
| **F4 LLM** | Extração (Haiku 5.5, Sonnet 5.5 nos ambíguos) com Pydantic; explicação a partir dos fatores; fallback em template; pelo menos 10 testes de injeção de prompt; conjunto de avaliação; custo e latência | `services/matching-api/app/llm` | Sem chave ou com falha, cai no template; testes passam; avaliação reportada | Contratos (G1) |
| **F5 Interface** | Coordenador: texto livre, conferir campos, top 5 com motivos e alertas, excluídos com a regra, aprovar. Médico: ofertas com o motivo (mínimo) | `apps/web/` | Fluxo do coordenador roda contra a API; estados de erro e carregamento; texto em português; aviso de simulação | Contratos (G1), API de F3 e F4 |
| **F6 Orquestração e segurança** | Aprovação grava no `audit_log`; cascata no n8n (próximo se recusar ou expirar); `seguranca-ameacas.md`; leitura dos textos oficiais das normas | `n8n/`, `infra/`, `docs/` | Cascata roda com tempo curto; ameaças e proteções documentadas; normas marcadas como verificadas ou não | Contratos (G1), F1 |

**Como a equipe anda em paralelo sem esperar:** primeiro fechamos os **contratos** (G1). Depois cada frente trabalha contra fixtures e mocks do contrato, e a integração acontece na quinta à noite.

## 4. Cronograma e portões de aprovação

Em cada portão eu explico o que foi feito e o que vem, e só sigo com o "ok" do Victor.

| Quando | O que acontece | Portão |
| --- | --- | --- |
| **Qua 28/10 (hoje)** | Victor aprova este plano e os ADRs 0001 e 0002; merge do PR #1; convites aos colegas e proteção da `main`; colegas instalam as ferramentas (`make doctor`). Eu preparo o PR de **contratos** (esquema SQL do núcleo, modelos Pydantic, exemplos JSON, rotas da API) | **G0**: plano, ADRs e PR #1 aprovados |
| **Qui 29/10, manhã** | Victor revisa e aprova os contratos; as frentes F1 a F6 começam em paralelo | **G1**: contratos aprovados |
| **Qui 29/10, noite** | Núcleo funcionando: a API devolve o top 5 com explicação para uma vaga sintética (UI e n8n ainda podem estar em mock) | **G2**: núcleo roda de ponta a ponta |
| **Sex 30/10** | Integração UI, API e banco; cascata; análise e métricas finais; rascunho completo do `docs/03`; revisão do `revisor-professor` e correções | **G3**: demo de ponta a ponta ensaiada e rascunho do documento |
| **Sáb 31/10, manhã** | Congelar o código ao meio-dia; `docs/03` final; tag `etapa-2`; envio no Moodle pelo Victor | **G4**: entrega |

## 5. Contratos propostos (o que o PR de G1 vai conter)

Proposta; o Victor aprova ou ajusta antes de qualquer frente começar.

- **SQL (migração 0001, só estrutura):** `organizations`, `units`, `profiles`, `doctors`, `doctor_availability`, `shifts`, `policy_config`, `recommendations`, `explanations`, `offers`, `audit_log`, `model_registry`, conforme `docs/02`. Pagamento fica em tabela separada, fora de qualquer visão usada pelo ranking.
- **Pydantic (`services/matching-api/app/schemas.py`):** `ShiftExtraction` (campos extraídos da vaga), `Candidate` (ID pseudônimo e atributos permitidos, alinhados a `RANKING_FEATURES`), `Recommendation` (posição, pontuação, fatores, alertas, versão do modelo), `Explanation` (texto, fatores citados, origem: LLM ou template), `Exclusion` (candidato e regra que barrou).
- **Rotas da API:** `POST /shifts/extract` (texto livre para campos), `POST /shifts/{id}/recommend` (top 5 e excluídos), `POST /shifts/{id}/approve` (decisão humana, grava `audit_log`), `GET /health`.
- **Exemplos em JSON** de cada objeto, usados como fixtures por todas as frentes.

## 6. Metas com linha de base (resposta ao FB-3, para aprovar)

Nenhum número abaixo é resultado: são o jeito de medir. Com dados sintéticos, o modelo reaprende o simulador; por isso a comparação é sempre com o baseline e o rótulo é **simulação**.

| Indicador | Como medimos na PoC | Linha de base | Meta |
| --- | --- | --- | --- |
| Qualidade do ranking | precision@5 e recall@5 em hold-out **temporal** sintético | Ranking heurístico (distância e disponibilidade) | Modelo >= baseline; o ganho exigido só é fixado **depois** de medir o baseline |
| Violações de jornada nas recomendações | Testes do filtro e da função SQL | n/d | 0, por construção e por teste |
| Ranking influenciado por pagamento | Teste de neutralidade na CI | n/d | 0 |
| Explicações válidas | Esquema validado e só fatores recebidos; falhas simuladas do LLM caem no template | n/d | 100% das explicações válidas; 100% das falhas cobertas pelo fallback |
| Injeção de prompt | Pelo menos 10 casos | n/d | 0 vazamentos, 0 mudança de regra |
| Latência por recomendação | Medida no ensaio | A medir | Sem meta antes de medir |
| Tempo de preenchimento (meta de -50%) | **Não mensurável** com dados sintéticos | Entrevistas (Etapa 3) | Mantida como hipótese a validar com coordenadores reais |
| Recall >= 0,7 | Pertence à **previsão de vagas descobertas** (Etapa 3), não ao ranking | n/d | Reformulada na Etapa 3 |

## 7. Estrutura do `docs/03` (8 páginas)

| Seção | Páginas | Alimentada por |
| --- | --- | --- |
| Recap do problema e do segmento | 0,5 | Entrega 1, ADR 0001 |
| Dados | 1,25 | F2 |
| Análise | 1,0 | F2 |
| Solução de IA (entrada, processamento, saída, usuário; por que IA e onde não; baseline) | 1,75 | F3, F4 |
| PoC e demonstração | 1,25 | F5, F6 |
| Segurança, ética e conformidade | 1,0 | F1, F4, F6 |
| Metas, resultados preliminares (rotulados) e limites | 0,75 | Seção 6 |
| Próximos passos e uso de IA no desenvolvimento | 0,5 | Diário de bordo |
| **Total** | **8,0** | |

## 8. Riscos e respostas

| Risco | Resposta |
| --- | --- |
| Ambiente dos colegas não instala a tempo | A CI do GitHub roda testes e lint; trabalho em dupla até instalar |
| Integração tardia | Contratos primeiro (G1), fixtures e G2 na quinta à noite |
| LLM indisponível ou lento na demo | Fallback em template e respostas pré-carregadas |
| Escopo crescer | ADR 0002 e a ordem de corte da seção 1 |
| Documento estourar 8 páginas | Orçamento por seção (seção 7) e fichas curtas |
| Conflitos de merge | Uma frente por pessoa, pastas separadas, revisão cruzada |
| Números sintéticos serem lidos como evidência | Rótulo "simulação", baseline e seção de limites |
| Chave da Anthropic sem limite de gasto | Usar conta com limite de gasto definido e uma chave por pessoa (conferir no console) |

## 9. O que depende do Victor

1. Aprovar este plano, os ADRs 0001 e 0002 e fazer o merge do PR #1.
2. Passar os usuários do GitHub dos colegas e escolher o dono de cada frente.
3. Convidar os colegas e proteger a `main` (passo a passo na resposta da sessão).
4. Providenciar a chave da Anthropic (com limite de gasto) e distribuir por canal privado.
5. Instalar as ferramentas do `make doctor` e, se quiser o vídeo da aula usado, colar as anotações.
6. Enviar a entrega no Moodle em 31/10.
