# ADR 0011: Estrutura da plataforma web, sessão por persona e camada de dados com dois modos

- **Status:** proposta em 03/11/2026, para o ok do Victor no PR `f3/web-plataforma`. Detalhe do desenho em [`docs/design/prompt-frontend.md`](../design/prompt-frontend.md) (seções 7 e 12).
- **Origem:** o Victor pediu uma página inicial que apresente o produto, uma área de login e uma **plataforma funcional**, aberta no computador e no celular. O [ADR 0007](0007-web-sai-do-adiamento.md) tinha liberado só uma página provisória.

## Contexto

A web precisa servir quatro públicos com trabalhos diferentes (coordenador, médico, plateia, telão) e **funcionar ao vivo** mesmo que a API, o banco ou a rede falhem. O backend em Python ainda não tem API HTTP (ADR 0004), e o banco está sendo desenhado em outra sessão. A interface não pode esperar nenhum dos dois.

## Decisão

1. **Rotas e cascas por papel.** Site público (`/`, `/entrar`, `/ajuda`), `/coordenador/*`, `/medico/*` e `/telao`, cada um com a sua casca (barra lateral, barra inferior, tela cheia). Mapa completo no prompt, seção 7.1.
2. **Sessão sem senha.** `/entrar` oferece três portas. A sessão é um cookie `{papel, personaId}` com uma persona **fictícia**; o `proxy.ts` (Next.js 16) leva quem não tem sessão a `/entrar`. No modo `live`, a persona passa a ser um login anônimo do Supabase. Isso atende o WCAG 3.3.8 (sem quebra-cabeça) e o plano de "login anônimo da plateia" do plano da Etapa 3.
3. **Uma interface `PlantaoApi`, dois adaptadores.** `demo` (padrão): roda **no navegador**, com fixtures geradas do **pipeline real** (`scripts/exportar_fixtures_web.py`, semente fixa) e relógio simulado; `live`: chama a `matching-api` e o Supabase por rotas e ações de servidor, **sem** chave de serviço no navegador. Escolha por `NEXT_PUBLIC_DATA_MODE=demo|live`; se a API cair, a interface oferece trocar para `demo`.
4. **Contratos em Zod** (`lib/api/types.ts`), espelhando `models.py`, `pipeline.py`, `rules.py`, `explain.py` e `audit.py`. Onde o backend ainda não entrega algo que a tela quer (o trecho do texto que originou cada campo), o campo é **opcional** e vira divergência a combinar com o backend. **Não** se inventa percentual de confiança por campo.
5. **Estados da vaga** na interface: rascunho, aguardando decisão, oferta em andamento, preenchida e sem cobertura, mais o alerta derivado **em risco**. São estados de tela; a tabela `shifts` do banco pode ter outros.
6. **Componentes** no estilo do shadcn/ui, escritos no repositório sobre o pacote unificado `radix-ui` e com os tokens do projeto (sem sombra, raios por hierarquia). Estado assíncrono com TanStack Query; validação com Zod.
7. **Fontes:** a Atkinson Hyperlegible Next continua na interface (ficha do PR #11), e a Source Serif 4 entra nos títulos e nos números de destaque, ambas pela `next/font` (o build baixa; o navegador não chama o Google).
8. **Qualidade na CI:** lint, tipos, build, testes de componente (Vitest), checagem de contraste dos tokens e, em um job à parte, a jornada e o `axe` do Playwright sobre o build de produção.
9. **Idioma do código:** domínio e tokens em português (o glossário fixo do produto), nomes técnicos genéricos em inglês (os mesmos do shadcn/ui, para `shadcn add` e a documentação continuarem valendo) e códigos do backend como estão. Exceção consciente à linha "identificadores em inglês" do prompt v1, que ele próprio contrariava; a língua única do domínio evita traduzir "vaga", "oferta" e "contestação" de um lado para o outro.
10. **A voz segue a origem real.** A leitura da vaga nesta demonstração é feita por regras (o Gemini não foi testado), então aparece como regra do sistema (cinza), e só a ordem sugerida e os motivos do modelo aparecem como sugestão da IA (tracejado).

## Consequências

- A demonstração roda **sem API e sem banco**, e o mesmo código passa ao `live` quando a API existir.
- As fixtures vêm do pipeline real, então motivos, alertas e regras que a tela mostra são os que o backend produz.
- Um `docs/02` mais enxuto: a linha da interface passa a "web responsiva, sem PWA" ([ADR 0010](0010-web-responsiva-sem-pwa.md)).
- O que o backend ainda não tem (`POST` de vaga, aprovação, contestação) fica atrás de `PlantaoApi`; o adaptador `live` é escrito na UI-2.

## Divergências conhecidas com o backend

Onde o contrato da interface (`lib/api/types.ts`) e o `services/matching-api` não coincidem. Nenhuma muda o backend; todas ficam para combinar antes do adaptador `live` (UI-2), e as que a tela pode dispensar são opcionais no contrato.

1. **Variáveis do candidato.** O backend calcula nove por candidato: as sete de `RANKING_FEATURES` e as duas de `CONTEXT_VARIABLES` (`shifts_last_30d`, `offers_received_30d`), que ficam fora do ranking e servem aos alertas e à análise. O contrato leva só as sete do ranking em `fatores` e `contribuicoes`.
2. **Política.** `Policy` tem nove campos; `Politica` leva seis. Ficam de fora `organization_id`, `min_overlap_ratio` e `effective_from`.
3. **Aprovação com exceção.** `AprovarInput.justificativa` e `Decisao.excecao` (a justificativa escrita para aprovar quem tem alerta de jornada) não existem em `pipeline.approve`, que grava só `approved_doctor_ids` e `mode`. O adaptador `demo` guarda a exceção em `detalhes.excecao` do registro `recommendation_approved`. O campo precisa ser combinado com o backend, e a regra "sem justificativa, sem exceção" continuar valendo lá.
4. **Id da vaga e rascunho.** Na interface a vaga tem `id` próprio e "rascunho" é um estado de tela (item 5 da decisão). No backend, a vaga ainda não publicada é identificada por `shift_key` (`Recomendacao.chave`). Nas fixtures, o `entity_id` da trilha é o id da interface, e a cadeia de hash é calculada com ele.
5. **`trecho` de cada campo lido.** O backend não devolve a posição do texto de onde saiu cada campo. O `demo` calcula o trecho no seu porte da extração por regras; no `live` o campo vem vazio até o backend entregar.
6. **`evidencia` da exclusão.** O backend devolve o código da regra e o texto genérico (`RULE_TEXTS`). A evidência numérica ("Mora a 18,2 km; o raio declarado é 15 km.") é recalculada pelo exportador com `rules.py::evaluate_candidate`; no `live` ela só aparece se o backend a entregar.

## Alternativas descartadas

- **SPA em Vite só para a demonstração:** mais rápida de montar, mas descarta o servidor, o `proxy` e a estrutura que o `live` vai exigir.
- **Página única de demonstração, sem rotas por papel:** não mostra a plataforma que o professor vai avaliar (experiência, jornada e interface, A4-4).
- **Base UI no lugar do Radix:** o shadcn/ui aceita os dois; o Radix tem a acessibilidade mais testada no ecossistema e é o que o resto da documentação do projeto assume.
- **Login com e-mail e senha:** não há dado real nem necessidade, e criaria barreira para a plateia (3.3.8).
