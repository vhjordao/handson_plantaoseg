# ADR 0014: Estrutura da plataforma web, sessão por persona e camada de dados com dois modos

- **Status:** proposta em 03/11/2026, para o ok do Victor no PR `f3/web-plataforma`. Detalhe do desenho em [`docs/design/prompt-frontend.md`](../design/prompt-frontend.md) (seções 7 e 12).
- **Numeração:** saiu como 0011 em 03/11, passou a 0012 em 04/11 (a API de matching tomou o 0010) e a 0014 no mesmo dia, porque o n8n tomou o 0012 e o 0013 ([ADR 0012](0012-editor-do-n8n-na-web.md) e [ADR 0013](0013-aviso-da-api-inicia-a-cascata.md)). Ver também o [ADR 0011](0011-web-responsiva-sem-pwa.md).
- **Atualização de 04/11/2026:** a API de matching ([ADR 0010](0010-api-de-matching.md)) e o banco ([ADR 0008](0008-banco-no-supabase.md)) entraram na `main` depois do texto de 03/11. A seção de divergências foi reconferida contra a API (rotas e `schemas.py`), as migrações e a RLS de `supabase/`, e as frases de contexto e de consequências foram ajustadas. A decisão em si não mudou.
- **Origem:** o Victor pediu uma página inicial que apresente o produto, uma área de login e uma **plataforma funcional**, aberta no computador e no celular. O [ADR 0007](0007-web-sai-do-adiamento.md) tinha liberado só uma página provisória.

## Contexto

A web precisa servir quatro públicos com trabalhos diferentes (coordenador, médico, plateia, telão) e **funcionar ao vivo** mesmo que a API, o banco ou a rede falhem. Em 03/11 o backend em Python ainda não tinha API HTTP (ADR 0004) e o banco estava sendo desenhado em outra sessão; os dois entraram na `main` em 04/11 (ADR 0010 e ADR 0008). A interface não podia esperar por eles e, mesmo agora, precisa funcionar sem eles na apresentação.

## Decisão

1. **Rotas e cascas por papel.** Site público (`/`, `/entrar`, `/ajuda`), `/coordenador/*`, `/medico/*` e `/telao`, cada um com a sua casca (barra lateral, barra inferior, tela cheia). Mapa completo no prompt, seção 7.1.
2. **Sessão sem senha.** `/entrar` oferece três portas. A sessão é um cookie `{papel, personaId}` com uma persona **fictícia**; o `proxy.ts` (Next.js 16) leva quem não tem sessão a `/entrar`. No modo `live`, a persona passa a ser um login do Supabase com perfil (a divergência sobre a sessão, abaixo, diz o que falta para isso). Isso atende o WCAG 3.3.8 (sem quebra-cabeça) e o plano de "login anônimo da plateia" do plano da Etapa 3.
3. **Uma interface `PlantaoApi`, dois adaptadores.** `demo` (padrão): roda **no navegador**, com fixtures geradas do **pipeline real** (`scripts/exportar_fixtures_web.py`, semente fixa) e relógio simulado; `live`: chama a `matching-api` e o Supabase por rotas e ações de servidor, **sem** chave de serviço no navegador. Escolha por `NEXT_PUBLIC_DATA_MODE=demo|live`; se a API cair, a interface oferece trocar para `demo`.
4. **Contratos em Zod** (`lib/api/types.ts`), espelhando `models.py`, `pipeline.py`, `rules.py`, `explain.py` e `audit.py`. Onde o backend ainda não entrega algo que a tela quer (o trecho do texto que originou cada campo), o campo é **opcional** e vira divergência a combinar com o backend. **Não** se inventa percentual de confiança por campo.
5. **Estados da vaga** na interface: rascunho, aguardando decisão, oferta em andamento, preenchida e sem cobertura, mais o alerta derivado **em risco**. São estados de tela; a tabela `shifts` tem outros (`open`, `offered`, `filled`, `uncovered` e `cancelled`), e o mapa entre eles está nas divergências.
6. **Componentes** no estilo do shadcn/ui, escritos no repositório sobre o pacote unificado `radix-ui` e com os tokens do projeto (sem sombra, raios por hierarquia). Estado assíncrono com TanStack Query; validação com Zod.
7. **Fontes:** a Atkinson Hyperlegible Next continua na interface (ficha do PR #11), e a Source Serif 4 entra nos títulos e nos números de destaque, ambas pela `next/font` (o build baixa; o navegador não chama o Google).
8. **Qualidade na CI:** lint, tipos, build, testes de componente (Vitest), checagem de contraste dos tokens e, em um job à parte, a jornada e o `axe` do Playwright sobre o build de produção.
9. **Idioma do código:** domínio e tokens em português (o glossário fixo do produto), nomes técnicos genéricos em inglês (os mesmos do shadcn/ui, para `shadcn add` e a documentação continuarem valendo) e códigos do backend como estão. Exceção consciente à linha "identificadores em inglês" do prompt v1, que ele próprio contrariava; a língua única do domínio evita traduzir "vaga", "oferta" e "contestação" de um lado para o outro.
10. **A voz segue a origem real.** A leitura da vaga nesta demonstração é feita por regras (o Gemini não foi testado), então aparece como regra do sistema (cinza), e só a ordem sugerida e os motivos do modelo aparecem como sugestão da IA (tracejado).

## Consequências

- A demonstração roda **sem API e sem banco**, e o mesmo código passa ao `live` agora que a API existe, depois de combinadas as divergências abaixo.
- As fixtures vêm do pipeline real, então motivos, alertas e regras que a tela mostra são os que o backend produz.
- Um `docs/02` mais enxuto: a linha da interface passa a "web responsiva, sem PWA" ([ADR 0011](0011-web-responsiva-sem-pwa.md)).
- O que o backend ainda não tem (contestação, a justificativa da exceção, "pular" um sugerido, política e ficha do modelo para o coordenador) fica atrás de `PlantaoApi`; o adaptador `live` é escrito na UI-2.

## Divergências conhecidas com o backend

Onde o contrato da interface (`lib/api/types.ts`) e o backend não coincidem. **Reconferidas em 04/11/2026** contra a API do PR #16 (`services/matching-api/app/api/`, [ADR 0010](0010-api-de-matching.md)), as migrações de `supabase/` e a RLS. A API fala em inglês e em `snake_case` e devolve só IDs pseudônimos; o adaptador `live` traduz os nomes e junta o cadastro (nome e CRM) lido do Supabase sob RLS. Nada aqui muda o backend sem o ok do Victor, e tudo fica para combinar antes do adaptador `live` (UI-2).

**Já coincidem** (eram divergências em 03/11)

1. **Variáveis do candidato.** `ranking_features()` devolve em `features` só as sete variáveis do ranking; as duas de contexto (`shifts_last_30d` e `offers_received_30d`) ficam dentro da API.
2. **Id da vaga e rascunho.** A API identifica a vaga pelo UUID que `POST /shifts` devolve e o passa como `key` a `pipeline.recommend`, então o `entity_id` da trilha é o id da vaga, como no `demo`. A leitura (`POST /shifts/extract`) não grava nada, então "rascunho" segue sendo só um estado da tela, e `Recomendacao.chave` passa a ser igual a `vagaId`.

**Pedem decisão do Victor** (mudar a API ou o banco, ou a tela abrir mão de algo)

3. **Aprovação com exceção.** `POST /shifts/{id}/approve` recebe só `doctor_ids` (de 1 a 20, em ordem, sem repetir) e recusa campo a mais (`extra="forbid"`): enviar `justificativa` dá 422. A resposta é o passo da cascata (a primeira oferta), não uma `Decisao`, e a trilha (`recommendation_approved`) guarda só quem foi aprovado. Ou a API ganha uma justificativa opcional, gravada em `details`, ou a regra "sem justificativa, sem exceção" fica só na tela, sem registro. A `Decisao` (quem decidiu e quando), o adaptador monta a partir da trilha.
4. **"Pular" e feedback da explicação.** `POST /shifts/{id}/reject` recusa a lista inteira e **cancela a vaga** (`recommendation_rejected`, status `cancelled`); o `pular` do `demo` registra a mesma ação por candidato e não cancela nada. O "Esta explicação ajudou?" (`enviarFeedbackExplicacao`) não tem rota nem tabela. Cada um precisa de rota própria ou fica só na tela.
5. **Recusa de oferta.** `POST /offers/{id}/respond` aceita quatro motivos (`distance`, `fatigue`, `schedule` e `other`) e nenhum texto livre; o `motivo` de até 1.000 caracteres da interface não tem onde ficar. A tela oferece os quatro motivos, ou a API ganha um texto opcional.
6. **Contribuições, hora e fallback.** A recomendação traz `features` e `score`, mas não a contribuição de cada variável em relação à média dos elegíveis (`contribuicoes`, que "Ver motivos" usa), nem `geradaEm` (existe em `recommendations.created_at`, legível sob RLS), nem `motivoFallback` (a explicação só diz se veio de `template` ou `llm`). Campos novos na API, ou as contribuições calculadas com os pesos de `modelo_ativo.json`, que a interface hoje só tem nas fixtures.
7. **O que a leitura da vaga não devolve.** `POST /shifts/extract` devolve valores, `missing_required`, `source`, `flags` e `llm_error`, mas nem a posição no texto (`trecho`) nem se cada campo está escrito ou foi deduzido (`origem`). Sem a `origem`, a tela não distingue "Está no texto" de "Calculado do texto". Pedir `origin` e `span` por campo.
8. **`evidencia` da exclusão.** `exclusions` traz `rule_code` e `rule_text` (o texto genérico de `RULE_TEXTS`); a evidência numérica ("Mora a 18,2 km; o raio declarado é 15 km.") só existe no exportador. A lista vem inteira, e o `exemplosExcluidos` da interface é uma amostra, que o adaptador corta.
9. **Política e ficha do modelo.** Nenhuma tem rota na API, e a RLS só deixa o `admin` ler `policy_config` e `model_registry`: o coordenador não lê nenhuma das duas. `policy_config` tem nove colunas e `Politica` leva seis (ficam de fora `organization_id`, `min_overlap_ratio` e `effective_from`). Pede uma política de leitura para o coordenador da própria organização (migração) ou rotas só de leitura.

**O adaptador `live` resolve sozinho**

10. **Estados.** `shifts.status` tem `open`, `offered`, `filled`, `uncovered` e `cancelled`. `open` vale para "publicada" e para "recomendada, esperando decisão" (a recomendação e a aprovação na trilha diferenciam), e `cancelled` (lista recusada) não existe na interface, que precisa ganhar o estado "cancelada". Nas ofertas, `pending`, `accepted`, `declined` e `expired` viram aberta, aceita, recusada e expirada; `na_fila` e `cancelada` não têm linha no banco (só a oferta da vez existe), e a fila vem da aprovação gravada na trilha.
11. **Cadastro do médico.** A RLS libera de `doctors` só `id`, `name_sim`, `crm_sim`, `crm_status`, `specialty`, `secondary_specialty`, `max_radius_km` e `preferred_period`; `home_zone`, telefone, coordenadas, `gender` e `age_band` não chegam ao navegador. No `demo` também não: `Medico.zona` saiu do contrato e das fixtures na revisão final do PR, e um teste barra a volta dele. Quais médicos cada papel enxerga também vem da RLS (`doctors_select_self_or_candidate`).
12. **Urgência.** É opcional na interface (`urgencia` nula) e obrigatória na API (`PublishIn.urgency`) e no banco (`shifts.urgency` não nula): o `live` usa um padrão (`medium`) ou a tela passa a exigi-la.
13. **Datas e limites.** A API trabalha em hora local de São Paulo, sem fuso (`local_from_db`), e o Postgres devolve com fuso e, às vezes, com fração de segundo: o `live` normaliza com `normalizarDataHora` (hoje em `demo/datas.ts`). A API recusa data fora da janela (de ontem a 60 dias, `data_fora_da_janela`), vaga de mais de 24 h e texto de mais de 5.000 caracteres; a interface limita o pedido a 2.000, que é mais estrito e fica.
14. **Erros e ritmo.** Os erros chegam como `{"erro": "codigo", "mensagem": "..."}` (por exemplo `ja_aprovada`, `vaga_nao_aberta`, `fora_da_recomendacao`, `oferta_expirada` e `conflito_de_agenda`) e viram as classes de `lib/api/erros.ts`. O limite é de 30 chamadas por segundo por IP, dividido pela plateia no mesmo Wi-Fi, e a tela tenta de novo depois de um 429.
15. **Ações da trilha.** `audit.py::ACTIONS` ganhou `offer_sent`, `offer_accepted`, `offer_declined`, `offer_expired` e `shift_uncovered`. O enum da interface não tinha `shift_uncovered`, o que faria a leitura da trilha falhar no `live`; está corrigido neste PR, com um teste (`contrato-backend.test.ts`) que compara as ações, as variáveis do ranking e os códigos de exclusão da interface com o código Python. Só `contestation_*` segue sem backend.

**Decisão de segurança do Victor**

16. **Sessão.** A API só atende quem tem perfil (`/me` dá 403 `sem_perfil`; o papel vem de `profiles`, que o navegador não altera). O login anônimo previsto na decisão 2 não tem perfil, e o login anônimo estava desligado no projeto em 03/11. Os logins de teste (`scripts/usuarios-de-teste.py`) pertencem a uma organização de teste, separada da rede simulada que a demonstração mostra. Como a persona entra no `live` mexe na segurança do projeto e é decisão dele.

## Alternativas descartadas

- **SPA em Vite só para a demonstração:** mais rápida de montar, mas descarta o servidor, o `proxy` e a estrutura que o `live` vai exigir.
- **Página única de demonstração, sem rotas por papel:** não mostra a plataforma que o professor vai avaliar (experiência, jornada e interface, A4-4).
- **Base UI no lugar do Radix:** o shadcn/ui aceita os dois; o Radix tem a acessibilidade mais testada no ecossistema e é o que o resto da documentação do projeto assume.
- **Login com e-mail e senha:** não há dado real nem necessidade, e criaria barreira para a plateia (3.3.8).
