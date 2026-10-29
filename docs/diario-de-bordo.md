# Diário de bordo

Decisões e mudanças do dia, para os seis integrantes acompanharem. Registra também o uso de IA no planejamento do projeto (Gestão de Projetos com IA). Mais recente no topo.

## 28/10/2026 (quarta), mais tarde: LLM vira Gemini e protótipo adiado (plano v2)

**Decisões do Victor**

- O LLM **do produto** passa a ser o **Gemini**, não o Claude ([ADR 0003](adr/0003-llm-do-produto-gemini.md)). O Claude Code segue como ferramenta de desenvolvimento do grupo.
- O **protótipo não será construído ainda** ([ADR 0004](adr/0004-prototipo-adiado.md)). A Etapa 2 começa por Dados, Análise e Solução de IA; a forma da PoC é decidida no portão G-P.

**O que foi feito**

- Modelos, preços, saída estruturada, SDK e termos de dados do Gemini conferidos nas páginas oficiais do Google (28/10/2026). Achado importante: na camada **gratuita** o Google usa o conteúdo para melhorar produtos e revisores humanos podem lê-lo; como a plateia digita texto livre na demo, a demo usa a camada **paga**.
- Atualizados `docs/02` (ferramentas, custo de US$ 36–42 para US$ 34–41, riscos, plano de construção), README, `.env.example` (`GEMINI_API_KEY` e IDs dos modelos), subagente `engenheiro-ia`, `CLAUDE.md` (regra "protótipo adiado" para os Claude Codes dos colegas), guia da equipe, rastreabilidade e a CI (padrão de chave `AIza...`).
- Plano da Etapa 2 reescrito (versão 2): frentes A1 a A5, portão G-P e três opções de PoC.

**Risco registrado:** a PoC é um dos 4 entregáveis do professor; sem artefato executável até 31/10 a nota da Etapa 2 sofre.

**Uso de IA:** o Claude conferiu a documentação do Gemini e redigiu os ADRs e o plano v2; o Victor decide. A leitura das páginas do Google foi feita por uma ferramenta de busca e resumo, então IDs e preços devem ser reconferidos ao implementar.

## 28/10/2026 (quarta), à noite: documentação contínua, equipe e plano da Etapa 2

**Pedido do Victor:** documentar tudo enquanto se faz (código, como foi feito, ferramentas), explicar cada passo antes de executar para ele aprovar, preparar a entrada dos 5 colegas (cada um com Claude Code) e montar o plano da Etapa 2.

**O que foi feito**

- A CI do PR #1 passou nas 4 verificações no GitHub (segredos, ruff e pytest, neutralidade econômica e Compose): é a primeira evidência real de pytest, ruff e `docker compose config`.
- Política de documentação contínua no `CLAUDE.md`, com ficha do componente ([modelo](templates/ficha-componente.md)) e itens novos no modelo de PR.
- [Guia de entrada da equipe](CONTRIBUINDO.md) e [plano da Etapa 2](plano-etapa-2.md) com 6 frentes, portões de aprovação (G0 a G4) e metas com linha de base. Plano é **proposta**, aguardando o Victor.
- Nome de branch passou de "uma por fase" para "uma por tarefa com prefixo da fase" (`f1/...`), porque seis pessoas trabalham em paralelo e o Git não aceita `fase-1` e `fase-1/x` juntos.
- Correção: o dia 28/10/2026 é quarta-feira (a entrada abaixo dizia terça).

**Estado do repositório no GitHub:** público; `main` sem proteção; só o Victor é colaborador. Pendências do Victor: convidar os colegas e proteger a `main`.

**Uso de IA:** o Claude redigiu o guia, o plano e a política de documentação; o Victor aprova ou ajusta.

## 28/10/2026 (quarta): Fase 0, base do repositório

**Quem fez:** Victor, com o Claude Code (modelo Sonnet 5.5) como parceiro de engenharia.

**O que aconteceu**

- Repositório clonado em `handson_plantaoseg`; branch `fase-0-base` aberta a partir da `main` (commit `d38ff27`).
- Lidos: README, Entrega 1, arquitetura, slides das aulas de 20/10 e 27/10, o prompt inicial e o kickoff.
- Feedback do professor sobre a Entrega 1 salvo na íntegra e transformado em linhas de rastreabilidade (FB-1 a FB-5), mais as exigências dos slides de 27/10 (A3-1 a A3-13).
- Criadas as decisões [ADR 0001](adr/0001-segmento-inicial.md) (segmento inicial) e [ADR 0002](adr/0002-escopo-da-poc.md) (escopo da PoC); ambas aguardam confirmação do grupo.

**Descobertas**

- O professor pede quatro entregáveis na Etapa 2: **Dados, Análise, Solução de IA e PoC**. O prompt inicial não previa "Análise" como seção própria; foi incluída.
- O professor exige uma seção curta de **Cybersecurity** (dados, dados pessoais, onde ficam, quem acessa, ameaças e proteções).
- Ambiente da máquina do Victor: sem Docker, Node, make, Supabase CLI e ffmpeg; o Python de `C:\Python312` está incompleto (sem biblioteca padrão nem pip). Nada disso pôde ser executado hoje. A CI do GitHub passa a ser a evidência de testes até o ambiente local ser instalado.
- O vídeo da aula de 27/10 não foi processado por falta de ferramentas.
- A Entrega 1 (seção 15) ficou com o marcador `[preencher papéis do grupo]` sem preencher; não alteramos o documento já entregue.

**Uso de IA no planejamento:** o Claude propôs o recorte do segmento (ADR 0001) e a divisão núcleo/apoio/evolução (ADR 0002) a partir do feedback; o grupo confirma ou ajusta.

**Pendências para o grupo**

- Confirmar os ADRs 0001 e 0002.
- Instalar Docker Desktop, Node LTS, Python 3.12, Supabase CLI e make (ver `make doctor`).
- Colar as anotações da aula de 27/10, ou liberar a instalação de ffmpeg e Python para transcrever o vídeo.
