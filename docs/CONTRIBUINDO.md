# Guia de entrada da equipe

Para quem entra no projeto (Roberval, Guilherme, Sergio, Lucas e Plinio) e para o Claude Code de cada um. O trabalho é dividido em frentes (ver [plano da Etapa 2](plano-etapa-2.md)); cada pessoa usa o seu próprio Claude Code, e o `CLAUDE.md` do repositório garante que todos os assistentes sigam as mesmas regras.

> O repositório é **público**. Nunca coloque nele chaves, dados reais de médico, paciente ou hospital, nem os slides do professor.
>
> **Dois avisos de 28/10:** o **protótipo está adiado** ([ADR 0004](adr/0004-prototipo-adiado.md)): por ora não se constrói interface, API, n8n nem banco; o trabalho é Dados, Análise, Solução de IA e segurança. E o **LLM do produto é o Gemini** ([ADR 0003](adr/0003-llm-do-produto-gemini.md)); o Claude Code é só a ferramenta de desenvolvimento de cada um.

## 1. Antes de começar

| Item | Como | Verificação |
| --- | --- | --- |
| Conta no GitHub e convite | Aceite o convite do Victor (e-mail ou github.com/vhjordao/handson_plantaoseg) | Você consegue abrir o repositório e ver o botão "New pull request" |
| Claude Code com acesso próprio | Instale e entre com a sua conta (plano ou API; confirme o que o grupo vai usar) | `claude` abre na pasta do projeto |
| Git e GitHub CLI | https://git-scm.com e https://cli.github.com; depois `gh auth login` | `gh auth status` |
| Docker Desktop | https://docs.docker.com/desktop/ | `docker compose version` |
| Node.js LTS | https://nodejs.org | `node --version` |
| Python 3.12 **de verdade** | https://www.python.org/downloads/ (marque "Add to PATH"); o atalho da Microsoft Store não serve | `python -m pip --version` |
| Supabase CLI | https://supabase.com/docs/guides/local-development/cli/getting-started | `supabase --version` |
| make (Windows) | `choco install make` (PowerShell como administrador) ou `scoop install make` | `make --version` |

Depois de instalar, rode `make doctor`: ele diz o que ainda falta. Se algo não instalar, avise no grupo; o PR roda a mesma verificação na CI do GitHub, então você não fica travado.

## 2. Primeiro dia

1. Clone **fora do OneDrive** (o OneDrive sincroniza `node_modules` e `.git` e causa erros), por exemplo em `C:\dev`:
   ```
   gh repo clone vhjordao/handson_plantaoseg C:\dev\handson_plantaoseg
   ```
2. Crie o `.env` local: `cp .env.example .env`. Nunca commite esse arquivo. As chaves (Gemini e, mais adiante, Supabase) o Victor passa por canal privado (gerenciador de senhas), nunca no chat do grupo nem no repositório. Para testes com dados sintéticos, cada pessoa pode criar a própria chave do Gemini no Google AI Studio; na camada gratuita o Google usa o conteúdo para melhorar produtos, então **nada de dado real**.
3. Leia, nesta ordem: `README.md`, `CLAUDE.md`, `docs/plano-etapa-2.md`, `docs/rastreabilidade-professor.md` e `docs/adr/`.
4. Abra o Claude Code na pasta do repositório e comece com este pedido, trocando a frente:

   > Leia o CLAUDE.md, o docs/plano-etapa-2.md e o docs/CONTRIBUINDO.md. Minha frente é A3 (solução de IA: regras e ranking). Lembre que o protótipo está adiado. Antes de editar qualquer arquivo, explique em até 10 linhas o que vai fazer, quais arquivos vai tocar, quais ferramentas vai usar e como vai documentar, e espere o meu ok.

## 3. Como trabalhar com o Claude Code

- **Comece em modo plano** (no terminal, Shift+Tab; no aplicativo, o seletor de modo): o Claude propõe antes de editar, e você aprova.
- **Um pedido por tarefa**, ligado a uma issue ou a um item do plano. Peça sempre: "documente enquanto faz" e "rode os testes e diga o que passou".
- **Confira o que ele fez**: leia o diff (`git diff`), rode `make test` e `make lint`. A IA recomenda; você decide.
- **Use os subagentes** do projeto antes de abrir o PR: `revisor-professor` (olha como o professor), `seguranca`, `juridico-etica` e `ux`. Eles só leem e apontam problemas.
- **Nunca cole segredos ou dados reais** no chat do Claude.
- Se o Claude propuser algo que fere uma regra do `CLAUDE.md` (por exemplo, usar valor do plantão no ranking), recuse e explique.

## 4. Fluxo de Git (o mesmo para todos)

```
git switch main && git pull                  # sempre parta da main atualizada
git switch -c f1/dicionario-dados            # fN/tarefa-curta; N é a fase
# ... trabalhar, testar, documentar ...
git add <arquivos>                           # só o que é da tarefa
git commit                                   # mensagem em português, curta e clara
git push -u origin f1/dicionario-dados
gh pr create                                 # preencha o modelo do PR
```

- Commits pequenos. Testes antes de cada commit. Nunca push direto na `main`, nunca `git push --force` e nunca reescreva histórico.
- **Revisão:** outra pessoa da equipe revisa o PR (checklist do modelo); o **Victor faz o merge**. A CI precisa estar verde.
- Se a `main` andou: `git fetch && git merge origin/main` na sua branch, resolva conflitos e rode os testes.
- Nome de branch: `f1/...`, `f2/...` (fase do plano). Não crie `fase-1` e `fase-1/x` juntos: o Git não aceita.

## 5. Quem mexe em quê

| Frente | Pastas | Observação |
| --- | --- | --- |
| A1 Dados sintéticos | `data/synthetic/`, `docs/dados/` | Gerador com semente, dicionário de dados, qualidade |
| A2 Análise exploratória | `docs/analise/` | Estatísticas, correlações, padrões, análise textual, figuras |
| A3 Solução de IA: regras e ranking | `docs/solucao-ia.md` | Filtro de elegibilidade e jornada, baseline e modelo, protocolo de avaliação |
| A4 Solução de IA: LLM com Gemini | `docs/solucao-ia.md` (seção LLM) | Prompts, esquema de saída, guardrails, casos de injeção, fallback |
| A5 Segurança, ética e conformidade | `docs/seguranca-ameacas.md`, `docs/conformidade/` | STRIDE, textos oficiais das normas, ficha de risco, viés |

`apps/web/`, `n8n/`, `supabase/` e a API ficam **congelados** até o portão G-P (ADR 0004).

Arquivos compartilhados e de alto risco de conflito: `CLAUDE.md`, `docs/rastreabilidade-professor.md`, `docs/diario-de-bordo.md`, `docs/02-arquitetura-e-ferramentas.md`, `README.md`. Mexa neles só em PR pequeno e avise no grupo.

## 6. Documentar enquanto faz (obrigatório)

Todo PR leva a documentação junto; sem ela, não há merge.

- **Ficha do componente** no README da sua pasta, no modelo [docs/templates/ficha-componente.md](templates/ficha-componente.md): o que é, como funciona, como foi feito, código-chave, ferramentas e versões, por que esta e não outra, como rodar, testes, segurança, limites e uso de IA.
- **Comentários e docstrings** onde o porquê não é óbvio; contratos (SQL, Pydantic) comentados.
- **ADR** curto em `docs/adr/` para decisão não trivial.
- **Ferramenta nova**: linha em `docs/ferramentas-agentes.md` com versão, motivo, alternativa descartada e custo.
- **Diário de bordo**: uma linha com o que foi feito e o que foi pedido ao Claude (vira a seção "Uso de IA no desenvolvimento" do documento da entrega).
- **Rastreabilidade**: se o PR atende uma exigência do professor, atualize a linha em `docs/rastreabilidade-professor.md`.

## 7. Regras que não se negociam (resumo; vale o `CLAUDE.md`)

- Só dados sintéticos; nada com validade médica ou legal.
- A IA recomenda, o humano decide; ações relevantes vão para o `audit_log`.
- Código decide, o LLM redige; nome, CRM e telefone nunca vão ao LLM.
- Pagamento e valor do plantão **nunca** entram no ranking (o teste de neutralidade quebra a CI).
- Segredos fora do Git; números sintéticos rotulados como simulação, sempre com baseline.

## 8. Problemas comuns no Windows

| Sintoma | Causa e solução |
| --- | --- |
| `python` abre a Microsoft Store | Instale o Python 3.12 do python.org e desative o atalho em Configurações, Aplicativos, Aliases de execução |
| `make: command not found` | Instale com `choco install make` ou `scoop install make` e reabra o terminal |
| Script `.sh` falha com `\r` | O Git converteu para CRLF; o `.gitattributes` do projeto força LF, então rode `git add --renormalize .` e refaça o checkout do arquivo |
| Docker não sobe | Ative a virtualização na BIOS e o WSL 2; abra o Docker Desktop antes de `make up` |
| CI vermelha | Abra o log do job no PR; se for o teste de neutralidade, alguém colocou campo de pagamento ou atributo protegido no ranking |

Dúvida de escopo ou de regra: pergunte no grupo antes de construir. Dúvida de código: peça ao Claude para explicar o trecho e registre a resposta na ficha do componente.
