# Diário de bordo

Decisões e mudanças do dia, para os seis integrantes acompanharem. Registra também o uso de IA no planejamento do projeto (Gestão de Projetos com IA). Mais recente no topo.

## 28/10/2026 (terça): Fase 0, base do repositório

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
