# Plano: protótipo e Etapa 3 (02/11 a 17/11)

- **Status:** aprovado pelo Victor em 02/11/2026 e ajustado em 03/11 com a Aula 4 e o feedback da Etapa 2. **A construção começou em 03/11, só pela web** ([ADR 0007](adr/0007-web-sai-do-adiamento.md)): há uma página provisória em `apps/web`, e o banco está no projeto, com os dados sintéticos carregados, migrações, RLS e testes ([ADR 0008](adr/0008-banco-no-supabase.md)). O [servidor](../infra/README.md) está no ar desde 04/11, só para a apresentação ([ADR 0009](adr/0009-servidor-so-para-a-apresentacao.md)). A [API](../services/matching-api/app/api/README.md) entrou nele em 04/11, com o ok do Victor ([ADR 0010](adr/0010-api-de-matching.md)), e o [workflow da cascata](../n8n/README.md) também, conferido de ponta a ponta ([ADR 0013](adr/0013-aviso-da-api-inicia-a-cascata.md)). A [plataforma web](../apps/web/README.md) tem a fundação e a tela do coordenador, ainda em modo de demonstração ([ADR 0014](adr/0014-estrutura-da-plataforma-web.md)); falta a tela do médico e ligar a web à API.
- **Prazos:** aula e feedback da Etapa 2 em 03/11; **Entrega 3 em 07/11 (até 2,0)**; **apresentação final em 17/11 (até 4,0)**, com a plateia usando o sistema pelo celular.

## Ordem das atividades (alinhada em 05/11)

O que vem antes de quê, e por quê. As datas são metas. Esta tabela manda quando divergir dos marcos abaixo ou das datas das fases no [prompt de frontend](design/prompt-frontend.md), que foram escritas antes de a API, o servidor e a cascata tomarem o tempo de 04/11.

| # | Atividade | Quem | Até | Por que nesta ordem |
| --- | --- | --- | --- | --- |
| 1 | Tela do coordenador: nova vaga, sugestões com motivo e decisão (`f3/web-coordenador`) | Claude Code; Victor aprova | 05/11 | O teste de usabilidade e a seção de experiência da Entrega 3 dependem dela |
| 2 | Entrevistas com coordenadores e plantonistas | Colegas; Victor confirma com o professor | 06/11 | Os números calibram o simulador e entram no documento |
| 3 | Teste de usabilidade da tarefa do coordenador, no link público | Colegas | 06/11 | Só existe com a tela pronta. As tarefas do médico ficam para depois da tela dele, e o documento diz isso |
| 4 | Teste contra a concentração das ofertas e Gemini com a chave real (Gemini medido em 05/11, com o modelo escolhido) | Claude Code; chave do Victor, na camada gratuita | 07/11 | O documento hoje declara os dois como pendentes; o que der tempo vira resultado, o resto continua declarado |
| 5 | Corrigir e fechar a Entrega 3, com os resultados de 2 a 4 | Claude Code redige; Victor revisa e autoriza o PR | 07/11 | É a entrega de maior prazo imediato (até 2,0) |
| 6 | Tela do médico e adaptador `live`, que liga a web à API e à cascata (`f3/web-medico`) | Claude Code; Victor decide as divergências do [ADR 0014](adr/0014-estrutura-da-plataforma-web.md) | 10/11 | Sem o `live`, a demonstração não chama a API nem o n8n |
| 7 | Telão, QR code, contestação, plano B, teste de carga e reinício do servidor | Claude Code; Victor decide o prazo curto da cascata | 13/11 | É a experiência da plateia. **Código congelado em 13/11.** Ordem de corte em M4 |
| 8 | Ensaio e pitch, com o roteiro da aula de 10/11. A chave do Gemini só entra no servidor aqui ([passo a passo](../infra/README.md)) | Grupo | 17/11 | Apresentação final (até 4,0) |

**Só o Victor pode fazer:** confirmar com o professor que as entrevistas seguem como atividade da disciplina; ligar o MFA do n8n e conferir que a renovação do servidor ficou desligada; decidir o prazo curto da demonstração (recomendação: 2 min; a rede simulada usa 60); rodar `usuarios-de-teste.py limpar` e `remover` antes de 17/11.

## Contexto

A Etapa 2 foi entregue com uma PoC por linha de comando. Em 02/11 não havia interface, API HTTP, banco nem cascata: `apps/web`, `supabase/migrations` e `n8n/workflows` só tinham `.gitkeep`. Este plano transforma o motor em um produto navegável. A validação da Etapa 3 corre em paralelo, porque o teste de usabilidade precisa da tela funcionando.

**Contas (decisão do Victor):** Supabase, Vercel e Hostinger novas, só deste projeto. Contas de outros projetos não são usadas nem tocadas.

**A Hostinger é necessária?** Sim. O n8n e a API precisam de um servidor ligado o tempo todo, e a Vercel não atende bem nenhum dos dois. Em 04/11 o Victor pediu para tirar tudo da máquina local, então o servidor já existe, e a API e o n8n nascem nele. Ele vale só para a apresentação; depois, o Victor para tudo ([ADR 0009](adr/0009-servidor-so-para-a-apresentacao.md)).

**Divisão de trabalho (proposta; o Victor pode ajustar):** Victor e Claude Code constroem; os colegas ficam com entrevistas, teste de usabilidade e pitch.

## Arquitetura

| Camada | Tecnologia | Onde | O que faz |
| --- | --- | --- | --- |
| Web | Next.js 16, Tailwind, shadcn/ui | Vercel | Telas do coordenador e do médico, trilha e telão |
| Dados | Postgres, Auth, RLS, Realtime | Supabase (São Paulo) | Fonte da verdade; login anônimo da plateia |
| Motor | FastAPI sobre o motor atual | VPS Hostinger (Compose e Traefik) | Extrai, filtra, ranqueia, explica, aprova |
| Orquestração | n8n | Mesma VPS | Só espera e chama a API; não decide |
| LLM | Gemini, com reserva em regras | Google | Só extrai e reescreve; sem ferramentas nem segredos |

A web lê direto do Supabase sob RLS. Toda escrita com regra passa pela API. A chave de serviço fica só no servidor.

## Marcos

Uma branch e um PR por item, CI verde, e nenhum merge sem o ok do Victor. As datas são metas e dependem de as contas chegarem até 03/11.

### M0, assim que as contas chegarem: fundação

- **Clone em `C:\dev\handson_plantaoseg` (feito em 03/11).** O OneDrive atrapalha `node_modules` e `.next`, e o [guia da equipe](CONTRIBUINDO.md) já pede isso. A pasta atual fica intacta; `docs/aulas/` é copiada à mão, pois não está no Git.
- **`f3/web-base`:** [ADR 0007](adr/0007-web-sai-do-adiamento.md), página provisória, ajuste da Vercel e job de CI da web. Atualiza `CLAUDE.md`, `docs/02`, `docs/CONTRIBUINDO.md` e `.env.example`. A decisão de manter as regras em Python em vez de funções SQL está no [ADR 0008](adr/0008-banco-no-supabase.md).
- **`f3/banco-supabase`, aplicado em 03/11** ([ficha](../supabase/README.md), [ADR 0008](adr/0008-banco-no-supabase.md)):
  - Migrações a partir do [dicionário de dados](dados/dicionario-de-dados.md) v0.2, mais `profiles`.
  - `audit_log` só de inserção, com hash encadeado em gatilho.
  - RLS por organização e papel; `shift_compensation` sem nenhum acesso público.
  - `seed-db`, em `f3/seed-banco`, carregado em 04/11: carrega os dados sintéticos deslocados em semanas inteiras, para o histórico terminar perto da data da demo. Preserva os dias da semana e não muda nenhuma métrica publicada. `doctors_latent` não vai para o banco.
  - Job novo de CI com Supabase CLI e pgTAP: o GitHub tem Docker, a máquina local não precisa.

### M1, até 05/11: fluxo de ponta a ponta

- **`f3/api-matching`, no servidor desde 04/11** ([ficha](../services/matching-api/app/api/README.md), [ADR 0010](adr/0010-api-de-matching.md)): FastAPI em `services/matching-api/app/api/`, com Pydantic, validação do JWT do Supabase e rotas internas protegidas por segredo. Uma camada de repositório monta o `Dataset` a partir do Postgres. A CLI e o núcleo continuam funcionando só com biblioteca padrão.
- **`f3/web-coordenador`, em PR em 05/11** ([ficha](../apps/web/README.md)): telas 1 a 3 dos [wireframes](wireframes/README.md) (vaga em texto livre e conferência; top 5 com motivo e alertas; excluídos com a regra), com os estados de erro já listados lá. Roda no modo de demonstração; a ligação com a API vem no adaptador `live`.
- **`f3/web-medico`:** tela 4 (oferta com motivo, aceitar ou recusar) e a trilha de auditoria.
- **`f3/cascata-n8n`, publicado no servidor em 04/11** ([ficha](../n8n/README.md), [ADR 0013](adr/0013-aviso-da-api-inicia-a-cascata.md)): workflow em JSON que só espera e chama `POST /internal/cascade/{id}/advance`. A API avisa o n8n uma vez por vaga, no clique do coordenador.

### M2, até 07/11: no ar e validado

- **`f3/deploy`:** web na Vercel (projeto já criado em 03/11). O n8n já está no servidor, com versão fixada (`f3/servidor-hostinger`). A API entra com HTTPS pelo Traefik, no PR dela.
- Teste de usabilidade com 3 a 5 pessoas no link real, e a Entrega 3 (abaixo).

### M3, de 08 a 13/11: demo com a plateia

QR code com login anônimo e persona sorteada, telão em tempo real, contestação completa, limite de requisições, aviso "não digite dados reais", plano B (respostas pré-carregadas e vídeo) e teste de carga. **Código congelado em 13/11.**

### M4, de 14 a 17/11: ensaio e pitch

Ensaio completo com o roteiro da aula de 10/11. Se o prazo apertar, a ordem de corte é: telão, contestação, persona sorteada. Segurança e regras nunca entram no corte.

**Fora do plano, salvo se sobrar tempo:** Telegram, check-in e pagamento, kit da Comissão de IA e Langfuse.

## Etapa 3 em paralelo

**Checkpoint de 03/11 feito:** os slides e o feedback da Etapa 2 estão na [rastreabilidade](rastreabilidade-professor.md) (A4-1 a A4-12 e FB2-1 a FB2-4). A entrega é um documento de **8 a 12 páginas**, com métricas numéricas e sem achismos, que amarra problema e solução em seis áreas:

| Área | O que o professor pergunta | O que vamos mostrar |
| --- | --- | --- |
| **Critérios de sucesso (o centro)** | Como saberemos, depois de 6 meses, se o projeto deu certo? | Metas numéricas com linha de base e limiar de decisão aos 6 meses |
| Resultado técnico | O que foi desenvolvido, como funciona, resultados, métricas e limitações | Motor e protótipo, métricas contra o baseline, análise de sensibilidade e curva de aprendizado |
| Resultado para o negócio | Problema, benefício, KPI impactado e como medir o ROI | Caso de negócio com ROI em faixa, a partir de números das entrevistas |
| Experiência | Como o usuário utilizará, jornada e protótipo ou interface | Jornadas do coordenador e do médico, protótipo e teste de usabilidade |
| Segurança e ética | Riscos, privacidade, segurança, vieses, aspectos legais e responsabilidades | Matriz de riscos, mitigação da concentração medida e pendências jurídicas |
| Implantação | Arquitetura, infraestrutura, integração, roadmap, recursos, custos e próximos passos | Como os dados são coletados, atualizados e integrados; piloto em modo sombra; roadmap e custos |

| Frente | O que sai | Quem | Meta |
| --- | --- | --- | --- |
| Evidência do mundo real (FB2-1) | Agregados públicos comparados às premissas do simulador; tabela "premissa contra entrevistas"; análise de sensibilidade; desenho do piloto em modo sombra | Claude Code prepara; colegas coletam | Agregados públicos, sensibilidade e piloto prontos em 03/11 ([resultado](resultados/metricas-robustez.md)); a tabela com as entrevistas fica para 06/11 |
| Dicionário concreto (FB2-2) | Tabela com nome, tipo, descrição e valores possíveis, gerada dos dados e com teste de sincronia | Claude Code | Feito em 03/11 ([exemplo](dados/dicionario-exemplo.md)) |
| Dados em produção (FB2-3) | Como cada dado é coletado, atualizado e integrado, com responsável e regra de qualidade | Claude Code; Victor revisa | Feito em 03/11 ([documento](dados/dados-em-producao.md)) |
| Caso de negócio (A4-3) | KPI impactado e ROI em faixa, a partir das entrevistas | Claude Code; Victor revisa | 06/11 |
| Critérios de sucesso (A4-7) | Metas numéricas e limiar de decisão aos 6 meses | Victor e Claude Code | 06/11 |
| Entrevistas | Roteiro com os números que calibram o simulador, revisão de recomendações por coordenadores, consentimento e registro anonimizado; 3 a 5 coordenadores e 3 a 5 plantonistas (promessa da Entrega 1) | Claude Code prepara; colegas entrevistam | Roteiro pronto em 03/11 ([kit](entrevistas/LEIAME.md)); entrevistas até 06/11 |
| Concentração | Experimento com rodízio e limite de ofertas em `app/flow.py`, medindo o custo em tempo e na chance de sucesso; a política escolhida vai para a API | Claude Code | 05/11 |
| Gemini real | Executar o [teste manual](teste-manual-gemini.md) com chave | Claude Code, com a chave do Victor | 05/11 |
| Modelo | Comparar a regressão logística com LightGBM, como o documento da Etapa 2 prometeu | Claude Code | 06/11 |
| Previsão de vagas | Baseline simples para a meta de recall 0,7, com resultado honesto mesmo se não atingir | Claude Code, se sobrar tempo | 06/11 |
| Documento | `docs/04-entrega-3-validacao.md` e PDF de 8 a 12 páginas, com as seis áreas | Claude Code redige; Victor revisa | 07/11 |

## O que depende do Victor

Quando as contas existirem, o Victor avisa; o clone novo e um `.env` vazio são criados, e ele cola as chaves lá. **Chaves nunca vão para o chat nem para o Git.**

- **Até 03/11:**
  - **Feito em 03/11:** conta Supabase e projeto `plantaoseguro` em **South America (São Paulo)**, porque a região não muda depois. As chaves incluem a conexão do pooler de sessão (IPv4).
  - Chave do Gemini no Google AI Studio.
  - Slides e feedback da aula; convite aos colegas (hoje só o Victor tem acesso ao repositório).
- **Feito em 03/11:** conta Vercel. O GitHub do projeto se ligou direto a ela, então a publicação sai pela integração da Vercel, sem precisar do GitHub Actions.
- **Até 04/11, antes da primeira entrevista:** confirmar com o professor que as conversas podem seguir como atividade da disciplina ([kit](entrevistas/kit-do-entrevistador.md), seção 3).
- **Feito em 04/11:** Hostinger KVM 1, por 1 mês, com acesso SSH por chave ([ADR 0009](adr/0009-servidor-so-para-a-apresentacao.md)). O script de proteção já rodou. Falta o Victor conferir no painel que a renovação ficou desligada.

**Custo estimado em novembro:** Supabase e Vercel gratuitos (o Supabase Free aceita 200 conexões em tempo real e pausa após 1 semana parado), KVM 1 por R$ 52,99 no mês (carrinho de 04/11; sem desligar a renovação, passa a R$ 87,99 por mês) e Gemini de graça, na camada gratuita e sem faturamento (decisão do Victor em 05/11).

## O que se reaproveita

- `app/pipeline.py` (`recommend` e `approve`), `app/llm/extraction.py` (`extract`), `app/explain.py`, `app/rules.py` e `app/llm/guardrails.py`.
- `app/ranking/compute.py` (`FeatureStore`), `app/ranking/model.py` (`LogisticModel.from_dict`) e `app/models.py` (`Dataset`).
- `app/audit.py`: a trilha em banco mantém a mesma interface de `append`, para o pipeline não mudar.
- `app/flow.py`, `app/docbuild.py` e `scripts/gerar-pdf.sh` para a Entrega 3.
- `docs/wireframes/`, `infra/docker-compose.yml` e `docs/teste-manual-gemini.md`.

## Regras que continuam valendo

Só dados sintéticos; sem o clique do coordenador não sai oferta; nome, CRM e telefone nunca vão ao LLM; pagamento fora do ranking; n8n não decide; segredos fora do Git; números sempre rotulados como simulação. Cada componente novo ganha ficha, e o diário e a rastreabilidade acompanham cada PR.

## Verificação

- **Motor e API:** `pytest` e `ruff`; os testes atuais continuam passando, com testes novos de rotas, injeção pela API e "sem aprovação não há oferta".
- **Banco:** pgTAP na CI: hospital A não lê hospital B; médico só vê as próprias ofertas; `shift_compensation` inacessível; `audit_log` recusa UPDATE e DELETE; a cadeia de hash acusa adulteração.
- **Neutralidade:** o teste atual é estendido para provar que o caminho da API não lê valor de plantão.
- **Web:** `tsc`, lint e `next build` na CI; conferência visual no navegador; Playwright percorrendo a jornada inteira.
- **M1 pronto quando:** o coordenador digita o pedido, confere os campos, vê o top 5 e os excluídos e aprova; o médico recebe a oferta com o motivo; se recusar ou deixar expirar, o próximo recebe; alguém aceita, a vaga fecha e a trilha mostra tudo com a cadeia íntegra.
- **Antes de 13/11:** ensaio completo em celulares reais e teste de carga.

## Riscos

| Risco | Resposta |
| --- | --- |
| Prazo curto para web, API, banco, n8n e documento | Ordem de corte definida; a tela do coordenador vem antes de tudo |
| Contas chegarem depois de 04/11 | O M1 encurta; a área Experiência da Etapa 3, que pede protótipo ou interface, e o teste de usabilidade passam a usar os wireframes |
| Entrevistas não acontecerem até 07/11 | Teste de usabilidade com colegas e conhecidos, com a limitação dita no documento |
| Entrevistas dependerem de comitê de ética | O Victor confirma com o professor antes da primeira; se não puderem seguir no prazo, ficam os agregados públicos e a análise de sensibilidade, com a limitação dita no documento |
| Serviço externo cair ao vivo | Fallback em regras, respostas pré-carregadas e vídeo |
| Plateia digitar dado real | Aviso na tela; a plateia não alcança a leitura da vaga, a única etapa que vai ao Gemini, e a chave sai do servidor se isso mudar |
| Disco apertado na máquina local | Sem Docker local; imagens só na VPS e na CI |
