# Ficha do componente: interface web (plataforma)

- **Responsável:** Victor Jordão, com o Claude Code · **Frente:** interface · **Branch:** `f3/web-coordenador` · **Atualizado em:** 05/11/2026
- **Estado:** fases **UI-0 (fundação)**, **UI-1 (coordenador)** e a fase 3 do roteiro (o **modo real**, com o login da demonstração, [ADR 0016](../../docs/adr/0016-modo-real-pela-rota-do-site.md)): site público (landing, entrada, ajuda), cascas dos três papéis, telão provisório, a camada de dados no modo `demo` e a jornada do coordenador, do pedido em texto livre à decisão. As telas do médico (UI-2), o telão ao vivo e a auditoria (UI-3) seguem o [prompt de frontend](../../docs/design/prompt-frontend.md), seção 16. Decisões: [ADR 0011](../../docs/adr/0011-web-responsiva-sem-pwa.md) (web responsiva, sem PWA) e [ADR 0014](../../docs/adr/0014-estrutura-da-plataforma-web.md) (estrutura, sessão e camada de dados).

## 1. O que é e qual dor resolve

É a interface do PlantãoSeguro: **uma plataforma web** que abre no computador e no celular, com um site que apresenta o produto, uma entrada sem senha por persona fictícia e as áreas do coordenador e do médico. Responde à dor 2 da Entrega 1 (**seleção opaca**) tornando visível, em cada tela, **quem falou**: o que a IA sugere é tracejado, o que uma pessoa decide é contínuo e leva um selo, e o que é regra do sistema é cinza. É também a "interface e jornada" que a Etapa 3 pede (A4-4).

## 2. Como funciona

- **Rotas:** `/` (landing), `/entrar` (três portas: coordenador, médico, telão), `/ajuda`, `/coordenador/*`, `/medico/*` e `/telao`. O mapa completo está no prompt, seção 7.1.
- **Sessão sem senha:** `/entrar` grava um cookie com `{papel, personaId}`; o `proxy.ts` (Next.js 16) leva quem não tem a sessão certa de volta a `/entrar`. O cookie **não é assinado**: tudo é simulação e não há dado real a proteger. No modo `live`, a persona vira um login anônimo do Supabase.
- **Modo real (fase 3):** quem entra com e-mail e senha em "Entrar no sistema real" usa o adaptador **`live`** (`lib/api/live`). O navegador só fala com o próprio site, em `/api/sistema`, e essa rota repassa à API de matching e ao Supabase (só leitura, sob RLS), com os endereços em variáveis só do servidor. O modo vem do cookie de sessão (`modo`). Se o sistema real não responder, um aviso leva ao modo de demonstração com um clique.
- **Camada de dados:** as telas falam só com a interface `PlantaoApi` (`lib/api`). O adaptador **`demo`** roda no navegador, com fixtures geradas do **pipeline real** (`scripts/exportar_fixtures_web.py`) e um relógio simulado (quinta, 01/10/2026, 9h); o `live` chama a `matching-api` e o Supabase e vem na UI-2. O modo vem da sessão: o login real usa o `live`.
- **As três vozes:** `SuperficieVoz` desenha um contorno tracejado (IA), contínuo (pessoa) ou uma linha fina cinza (regra). Quando a voz muda de IA para pessoa, as lacunas do traço se fecham em cerca de 450 ms: é o único movimento da interface. A forma do traço, o rótulo e o ícone carregam o significado; a cor só reforça.
- **Nova vaga (`/coordenador/vagas/nova`):** a pessoa escreve o pedido ou clica num exemplo, e "Ler a vaga" mostra os cinco campos para conferir, cada um com a origem ("Está no texto", "Calculado do texto" ou "Não está no texto") e o trecho do texto. O campo que falta vira pergunta, e a tela não deixa seguir sem resposta. Texto com tentativa de injeção é sinalizado. Se a leitura falhar, aparece o formulário rápido; "Simular falha da leitura" mostra esse caminho na demonstração. Sem "Confirmar e ver as sugestões", nada é publicado.
- **Sugestões (`/coordenador/vagas/[id]`):** a ordem sugerida fica num contorno tracejado, com uma frase de motivo, a faixa de chance e os alertas de jornada. "Ver motivos" abre o número, as barras do que pesou, o que não entra na ordem, a ficha do modelo e "Esta explicação ajudou?". "Quem ficou de fora" mostra a regra e a evidência, com pseudônimo. Nenhum nome vem marcado: a pessoa marca, "Aprovar e oferecer" abre o diálogo de conferência, e quem tem alerta exige justificativa. Ao confirmar, o tracejado fecha e o selo assenta. "Pular" é reversível enquanto a vaga espera a decisão, e a trilha guarda as duas linhas.
- **Honestidade:** a leitura da vaga nesta demonstração é feita **por regras** (o Gemini só foi testado à parte, com textos sintéticos), e por isso aparece em cinza e como "Leitura por regras", não como sugestão da IA. Os motivos dizem se foram "montados pelo sistema a partir dos fatores" ou "reescritos pela IA".

## 3. Como foi feito

1. Prompt de frontend v2, referências (nexunio.health vista no navegador, Carbon for AI, HAX, PAIR, GOV.UK, NHS, WCAG 2.2) e direção de arte em duas passagens, com revisão contra o padrão genérico ([`docs/design/`](../../docs/design/)).
2. Tokens em CSS (claro e escuro) e o script `npm run check:contraste`, que lê o `globals.css` e confere cada par de cores.
3. Primitivos no estilo do shadcn/ui, escritos no repositório sobre o pacote unificado `radix-ui`, sem sombra e com raios de 6, 10 e 16 px.
4. Landing com o hero vivo (saída real da PoC), entrada por persona e cascas por papel.
5. Fixtures e adaptador `demo` (subagente, a partir do pipeline Python real) e testes.
6. Revisão de olhos novos pelos agentes `designer-ui`, `revisor-frontend` e `acessibilidade` ([`.claude/agents/`](../../.claude/agents/)).
7. Tela do coordenador (UI-1): novos métodos no contrato, componentes de domínio, as duas telas, os testes e a revisão visual em capturas de 1440 e 390 px, claro e escuro.

## 4. Código-chave

| Arquivo | O que faz | Trecho a entender |
| --- | --- | --- |
| `app/globals.css` | Tokens das duas paletas, escala tipográfica, foco e o contorno que fecha | `.contorno-rect` e `[data-voz="humano"]`: a transição de `stroke-dasharray` |
| `components/dominio/superficie-voz.tsx` | As três vozes como superfície | A prop `voz` troca o contorno; o SVG é decorativo (`aria-hidden`) |
| `components/landing/hero-demo.tsx` | A demonstração viva do hero | O espaço de cada etapa fica reservado (`visibility`), então nada pula |
| `lib/api/types.ts` e `plantao-api.ts` | O contrato com o backend, em Zod, e a interface `PlantaoApi` | Espelha `models.py`, `pipeline.py`, `rules.py`, `explain.py` e `audit.py` |
| `lib/api/demo/adaptador.ts` | O adaptador `demo` de `PlantaoApi` | `operacao` e `aplicar`: uma escrita por vez, gravada de uma vez e descartada se a demonstração foi reiniciada no meio; aprovar a mesma lista de novo devolve a decisão já tomada |
| `lib/api/demo/privacidade.ts` | Tira nome, CRM, telefone, e-mail e número de documento dos textos livres | É de melhor esforço: reduz o risco, não o elimina |
| `proxy.ts` e `lib/session/` | Sessão por persona e proteção das rotas | `destinoSeguro`: o parâmetro `de` só aceita rota do mesmo papel |
| `components/coordenador/nova-vaga.tsx` | Escrever, ler, conferir e publicar a vaga | `propsDoCampo`: o campo que falta vira pergunta; `textoMudou`: o texto alterado depois da leitura barra a publicação |
| `components/coordenador/ordem-sugerida.tsx` | A lista, a seleção e a decisão | `voz={decisao ? "humano" : "ia"}` fecha o tracejado; a região de status existe antes de o selo entrar, para o anúncio não se perder |
| `components/coordenador/dialogo-de-decisao.tsx` | Conferir antes de aprovar | `onOpenAutoFocus`: o foco vai ao título, nunca ao botão de confirmar |
| `components/dominio/fatores-de-decisao.tsx` | As barras do que pesou | O sentido vem na posição, na cor e na palavra; o número da contribuição não aparece |
| `lib/format/sugestoes.ts` | Faixa de chance e aviso de chances parecidas | Os cortes (0,5 e 0,7; 5 pontos) são da interface, não do modelo |
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

A página não precisa de `.env` para o modo de demonstração. O modo real pede, na publicação, `NEXT_PUBLIC_SISTEMA_REAL=1` e, só no servidor, `API_URL`, `SUPABASE_URL` e `SUPABASE_ANON_KEY`. Na Vercel, elas ficam nas variáveis do projeto, e nunca no Git. O `.env` da raiz guarda só os tokens de acesso às contas, e o Next.js não o lê.

## 7. Testes e resultados

Na máquina local, em 05/11/2026:

- **Testes unitários e de componente (Vitest):** 184 passando em 12 arquivos: vozes, selo, botão, campos e resumo de erros; datas e números em português; contratos e fixtures; paridade das listas fechadas (ações da trilha, variáveis do ranking e códigos de exclusão) com o código Python do backend; extração por regras; trilha com hash; limpeza de dados pessoais; aprovação repetida, reinício no meio de uma operação e limites de texto; sessão e `destinoSeguro`; provedor da API (carregamento, falha com "Tentar de novo", armazenamento bloqueado); região de status do selo, marca compacta e título da 404.
- **Jornada e acessibilidade (Playwright, Edge, sobre o build de produção como na CI):** 123 passando e 11 ignorados de propósito (o primeiro Tab não faz sentido no celular, e os testes que criam o próprio tamanho de tela rodam só no computador), em computador (1440 px) e celular (390 px). Cobre a demonstração do hero até o selo, "Pular para o conteúdo", **Ajuda** à direita no cabeçalho, sem rolagem horizontal em 320 px, estado final com movimento reduzido, as três portas de `/entrar` (inclusive `?papel=` pela posição visual), a sessão por persona, a tela de Vagas, Minha conta, Sair e o `axe` sem violação grave nos temas claro e escuro. A bateria `e2e/acessibilidade.spec.ts` confere o que o `axe` não pega: o foco voltando com Shift+Tab não fica sob o cabeçalho fixo (320, 360 e 375 px), sem rolagem horizontal a 320 px e, com a letra a 200% em 390 px, na landing, entrada, ajuda e nas áreas do médico e do coordenador; a ordem do HTML em `/entrar?papel=`; o aviso do filtro das vagas e o da decisão no hero; o sublinhado do item atual em alto contraste; a orientação das abas; a altura dos links soltos; e o `axe` com as regras de estrutura em `/ajuda`, `/telao`, na 404 e em `/entrar?papel=`. Contra o servidor de desenvolvimento, com os testes em paralelo, 5 testes do computador estouraram os 30 s (ele é bem mais lento que o build); por isso a medida vale só no build de produção.
- **Contraste:** todos os pares passam nos dois temas (texto principal de 14,1:1 a 16,6:1; contorno e campos de 3,2:1 a 10,0:1).
- **Lighthouse (build de produção, Edge, medido em 03/11/2026, **antes** da revisão de 04/11 e não repetido depois), em `/` e em `/entrar`:** acessibilidade **100**, boas práticas **100**, desempenho 99 a 100 e SEO 60 (**esperado**: a página é `noindex` de propósito, ADR 0007). LCP de 0,9 s no celular simulado e de 0,3 s no computador; CLS de 0,009 na landing e 0 na entrada. Uma primeira medição saiu pior (acessibilidade 93, e `/entrar` com erro) por ter sido feita contra um servidor de produção velho que ficou na porta: o resultado acima é de um servidor novo.
- **Build de produção:** `/`, `/telao` e `/_not-found` estáticas; `/ajuda`, `/entrar` e as áreas por papel dinâmicas (leem a sessão ou os parâmetros).

Na CI, o job `web` roda lint, tipos, contraste, testes e build, e o job `web-e2e` roda a jornada e o `axe` sobre o build de produção.

## 8. Dados e segurança

- **Dados:** só sintéticos, sempre com a faixa "Ambiente de demonstração" e o aviso "Não digite dados reais". CRM no formato `SIM-SP-000083`.
- **Segredos:** nenhum no navegador. Não há variável de ambiente nesta fase; quando o modo `live` chegar, o navegador usa só a chave pública, sob RLS, e a chave de serviço fica no servidor.
- **Sessão:** cookie `httpOnly`, `sameSite=lax`, sem dado pessoal e **sem assinatura** (decisão consciente da demonstração). O parâmetro `de` só aceita rota do mesmo papel, para não virar redirecionamento aberto.
- **Texto da vaga:** é entrada hostil e nunca vira HTML; os trechos destacados saem de componentes, não de strings.
- **Dependências:** `npm audit --omit=dev` (03/11/2026) não aponta vulnerabilidades no que vai para produção. Continuam os 16 alertas moderados de ferramentas de desenvolvimento, todos na cadeia do ESLint (os mesmos da ficha anterior); o conserto automático rebaixaria o ESLint para versões antigas, então não foi aplicado.
- **Cabeçalhos:** `nosniff`, `Referrer-Policy`, `Permissions-Policy` e `frame-ancestors 'none'` (a página não abre dentro de outro site). O cookie só ganha `secure` quando a conexão é HTTPS, para a demonstração continuar funcionando em `localhost`.
- **Textos digitados:** têm limite (2.000 caracteres para o pedido da vaga, 1.000 para justificativa, motivo e comentário) e passam por uma limpeza de dados pessoais de melhor esforço antes de ir para a trilha ou para a sessão.
- **Ainda não feito:** uma CSP completa, com `script-src` por nonce (entra antes de haver login real).

## 9. Limitações e honestidade

- Hoje a leitura da vaga é por regras: o Gemini só foi testado à parte, com textos sintéticos, e a tela diz isso.
- A tela do coordenador roda só no modo `demo`: não chama a API nem o n8n. Aprovar registra a decisão na trilha da sessão e deixa a vaga em "Oferta em andamento", e a tela diz que o acompanhamento da cascata chega na próxima entrega.
- Uma vaga publicada não se edita; para corrigir, publique outra. "Pular" não pede motivo, embora o contrato aceite um. Pular e desfazer não existem na API ([ADR 0014](../../docs/adr/0014-estrutura-da-plataforma-web.md), divergência 4).
- A faixa de chance e o aviso de chances parecidas usam cortes escolhidos pela interface. Não foram validados com coordenadores: é o que o teste de usabilidade precisa observar.
- Cascata, aceite e contestação são **simulados**; o rastro de pagamentos e o check-in não existem (evolução futura, ADR 0002).
- As recomendações da demonstração vêm de uma **grade pré-calculada** (12 h, próximos 8 dias), não de um cálculo em tempo real; fora dela, a tela explica o limite.
- Os números de tempo e de concentração vêm de uma simulação com dados sintéticos e não são evidência real.
- A trilha de auditoria da demonstração vive no navegador. O hash encadeado **detecta** uma linha alterada, mas **não impede forja**: quem controla o navegador pode refazer a cadeia. A verificação é local, e a imutabilidade de verdade fica para o modo `live`.
- A limpeza de dados pessoais nos textos livres é de melhor esforço; o aviso "Não digite dados reais" continua valendo.
- Conferido em navegador com tamanho de tela emulado, não em celular real, e sem leitor de tela real.
- Os limites de jornada (24 h e 11 h) são configuração do projeto, não norma verificada; qualquer afirmação sobre o CFM leva "validar com jurídico".

## 10. Uso de IA no desenvolvimento

O Victor pediu a plataforma web, a landing e a área de entrada, a busca de skills e de referências e agentes de revisão. O Claude Code escreveu o prompt v2, a direção de arte, os componentes e os testes; um subagente gerou as fixtures a partir do pipeline Python; três agentes (`designer-ui`, `revisor-frontend` e `acessibilidade`) revisam de olhos novos. A revisão do `designer-ui` e a do `revisor-frontend` já foram aplicadas (copy sem jargão, entrada em casca própria, Vagas com a lista primeiro, aprovação idempotente, fila de operações, limpeza de dados pessoais mais larga, limites de texto, cabeçalhos de segurança); a do `acessibilidade` (17 achados, nenhum bloqueando o uso) também foi aplicada e virou testes. Não foi verificado: leitor de tela real, celular real, o Alto Contraste real do Windows e Safari e Firefox. O texto e o visual aguardam a revisão do Victor no PR. **Corrigido no caminho:** a skill do Vercel dizia que o `proxy.ts` exporta `proxyConfig`, mas a documentação do pacote do Next.js diz `config`; valeu a documentação do pacote.

## 11. Próximos passos

A ordem está no [roteiro até o MVP](../../docs/roteiro-ate-o-mvp.md): o adaptador `live` (fase 3, feito para o coordenador em 06/11), a tela do médico com a cascata (fase 4), a demonstração guiada (fase 5) e auditoria, contestações e equidade (fase 6). O telão ao vivo saiu do MVP em 06/11: a apresentação é guiada, e a plateia não usa o sistema. As decisões que mexem na web estão no [ADR 0015](../../docs/adr/0015-decisoes-que-destravam-o-mvp.md): login com e-mail e senha no `live` (D1), consulta a cada 3 segundos (D7), recusa com um dos quatro motivos e confirmação antes (D4 e D5) e urgência exigida no pedido (D10). Antes de ligar o Supabase, entram os cabeçalhos de segurança.
