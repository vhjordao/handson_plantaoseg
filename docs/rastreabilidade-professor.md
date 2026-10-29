# Rastreabilidade: exigências do professor

Prova de que nenhum pedido do professor foi ignorado. Cada linha tem origem, tipo, status e onde está no repositório. Atualizada a cada feedback ou aula (ver a skill `incorporar-feedback-professor`).

**Tipos:** obrigatório (exigido no roteiro da etapa), sugestão (o professor usa "recomendo" ou "talvez seja legal"; adotamos salvo conflito) e ambíguo (precisa de leitura razoável, registrada na observação).
**Status:** feito, em andamento, pendente, mantido (ponto positivo a preservar) e bloqueado.

Fontes: `FB-` = feedback da Entrega 1 ([docs/feedback/2026-10-27-etapa-1.md](feedback/2026-10-27-etapa-1.md)); `A3-` = slides da aula de 27/10 (`HandsOn_IA_Negocios_Aula3.pdf`, fora do Git em `docs/aulas/`).

## Feedback da Entrega 1 (27/10)

| ID | Exigência | Tipo | Status | Onde no repositório | Observação |
| --- | --- | --- | --- | --- | --- |
| FB-1 | Definir o segmento inicial (um tipo de hospital, uma especialidade ou um perfil de escala) para a primeira versão ser viável e mensurável | sugestão | em andamento | [ADR 0001](adr/0001-segmento-inicial.md) | Leitura adotada: rede de urgência (UPA e pronto-socorro), plantão noturno de 12 h e fim de semana, 2 especialidades. Aceita pelo Victor no G0 (28/10); o grupo pode pedir revisão. Afeta o gerador de dados (frente A1) |
| FB-2 | Separar funcionalidades essenciais das complementares; priorizar na PoC (1) recomendação de profissionais elegíveis e (2) explicação das recomendações; o resto é evolução futura | sugestão | em andamento | [ADR 0002](adr/0002-escopo-da-poc.md) | Conflito parcial com o roteiro de demo do kickoff (7 passos). Resolução: o núcleo é o que se mede e documenta; cascata, check-in, pagamento, contestação e telão entram só depois do núcleo e aparecem no documento como apoio ou evolução |
| FB-3 | Justificar as metas com uma linha de base e ajustá-las aos dados disponíveis (tempo de preenchimento -50% e recall >= 0,7) | sugestão | pendente | `docs/03-entrega-2-prova-de-conceito.md` (seção "Metas e linha de base"; a criar) | Sem entrevistas ainda, a linha de base manual é hipótese rotulada. Na PoC, a linha de base mensurável é o ranking heurístico contra o modelo, em dados sintéticos. O recall 0,7 era da previsão de vagas (Etapa 3); reformular por indicador |
| FB-4 | (Para pensar) Conferir os textos oficiais vigentes das normas, a interpretação das obrigações para a plataforma e os requisitos que dependem de análise jurídica | sugestão | pendente | [docs/conformidade/](conformidade/README.md) | Entrega 1 tem PDF oficial do CFM para as Res. 2.460 e 2.462, mas só notícias para a 2.454. Nada afirmado sem fonte; sempre "validar com jurídico" |
| FB-5 | Pontos positivos a preservar: explicabilidade, contestação e auditabilidade como diferencial; riscos e governança; dados sintéticos; indicadores objetivos | mantido | mantido | `CLAUDE.md`, regras inegociáveis | Nenhuma ação além de não regredir |

## Aula de 27/10: Etapa 2 (slides)

| ID | Exigência | Tipo | Status | Onde no repositório | Observação |
| --- | --- | --- | --- | --- | --- |
| A3-1 | A entrega tem 4 entregáveis: Dados, Análise, Solução de IA e PoC/Protótipo | obrigatório | pendente | `docs/03-entrega-2-prova-de-conceito.md` | O prompt inicial não previa "Análise" como seção própria; incluída |
| A3-2 | Dados: dataset(s), origem, dicionário, volume, variáveis, qualidade e tratamento (ou justificar a ausência) | obrigatório | em andamento | [Dicionário de dados v0](dados/dicionario-de-dados.md); `data/synthetic/` (gerador, frente A1) | Dicionário v0 aguarda o G1; gerador, volume real e relatório de qualidade vêm depois |
| A3-3 | Análise: o que foi produzido no "discovery" dos dados (estatísticas, visualizações, correlações, padrões, segmentações, análise textual) | obrigatório | pendente | relatório de análise exploratória dos dados sintéticos, incluindo as vagas em texto livre | Fase 1 e 2 |
| A3-4 | Solução de IA explicada em detalhe: entrada, processamento de IA, saída e usuário | obrigatório | pendente | `docs/03`, seção "Solução de IA" | Fluxo já esboçado em `docs/02` |
| A3-5 | PoC ou protótipo com os principais elementos (API, interface, fluxo automatizado, sistema de recomendação) | obrigatório | adiado | [ADR 0004](adr/0004-prototipo-adiado.md), [plano](plano-etapa-2.md) (portão G-P) | Construção adiada por decisão do Victor em 28/10. A forma da PoC (P1 a P3) é decidida no G-P, até 29/10 à noite. **Risco:** é um dos 4 entregáveis do professor; sem artefato executável a nota da Etapa 2 sofre |
| A3-6 | Cybersecurity como requisito obrigatório, em seção curta: quais dados, dados pessoais, onde ficam, quem acessa, ameaças e proteções | obrigatório | pendente | `docs/seguranca-ameacas.md` e seção do `docs/03` | Fase 2 |
| A3-7 | Ferramentas, APIs, modelos, frameworks e LLMs descritos na implementação | obrigatório | em andamento | `docs/02` (tabela de ferramentas), [ADR 0003](adr/0003-llm-do-produto-gemini.md) e `docs/03` | LLM do produto: Gemini (28/10), com modelos, preços e termos conferidos na documentação oficial. Tabela de `docs/02` traz alternativas |
| A3-8 | Justificar a técnica de IA escolhida (ML, NLP, automação, otimização) | obrigatório | pendente | `docs/03`, "por que IA e onde não" | Excelência Operacional |
| A3-9 | Documento de 5 a 8 páginas (ou slides) | obrigatório | pendente | `docs/03-entrega-2-prova-de-conceito.md` | Mirar em 8 páginas no máximo |
| A3-10 | Dica 1: amarrar tudo ao problema da Etapa 1 | obrigatório | pendente | `docs/03` | Cada componente aponta para a dor que resolve |
| A3-11 | Dica 2: justificar cada escolha, inclusive por que não outra | obrigatório | pendente | `docs/03` e ADRs | Registrar alternativas descartadas |
| A3-12 | Prazos: Entrega 2 em 31/10; feedback da Etapa 2 em 03/11; Entrega 3 em 07/11; storytelling em 10/11; apresentação em 17/11 | informativo | mantido | `README.md`, `CLAUDE.md` | |
| A3-13 | Conteúdo oral da aula (vídeo `Encontro_Aula_3`) | ambíguo | bloqueado | n/d | Sem ffmpeg e sem Python funcional na máquina; vídeo não processado. Victor pode colar as anotações ou instalar as ferramentas para transcrever |
