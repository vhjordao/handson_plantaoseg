# Ficha do componente: interface web (plataforma)

- **Responsável:** Victor Jordão, com o Claude Code · **Frente:** interface · **Branch:** `f3/web-plataforma` · **Atualizado em:** 03/11/2026
- **Estado:** fase **UI-0 (fundação)**: site público (landing, entrada, ajuda), cascas dos três papéis, telão provisório e a camada de dados no modo `demo`. As telas do coordenador (UI-1), do médico (UI-2), o telão ao vivo e a auditoria (UI-3) seguem o [prompt de frontend](../../docs/design/prompt-frontend.md), seção 16. Decisões: [ADR 0010](../../docs/adr/0010-web-responsiva-sem-pwa.md) (web responsiva, sem PWA) e [ADR 0011](../../docs/adr/0011-estrutura-da-plataforma-web.md) (estrutura, sessão e camada de dados).

## 1. O que é e qual dor resolve

É a interface do PlantãoSeguro: **uma plataforma web** que abre no computador e no celular, com um site que apresenta o produto, uma entrada sem senha por persona fictícia e as áreas do coordenador e do médico. Responde à dor 2 da Entrega 1 (**seleção opaca**) tornando visível, em cada tela, **quem falou**: o que a IA sugere é tracejado, o que uma pessoa decide é contínuo e leva um selo, e o que é regra do sistema é cinza. É também a "interface e jornada" que a Etapa 3 pede (A4-4).

## 2. Como funciona

- **Rotas:** `/` (landing), `/entrar` (três portas: coordenador, médico, telão), `/ajuda`, `/coordenador/*`, `/medico/*` e `/telao`. O mapa completo está no prompt, seção 7.1.
- **Sessão sem senha:** `/entrar` grava um cookie com `{papel, personaId}`; o `proxy.ts` (Next.js 16) leva quem não tem a sessão certa de volta a `/entrar`. O cookie **não é assinado**: tudo é simulação e não há dado real a proteger. No modo `live`, a persona vira um login anônimo do Supabase.
- **Camada de dados:** as telas falam só com a interface `PlantaoApi` (`lib/api`). O adaptador **`demo`** roda no navegador, com fixtures geradas do **pipeline real** (`scripts/exportar_fixtures_web.py`) e um relógio simulado (quinta, 01/10/2026, 9h); o `live` chama a `matching-api` e o Supabase e vem na UI-2. Escolha por `NEXT_PUBLIC_DATA_MODE=demo|live`.
- **As três vozes:** `SuperficieVoz` desenha um contorno tracejado (IA), contínuo (pessoa) ou uma linha fina cinza (regra). Quando a voz muda de IA para pessoa, as lacunas do traço se fecham em cerca de 450 ms: é o único movimento da interface. A forma do traço, o rótulo e o ícone carregam o significado; a cor só reforça.
- **Honestidade:** a leitura da vaga nesta demonstração é feita **por regras** (o Gemini ainda não foi testado com chave), e por isso aparece em cinza e como "Leitura por regras", não como sugestão da IA. Os motivos dizem se foram "montados pelo sistema a partir dos fatores" ou "reescritos pela IA".

## 3. Como foi feito

1. Prompt de frontend v2, referências (nexunio.health vista no navegador, Carbon for AI, HAX, PAIR, GOV.UK, NHS, WCAG 2.2) e direção de arte em duas passagens, com revisão contra o padrão genérico ([`docs/design/`](../../docs/design/)).
2. Tokens em CSS (claro e escuro) e o script `npm run check:contraste`, que lê o `globals.css` e confere cada par de cores.
3. Primitivos no estilo do shadcn/ui, escritos no repositório sobre o pacote unificado `radix-ui`, sem sombra e com raios de 6, 10 e 16 px.
4. Landing com o hero vivo (saída real da PoC), entrada por persona e cascas por papel.
5. Fixtures e adaptador `demo` (subagente, a partir do pipeline Python real) e testes.
6. Revisão de olhos novos pelos agentes `designer-ui`, `revisor-frontend` e `acessibilidade` ([`.claude/agents/`](../../.claude/agents/)).

## 4. Código-chave

| Arquivo | O que faz | Trecho a entender |
| --- | --- | --- |
| `app/globals.css` | Tokens das duas paletas, escala tipográfica, foco e o contorno que fecha | `.contorno-rect` e `[data-voz="humano"]`: a transição de `stroke-dasharray` |
| `components/dominio/superficie-voz.tsx` | As três vozes como superfície | A prop `voz` troca o contorno; o SVG é decorativo (`aria-hidden`) |
| `components/landing/hero-demo.tsx` | A demonstração viva do hero | O espaço de cada etapa fica reservado (`visibility`), então nada pula |
| `lib/api/types.ts` e `plantao-api.ts` | O contrato com o backend, em Zod, e a interface `PlantaoApi` | Espelha `models.py`, `pipeline.py`, `rules.py`, `explain.py` e `audit.py` |
| `proxy.ts` e `lib/session/` | Sessão por persona e proteção das rotas | `destinoSeguro`: o parâmetro `de` só aceita rota do mesmo papel |
| `lib/copy/` | Todos os textos, em português | Rótulos dos códigos do backend e as afirmações permitidas |
| `scripts/check-contraste.mjs` | Confere os contrastes direto do CSS | Falha com código 1 se algum par ficar abaixo do mínimo |

## 5. Ferramentas e versões

| Ferramenta | Versão | Para quê | Por que esta e não outra | Custo |
| --- | --- | --- | --- | --- |
| Next.js | 16.4.4 | Framework (App Router, `proxy.ts`) | Já em produção desde o ADR 0007; `docs/02` registra Vite como alternativa | 0 |
| React | 19.3.0 | Componentes | Vem com o Next.js | 0 |
| Tailwind CSS | 4.3.4 | Estilos, só com as cores do projeto (`--color-*: initial`) | Previsto no plano; evita paleta solta | 0 |
| TypeScript | 5.9.3 | Tipos (modo estrito) | Encontra erros antes da build | 0 |
| `radix-ui` | 1.8.1 | Diálogo, acordeão, abas, popover e menu acessíveis | Acessibilidade testada; é o que o shadcn/ui usa | 0 |
| `lucide-react` | 1.67.0 | Ícones, sempre com texto quando carregam significado | Traço fino e consistente | 0 |
| Zod | 4.6.7 | Contratos e validação de fronteira | Um esquema vira tipo e validação | 0 |
| TanStack Query | 5.105.3 | Estado assíncrono das telas de dados (UI-1) | Cache e estados de carga e erro | 0 |
| Vitest, Testing Library, jsdom | 5.1.0, 16.3.3, 30.1.3 | Testes de componente | Rápido e sem navegador | 0 |
| Playwright e `@axe-core/playwright` | 1.64.1 e 4.14.0 | Jornada e acessibilidade (axe) nos temas claro e escuro | Mede o que o usuário vê | 0 |
| Atkinson Hyperlegible Next e Source Serif 4 | `next/font` | Interface e títulos | A Atkinson foi desenhada para leitura cansada; ambas ficam hospedadas com o site (o build baixa, o navegador não chama o Google) | 0 |
| Node.js | 26.x | Execução | A mesma versão na máquina, na CI e na Vercel | 0 |

## 6. Como rodar e testar

Da raiz do repositório, em um clone fora do OneDrive e com Node 26:

```
make web-install      # instala as dependências
make web              # abre em http://localhost:3000
make web-check        # lint, tipos e build
```

De dentro de `apps/web`:

```
npm test                   # testes de componente (Vitest)
npm run check:contraste    # contraste de cada par de cores, nos dois temas
npm run test:e2e           # jornada e axe (Playwright); PW_CHANNEL=msedge usa o Edge do Windows
node scripts/capturar.mjs / --secoes --saida ../../docs/design/capturas   # capturas por seção
```

A página não precisa de `.env`. O `.env` da raiz guarda só os tokens de acesso às contas, e o Next.js não o lê.

## 7. Testes e resultados

Na máquina local, em 03/11/2026:

- **Testes de componente (Vitest):** 22 passando (vozes, selo, botão, campos, resumo de erros, datas e números em português).
- **Jornada e acessibilidade (Playwright, Edge):** 15 passando em computador (1440 px) e celular (390 px): a demonstração do hero chega ao selo, o primeiro Tab leva a "Pular para o conteúdo", **Ajuda** fica à esquerda de **Entrar**, sem rolagem horizontal em 320 px, estado final com movimento reduzido e `axe` sem violação grave nos temas claro e escuro.
- **Contraste:** todos os pares passam nos dois temas (texto principal de 14,1:1 a 16,6:1; contorno e campos de 3,2:1 a 10,0:1).
- **Lighthouse (build de produção, Edge):** acessibilidade 100, desempenho 100, boas práticas 96 (a nota é o `404` do `/entrar`, que ainda não existia na medição) e SEO 60 (**esperado**: a página é `noindex` de propósito, ADR 0007). LCP de 0,9 s no celular simulado e de 0,3 s no computador; CLS de 0,009.
- **Build de produção:** `/`, `/telao` e `/_not-found` estáticas; `/ajuda` dinâmica (lê a sessão).

Na CI, o job `web` roda lint, tipos, contraste, testes e build, e o job `web-e2e` roda a jornada e o `axe` sobre o build de produção.

## 8. Dados e segurança

- **Dados:** só sintéticos, sempre com a faixa "Ambiente de demonstração" e o aviso "Não digite dados reais". CRM no formato `SIM-SP-000083`.
- **Segredos:** nenhum no navegador. Não há variável de ambiente nesta fase; quando o modo `live` chegar, o navegador usa só a chave pública, sob RLS, e a chave de serviço fica no servidor.
- **Sessão:** cookie `httpOnly`, `sameSite=lax`, sem dado pessoal e **sem assinatura** (decisão consciente da demonstração). O parâmetro `de` só aceita rota do mesmo papel, para não virar redirecionamento aberto.
- **Texto da vaga:** é entrada hostil e nunca vira HTML; os trechos destacados saem de componentes, não de strings.
- **Dependências:** `npm audit --omit=dev` (03/11/2026) não aponta vulnerabilidades no que vai para produção. Continuam os 16 alertas moderados de ferramentas de desenvolvimento, todos na cadeia do ESLint (os mesmos da ficha anterior); o conserto automático rebaixaria o ESLint para versões antigas, então não foi aplicado.
- **Ainda não feito:** cabeçalhos próprios de segurança, como CSP (entram antes de haver login real).

## 9. Limitações e honestidade

- Hoje a leitura da vaga é por regras: o Gemini ainda não foi testado com chave, e a tela diz isso.
- Cascata, aceite e contestação são **simulados**; o rastro de pagamentos e o check-in não existem (evolução futura, ADR 0002).
- As recomendações da demonstração vêm de uma **grade pré-calculada** (12 h, próximos 8 dias), não de um cálculo em tempo real; fora dela, a tela explica o limite.
- Os números de tempo e de concentração vêm de uma simulação com dados sintéticos e não são evidência real.
- Conferido em navegador com tamanho de tela emulado, não em celular real.
- Os limites de jornada (24 h e 11 h) são configuração do projeto, não norma verificada; qualquer afirmação sobre o CFM leva "validar com jurídico".

## 10. Uso de IA no desenvolvimento

O Victor pediu a plataforma web, a landing e a área de entrada, a busca de skills e de referências e agentes de revisão. O Claude Code escreveu o prompt v2, a direção de arte, os componentes e os testes; um subagente gerou as fixtures a partir do pipeline Python; três agentes (`designer-ui`, `revisor-frontend` e `acessibilidade`) revisam de olhos novos. O texto e o visual aguardam a revisão do Victor no PR. **Corrigido no caminho:** a skill do Vercel dizia que o `proxy.ts` exporta `proxyConfig`, mas a documentação do pacote do Next.js diz `config`; valeu a documentação do pacote.

## 11. Próximos passos

UI-1 (`f3/web-coordenador`): Vagas, Nova vaga com os campos lidos, Sugestões com motivos, o diálogo de decisão e o selo humano. UI-2 (`f3/web-medico`): ofertas, aceite, contestação, cascata e o adaptador `live`. UI-3: telão ao vivo, auditoria, equidade e a rodada de usabilidade. Antes de ligar o Supabase, entram os cabeçalhos de segurança.
