# Diário de bordo

Decisões e mudanças do dia, para os seis integrantes acompanharem. Registra também o uso de IA no planejamento do projeto (Gestão de Projetos com IA). Mais recente no topo.

> **Nota de 31/10/2026 (Victor).** O trabalho deste projeto foi feito **em conjunto** entre o Victor e o Claude Code, e nem tudo foi feito pela IA: a sugestão dos dados partiu do Victor. As linhas de "Uso de IA" abaixo descrevem o apoio da IA em cada dia; não significam que tudo foi escrito por ela.

## 31/10/2026 (sábado), versão 2 do documento da Entrega 2

**Pedido do Victor:** conferir o que o feedback do professor pediu e se o documento é coerente com o pedido da Entrega 2; depois, melhorar muito o documento, preparar a nova versão para a entrega de hoje e deixar descrito que a sugestão dos dados foi dele e que o trabalho foi feito em conjunto.

**O que o batimento achou**

- **Metas:** das seis metas da Entrega 1, duas (antecedência e aceitação pelo coordenador) tinham sumido da tabela; a linha de base da jornada estava "n/d" apesar de medida (1,3%); o recall estava "Reformulada" sem dizer para quê.
- **Dica 1 do professor:** o documento não citava nenhuma das quatro dores da Entrega 1 (a rastreabilidade dizia que sim).
- **Ética:** só duas das quatro perguntas de Direito e Ética estavam respondidas de forma explícita, e faltava dizer que diagnóstico e prontuário ficam fora.
- **Normas:** faltavam, no PDF, a vigência de cada uma e a lista de pendências para o jurídico.
- **Concentração:** o documento só comparava o modelo com o baseline heurístico (61,2%); o processo manual simulado tem 31,1%. O modelo concentra mais.
- **Afirmações sem lastro:** "LightGBM e scikit-learn não mostraram ganho" (nunca foram testados); "71,2% com e sem a carga recente" (o código diz 71,2% sem e 71,3% com); a legenda da figura do fluxo dizia que só as etapas 2 a 6 rodam (rodam as 8).

**O que foi feito**

- `app/flow.py` e `make flow`: o fluxo recomendado contra o processo manual simulado (tempo, ofertas, antecedência e concentração), com as mesmas premissas de tempo do gerador, testes (176 no total) e uma etapa na CI. Resultado em simulação: tempo médio de 110 para 47 min (57% a menos), com 72% do ganho vindo do filtro de regras; antecedência +4,1 pontos (a meta de +20 é inalcançável sem prever vagas); concentração **piora** (31,1% para 50,7%, e até 82% se a cascata seguir a ordem).
- Documento reescrito, com 7 páginas: resumo e cartões de resultado, quatro dores, mapa do feedback, variáveis, "da análise à decisão", "por que IA e onde não" com o que se mediu, normas com vigência, quatro perguntas de ética, metas com linha de base e autoria em conjunto. O conversor ganhou cartões, caixas de destaque, figuras lado a lado e rodapé com páginas.
- Corrigidas as afirmações sem lastro, em `docs/03`, `docs/solucao-ia.md` e na ficha do componente. Novas linhas de rastreabilidade (`PI-`) para o que o professor valoriza nas aulas de 06/10 e 20/10.

**Uso de IA:** o trabalho foi feito em conjunto. O Victor pediu o batimento e definiu o rumo (melhorar o documento e deixar clara a autoria); a sugestão dos dados partiu dele. O Claude Code mediu, testou, redigiu e corrigiu. Os números novos saem de `docs/resultados/metricas-fluxo.json`.

## 30/10/2026 (sexta), merge dos PRs e tag `etapa-2`

**Pedido do Victor:** "Merge e tag": mergear os PRs #1, #2 e #3, nessa ordem, com commit de merge (não squash), conferindo a CI de cada um, e criar a tag `etapa-2` na `main`.

**O que foi feito**

- PR #1 (`518a230`), PR #2 (`4129c58`) e PR #3 (`9bfb67a`) mergeados, cada um com a CI verde antes do merge (4, 4 e 5 verificações).
- Tag anotada `etapa-2` no commit `9bfb67a`. A árvore da `main` é idêntica à da branch do PR #3, que passou nos 5 checks.
- Este PR (`f2/status-pos-merge`) só corrige o texto de status que ficou desatualizado: `CLAUDE.md`, plano da Etapa 2 e guia de postagem.

**CI da `main`:** estava na fila logo após o merge; conferida depois, as três execuções (`518a230`, `4129c58` e `9bfb67a`) terminaram com sucesso.

**Pendências do Victor:** envio no Moodle; aceite dos 3 convites e convite dos 2 colegas restantes; proteção da `main` (só com o ok dele); validação jurídica das normas; teste do Gemini com chave; vídeo da aula não transcrito.

**Uso de IA:** o Claude Code (Sonnet 5.5) executou os merges e a tag a pedido explícito do Victor, conferindo a CI antes de cada merge.

## 30/10/2026 (sexta), execução: PoC mínima e documento da Etapa 2

**Pedido do Victor:** "faça os dois, execute e documente tudo para postagem da etapa 2" (PoC mínima executável e o material da opção sem executável).

**O que foi feito**

- PoC mínima em Python de biblioteca padrão: gerador de dados, regras de jornada, variáveis sem vazamento, baseline e regressão logística, explicação, extração com guardrails, trilha com hash e CLI (ADR 0005). Testes e lint passam; a CI roda a PoC em Linux e reproduz os checksums dos dados da máquina do autor.
- Material de especificação: solução de IA, exemplo trabalhado, wireframes, ameaças e ficha de risco, plano do teste manual do Gemini.
- Documento da Etapa 2 em Markdown e PDF de 6 páginas, com guia de postagem.
- Dicionário de dados passou a v0.2 (ajustado ao que foi construído).

**Resultados (simulação):** o modelo ganha 3,5 pontos percentuais sobre o baseline no top-5 (71,2% contra 67,7%; oráculo 75,8%); os 10% mais recomendados ocupam 50,7% dos lugares; zonas distantes quase não são recomendadas.

**Achados que mudaram decisões**

- A primeira simulação não tinha violações de jornada no histórico manual; foram acrescentadas as "dobras" e a taxa medida foi de 1,3%.
- O modelo dava peso positivo à carga recente (confundimento) e a explicação citava "fez 9 plantões" a favor do candidato. Experimento: sem a variável o top-5 não muda (71,2%). Ela virou alerta de jornada.
- O texto ambíguo do gerador errava o período; a extração não reconhecia "ter" como terça-feira.
- **Normas:** o texto oficial da Res. 2.462 traz aviso de suspensão judicial integral (a Entrega 1 a trata como em vigor); a Res. 2.460 cita plataformas digitais; a classificação de risco da 2.454 deve ser reavaliada de baixo para médio. Tudo a validar com jurídico.

**Pendências:** merge dos PRs #1 a #3 e tag `etapa-2` (Victor); envio no Moodle; teste do Gemini com chave; vídeo da aula não transcrito; convites dos colegas ainda pendentes.

**Uso de IA:** o Claude Code (Sonnet 5.5) escreveu código, testes e documentos; as decisões de escopo foram do Victor. O Gemini não foi exercitado.

## 30/10/2026 (sexta): segmento ajustado para pronto-socorro de hospitais privados

**Decisão do Victor:** o segmento da PoC passa de "UPA e pronto-socorro" para **pronto-socorro de hospitais privados**; seguem plantão noturno de 12 h, fim de semana, clínica médica e pediatria.

**O que mudou:** [ADR 0001](adr/0001-segmento-inicial.md), `CLAUDE.md`, plano da Etapa 2, rastreabilidade (FB-1), subagente `engenheiro-dados` e o [dicionário de dados](dados/dicionario-de-dados.md), que passa a v0.1 (rede de hospitais privados, unidades `PS` com `ownership = privado`, nomes e exemplo fictícios).

**Correção de honestidade:** o ADR dizia que noite e fim de semana "são os que mais ficam descobertos"; não há dado para afirmar isso. Passou a **hipótese a validar nas entrevistas**.

**A lembrar no `docs/03`:** a evidência pública da Entrega 1 (Canoas) é de unidade municipal; para hospitais privados a evidência é a da Flexzo (alegação da empresa) e as entrevistas, ainda por fazer. A contratação de médicos em hospital privado é ponto sensível: validar com jurídico.

**Estado do GitHub em 30/10:** PRs #1 e #2 abertos com a CI verde, `main` só com a Entrega 1, 3 convites pendentes de aceite. Não há decisão registrada para os portões G1 (dicionário) e G-P (forma da PoC) do plano.

**Uso de IA:** o Claude aplicou a troca nos documentos e apontou a frase sem base; o Victor decide.

## 28/10/2026 (quarta), G0 aprovado

**Decisão do Victor:** aprovou o plano v2 e os ADRs 0001 a 0004 (segmento inicial, escopo da PoC, Gemini e protótipo adiado) e pediu o dicionário de dados v0 na branch `f1/dicionario-dados`.

**Ainda pendente do G0 (ações do Victor):** merge do PR #1, convites aos colegas, proteção da `main`, usuários do GitHub e donos das frentes A1 a A5, chave do Gemini. Eu não faço merge nem mexo em configurações do GitHub sem o ok explícito.

**Feito:** [dicionário de dados v0](dados/dicionario-de-dados.md) na branch `f1/dicionario-dados`, aguardando o G1. Define 11 tabelas do núcleo, o papel de cada coluna (ranking, auditoria de viés, restrito econômico, dado pessoal simulado), as 9 variáveis do ranking idênticas ao `features.py`, as premissas do simulador, as regras de qualidade e 8 decisões para o Victor.

**Convites no GitHub (28/10):** 3 pendentes de aceite e 2 colegas ainda sem convite.

**Uso de IA:** o Claude redigiu o dicionário a partir de `docs/02`, do ADR 0001 e do `features.py`; os parâmetros do simulador são premissas dele, sem fonte, e o Victor decide no G1.

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
