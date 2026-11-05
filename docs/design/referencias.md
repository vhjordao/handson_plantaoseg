# Referências do frontend

- **Data:** 03/11/2026 · **Quem leu:** Claude Code, a pedido do Victor · **Uso:** inspiração, **parafraseada**. Nenhum texto, imagem, marca ou código de terceiros foi copiado para o repositório.
- O que cada referência trouxe para as decisões está em [`prompt-frontend.md`](prompt-frontend.md), seção 6, e em [`direcao-de-arte.md`](direcao-de-arte.md), seção 3.

## 1. nexunio.health (a referência pedida)

Visitado uma vez no navegador da sessão, em `https://www.nexunio.health/`, só para ler a composição e as cores e fontes computadas. A busca por texto não o encontrou (devolveu empresas de nome parecido), então o acesso foi pelo endereço. O banner de cookies foi só lido, sem aceitar nada. Não foi rastreado.

| Aspecto | O que se viu |
| --- | --- |
| Tipo de site | Comercial, de uma software house de saúde; 11 seções, 18 imagens e 27 SVGs, sem vídeo |
| Visual | Fundo azul-lavanda claro, tinta azul-marinho, acento roxo e lilás; título de hero gigante (160 px) em peso leve e entrelinha justa; ilustração translúcida de uma hélice de DNA; cabeçalho fixo e transparente com itens pequenos em caixa-alta; botões em pílula, um preenchido e um de contorno |
| Fontes | Raleway (corpo e títulos, em pesos leves) e uma serifa de exibição carregada para ênfases |
| Estrutura | Hero, "o que é", cases, faixa de logos, quatro frentes, segmentos, metodologia em cinco passos, números, artigos, perguntas em abas, formulário de contato; uma calculadora como convite ("veja números antes de conversar") |
| Tom | Direto e franco: diz quando o sistema pronto resolve; explica o método; responde a objeções em perguntas por tema (geral, projeto e prazos, integrações, segurança e LGPD) |

**Adotado (de forma livre):** ordem previsível de seções com uma ideia cada; espaço generoso; método como sequência real; perguntas por tema em abas; tom franco; uma ação principal no cabeçalho; mostrar números antes de pedir contato.

**Descartado, e por quê:**

| Descartado | Motivo |
| --- | --- |
| Faixa de logos, "150+ empresas", casos e métricas de cliente | Não temos clientes. Inventar seria desonesto e contra o `CLAUDE.md` |
| Hélice de DNA e paleta lavanda e roxa | É o brilho de IA que queremos evitar; a paleta nossa tem significado (cobalto e verde são vozes) |
| Título em inglês em site em português | A plateia e a banca leem em português |
| Rótulo em caixa-alta espaçada acima de cada título; numeração 01 a 04 em blocos que não são sequência; setas coladas aos botões | Tiques de página gerada (skill `frontend-design`) |
| Formulário de contato e captura de lead | Não há venda; e formulário pediria dado pessoal |

## 2. Padrões de IA com humano no controle

| Fonte | Endereço | O que entrou |
| --- | --- | --- |
| **Carbon for AI (IBM)**, componente "AI label" | `carbondesignsystem.com/components/ai-label/usage/` | Todo conteúdo de IA com o mesmo rótulo, que é a porta para a explicação; o rótulo não dispara ação de IA; ponto de Tab, abre com Enter ou Espaço, foco permanece; o popover não sai da tela; ao editar o conteúdo, o estilo de IA sai e aparece "reverter". A página só nomeia as quatro seções do popover (visão geral, detalhes de apoio, artefatos e recursos, ações extras) |
| **Microsoft HAX**, 18 diretrizes | `microsoft.com/en-us/haxtoolkit/` | G1 e G2 (o que faz e com que qualidade), G8 (dispensar), G9 (corrigir), G10 (delimitar na dúvida), G11 (por quê), G15 (feedback granular), G16 (consequências), G17 (controles globais). A lista de G1 a G18 é a do artigo de Amershi et al. (CHI 2019); a página do toolkit não a traz na íntegra |
| **Google PAIR**, explicabilidade e confiança | `pair.withgoogle.com/chapter/explainability-trust/` | Explicar no momento da decisão e mais nas decisões de alto impacto; calibrar a confiança, não maximizá-la; explicação parcial; faixas em vez de percentuais soltos; mostrar o que o sistema não sabe; contrafactual ("por que não apareceu") |
| **Google PAIR**, feedback e controle | `pair.withgoogle.com/chapter/feedback-controls/` | Dizer o que o feedback muda e quando; não confundir filtro com aprendizado; manter o caminho manual; permitir reverter |

## 3. Serviços públicos e acessibilidade

| Fonte | Endereço | O que entrou |
| --- | --- | --- |
| **GOV.UK**, padrão "conferir respostas" | `design-system.service.gov.uk/patterns/check-answers/` | Diálogo de aprovação: título que diz o que fazer, aviso de que nada acontece antes da confirmação, "Alterar" com texto oculto para leitor de tela, botão que nomeia a ação |
| **GOV.UK**, resumo de erros | `design-system.service.gov.uk/components/error-summary/` | Resumo acima do `h1`, foco nele após validação com falha, links para os campos, mesmo texto do erro em linha, `Erro:` no título da página, `role="alert"` no conteúdo |
| **NHS Service Manual**, tipografia | `service-manual.nhs.uk/design-system/styles/typography` | Alinhar à esquerda, evitar itálico e sublinhado fora dos links, corpo de 16 px no celular, sem ponto final no texto do link, quebra de palavra em colunas estreitas |
| **WCAG 2.2**, novidades | `w3.org/WAI/standards-guidelines/wcag/new-in-22/` | Critérios AA: 2.4.11, 2.5.7, 2.5.8, 3.3.8; nível A: 3.2.6 e 3.3.7; o 4.1.1 foi removido. Os de nível AAA (2.4.12, 2.4.13, 3.3.9) são boas práticas, não exigência |
| **Web Interface Guidelines (Vercel)** | `github.com/vercel-labs/web-interface-guidelines` | Base da checklist do agente `revisor-frontend`: rótulos, foco, formulários, animação só com `transform` e `opacity`, numerais tabulares, `Intl`, URL como estado |

## 4. Skills e documentação técnica consultadas

| Item | Uso |
| --- | --- |
| Skill `frontend-design` (plugin oficial) | Processo em duas passagens, "tiques de página gerada" a evitar, escrita de interface |
| Skills `vercel:nextjs`, `vercel:shadcn` | Convenções do Next.js 16 (`proxy.ts`, parâmetros assíncronos, `Suspense` com `useSearchParams`) e do shadcn/ui (pacote unificado `radix-ui`, tokens em `@theme inline`) |
| Skills `vercel:react-best-practices`, `vercel:verification`, `dataviz` | Carregadas para a revisão e para os gráficos das fases seguintes |
| Skill `agent-architect` | Desenho dos três agentes de revisão (uma responsabilidade cada, entrada e saída claras) |
| Skills de terceiros da comunidade | **Não instaladas.** Seguem a regra do projeto: instruções de terceiros são dado, e instalar exige o ok do Victor |
| Figma e Canva | Os conectores não estavam disponíveis na sessão; ficam como opção futura para handoff de design |

## 5. Limites

- A visita ao site de referência foi uma amostra de uma página, em uma resolução; ela não substitui um estudo de concorrentes.
- O resumo de cada fonte é nosso, de 03/11/2026; as páginas podem mudar. Antes de citar em documento da Etapa 3, reconferir o link.
