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

Subagentes servem para trabalho independente em paralelo e para revisões de olho novo; não são usados para tarefas triviais.

## Skills próprias (`.claude/skills/`)

| Skill | Origem | Data | Motivo |
| --- | --- | --- | --- |
| `incorporar-feedback-professor` | escrita pelo projeto | 28/10/2026 | O procedimento já se repetiu (feedback da Entrega 1) e vai se repetir a cada etapa |

Previstas para quando o procedimento se repetir: `fechar-etapa`, `revisao-conformidade`, `migracao-supabase`.

## Skills de terceiros

Nenhuma adotada. A busca com `npx skills find` não rodou em 28/10 porque o Node não está instalado na máquina. Regras para quando rodar:

1. Preferir publicadores oficiais (por exemplo `npx skills add supabase/agent-skills`).
2. Ler o `SKILL.md` e todos os arquivos e scripts da skill **antes** de instalar (hooks podem executar código).
3. Instalar só no escopo do projeto (`-a claude-code`), sem `-y` nem `--all`.
4. Mostrar a lista de candidatas (nome, origem, o que faz, riscos) e esperar o "ok" do Victor antes de instalar qualquer uma que não seja oficial.
5. Registrar aqui cada skill adotada (origem, data, motivo). Skills nunca leem `.env` nem enviam dados do projeto para fora.

## MCPs e CLIs

| Ferramenta | Uso | Observação |
| --- | --- | --- |
| `gh` (GitHub CLI) | clonar, abrir PR, conferir a CI | Autenticado como `vhjordao`; sem push direto na `main` |
| `git` | commits e branches por fase | Commits pequenos, testes antes de cada commit |
| Supabase CLI | banco local (`supabase start`) e migrações | **Ausente** na máquina; instalar. O MCP remoto do Supabase não é usado: o desenvolvimento é local |
| Docker Compose | n8n, worker, Redis e Postgres do n8n | **Ausente** na máquina; instalar Docker Desktop |

Não criamos contas nem compramos nada. As chaves que o Victor providencia ficam em `.env.example`, sem valor.
