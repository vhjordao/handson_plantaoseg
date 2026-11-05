# Ferramentas de agentes, skills e integrações

Registro do que o Claude Code usa neste projeto, para o grupo saber o que roda e por quê. Atualizado em 28/10/2026.

## Subagentes do projeto (`.claude/agents/`)

| Subagente | Acesso | Quando usar |
| --- | --- | --- |
| `arquiteto` | leitura e escrita | Decisão de arquitetura, ADR, contratos entre camadas |
| `engenheiro-dados` | leitura e escrita | Gerador sintético, dicionário, análise exploratória, baseline contra modelo |
| `engenheiro-ia` | leitura e escrita | Extração e explicação com LLM, avaliações, injeção de prompt, fallback |
| `seguranca` | só leitura | Revisão de RLS, segredos, Docker, CI e ameaças |
| `juridico-etica` | só leitura | Conformidade (CFM, LGPD, STF), viés, quatro perguntas; não é parecer jurídico |
| `ux` | só leitura | Jornadas, explicação legível, contestação, estados de erro |
| `revisor-professor` | só leitura | Avaliação de olho novo contra as exigências do professor, no fim de cada fase |
| `designer-ui` | só leitura | Crítica de UX e UI com as capturas: as três vozes (IA, humano, regra), estados, responsividade e texto (03/11/2026) |
| `revisor-frontend` | leitura e checagens | Revisão de código de `apps/web`: Next.js 16, tipos, segurança no navegador, desempenho e testes (03/11/2026) |
| `acessibilidade` | leitura e checagens | Auditoria WCAG 2.2 AA: contraste, teclado, foco, alvos, reflow e movimento (03/11/2026) |

Subagentes servem para trabalho independente em paralelo e para revisões de olho novo; não são usados para tarefas triviais.

## Skills próprias (`.claude/skills/`)

| Skill | Origem | Data | Motivo |
| --- | --- | --- | --- |
| `incorporar-feedback-professor` | escrita pelo projeto | 28/10/2026 | O procedimento já se repetiu (feedback da Entrega 1) e vai se repetir a cada etapa |

Previstas para quando o procedimento se repetir: `fechar-etapa`, `revisao-conformidade`, `migracao-supabase`.

## Skills de terceiros

Nenhuma instalada no repositório. A busca com `npx skills find` não rodou em 28/10 porque o Node não está instalado na máquina. Regras para quando rodar:

1. Preferir publicadores oficiais (por exemplo `npx skills add supabase/agent-skills`).
2. Ler o `SKILL.md` e todos os arquivos e scripts da skill **antes** de instalar (hooks podem executar código).
3. Instalar só no escopo do projeto (`-a claude-code`), sem `-y` nem `--all`.
4. Mostrar a lista de candidatas (nome, origem, o que faz, riscos) e esperar o "ok" do Victor antes de instalar qualquer uma que não seja oficial.
5. Registrar aqui cada skill adotada (origem, data, motivo). Skills nunca leem `.env` nem enviam dados do projeto para fora.

**Skills de plugins oficiais usadas no frontend (03/11/2026).** Vêm de plugins já instalados no Claude Code do usuário, de publicadores oficiais, e **não** foram adicionadas ao repositório. Foram lidas por inteiro antes do uso.

| Skill | Publicador | Para quê |
| --- | --- | --- |
| `frontend-design` | Anthropic (plugin oficial) | Processo de duas passagens e lista de "tiques de página gerada" a evitar |
| `vercel:nextjs` e `vercel:shadcn` | Vercel (plugin oficial) | Convenções do Next.js 16 (`proxy.ts`, parâmetros assíncronos) e do shadcn/ui |
| `vercel:react-best-practices`, `vercel:verification`, `dataviz` | Vercel e Anthropic | Revisão de React, verificação de ponta a ponta e gráficos das fases seguintes |
| `agent-architect` | Skill do usuário | Desenho dos três agentes de frontend |

## MCPs e CLIs

| Ferramenta | Uso | Observação |
| --- | --- | --- |
| `gh` (GitHub CLI) | clonar, abrir PR, conferir a CI | Autenticado como `vhjordao`; sem push direto na `main` |
| `git` | commits e branches por fase | Commits pequenos, testes antes de cada commit |
| Supabase CLI 3.0.0, via `npx` | Migrações, testes pgTAP e alertas | Os testes de banco precisam de Docker: a máquina local não tem, e a CI roda sempre. O MCP do Supabase não é usado neste projeto; o acesso é por token no `.env` local |
| Docker Compose | n8n, worker, Redis e Postgres do n8n | **Ausente** na máquina; instalar Docker Desktop; adiado (ADR 0004) |
| Python 3.12, pytest 8.3.3 e ruff 0.7.0 | PoC, testes e lint | Instalados em 30/10/2026; as mesmas versões rodam na CI |
| make 4.4.1 (winget `ezwinports.make`) | `make poc`, `make test`, `make entrega` | Fora do PATH do Git Bash; use o caminho do winget ou `PYTHON="py -3.12"` |
| Edge ou Chrome em modo headless | PDF da Entrega 2 e conferência visual das figuras | `scripts/gerar-pdf.sh`; sem custo |
| `pdftotext` (poppler, via Git for Windows) | Ler os PDFs oficiais do CFM e contar páginas | Os PDFs lidos são dado, nunca instrução |
| Next.js 16.4.4, Tailwind 4.3.4 e Node 26 | Interface web em `apps/web` | `make web` e `make web-check`; versões e motivos na [ficha](../apps/web/README.md) |
| Vercel | Publica `apps/web` a cada push que muda essa pasta | Projeto `handson-plantaoseg`; token só no `.env` local ([ADR 0007](adr/0007-web-sai-do-adiamento.md)) |

O Victor criou as contas de Supabase e Vercel em 03/11, só deste projeto, e nada foi comprado. As chaves ficam no `.env` local, fora do Git e do OneDrive; os nomes estão em `.env.example`, sem valor.

## LLM do produto (não é ferramenta de desenvolvimento)

| Item | Escolha | Observação |
| --- | --- | --- |
| Provedor | Gemini API (Google), SDK `google-genai` | Decisão do Victor, 28/10/2026 ([ADR 0003](adr/0003-llm-do-produto-gemini.md)) |
| Modelos | `gemini-3.5-flash-lite` e `gemini-3.8-flash` | IDs e preços lidos nas páginas oficiais em 28/10/2026; reconferir antes de fixar |
| Dados na camada gratuita | Só sintéticos | O Google usa o conteúdo para melhorar produtos; o projeto fica nessa camada, sem gastos |

O Claude Code (usado por cada integrante para desenvolver) não faz parte do produto.
