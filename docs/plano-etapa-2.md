# Plano da Etapa 2

- **Versão 2, de 28/10/2026 (noite).** Status: **G0 aprovado pelo Victor em 28/10/2026** (plano v2 e ADRs 0001 a 0004). Nenhum item é executado antes do "ok" do portão correspondente.
- **Prazo:** entrega em **sábado, 31/10/2026**. Hoje é quarta (28/10): restam 3 dias de trabalho.
- **O que o professor cobra** (slides de 27/10 e feedback): 4 entregáveis, **Dados, Análise, Solução de IA e PoC ou protótipo**, mais Cybersecurity em seção curta, em documento de **5 a 8 páginas**, amarrado ao problema e com **justificativa de cada escolha** ([rastreabilidade](rastreabilidade-professor.md)).

## O que mudou em relação à versão 1

| Mudança | Decisão |
| --- | --- |
| **LLM do produto** | Gemini no lugar do Claude ([ADR 0003](adr/0003-llm-do-produto-gemini.md)); o Claude Code segue só como ferramenta de desenvolvimento |
| **Protótipo** | **Adiado**: não se constrói banco, API, interface nem n8n agora ([ADR 0004](adr/0004-prototipo-adiado.md)); a forma da PoC é decidida no portão **G-P** |
| **Frentes** | De F1 a F6 (com protótipo) para A1 a A5 (dados, análise, solução de IA, segurança) mais coordenação |
| **Contratos** | Viram o **dicionário de dados** (documento), não SQL nem código |

## 1. Escopo

| Camada | Itens | Regra |
| --- | --- | --- |
| **Agora (sem protótipo)** | Dados sintéticos, análise, desenho da solução de IA, segurança, ética e conformidade, metas com linha de base, `docs/03` | Prioridade total até o G-P |
| **Núcleo da PoC (quando aprovada)** | Extração da vaga, filtro de elegibilidade e jornada, ranking (baseline e modelo), explicação com fallback | Nunca é cortado (ADR 0002) |
| **Apoio mínimo (depois)** | Aprovação humana, `audit_log`, tela do médico, cascata no n8n | Só com aprovação |
| **Evolução futura** | Check-in e pagamento, contestação completa, telão, Telegram, previsão, equidade, kit da Comissão de IA | Só descrita |

Segmento: UPA e pronto-socorro, plantão noturno de 12 h e fim de semana, clínica médica e pediatria (ADR 0001).

## 2. O que será entregue, mapeado ao que o professor pede

| Exigência | Artefato | Frente |
| --- | --- | --- |
| **Dados** (origem, dicionário, volume, variáveis, qualidade, tratamento) | `data/synthetic/` com gerador reprodutível, `docs/dados/dicionario-de-dados.md` e relatório de qualidade | A1 |
| **Análise** (estatísticas, visualizações, correlações, padrões, análise textual) | `docs/analise/` com figuras geradas por script: distribuições, aceite por distância e turno, concentração de ofertas, análise das vagas em texto livre | A2 |
| **Solução de IA** (entrada, processamento de IA, saída, usuário) | `docs/solucao-ia.md` (ranking) e seção do LLM com Gemini; baseline contra modelo; explicação e guardrails; por que IA e onde não | A3, A4 |
| **PoC ou protótipo** | **Decidido no G-P** (opções P1 a P3 na seção 5) | G-P |
| **Cybersecurity** (dados, pessoais, onde ficam, quem acessa, ameaças, proteções) | `docs/seguranca-ameacas.md` (STRIDE leve) | A5 |
| **Metas com linha de base** (FB-3) | Seção "Metas e linha de base" (proposta na seção 6) | Victor |
| **Normas conferidas** (FB-4) | `docs/conformidade/` com os textos oficiais lidos e o que depende de jurídico | A5 |
| **Justificar escolhas e amarrar ao problema** | Tabela "por que esta e não outra" em cada ficha e no `docs/03` | Todas |

## 3. Frentes de trabalho

Donos sugeridos a definir pelo Victor (uma pessoa por frente). O Victor coordena, decide os portões e escreve o `docs/03` a partir das fichas. Cada frente entrega a **ficha do componente** ([modelo](templates/ficha-componente.md)).

| Frente | O que entrega | Pastas | Pronto quando | Depende de |
| --- | --- | --- | --- | --- |
| **A1 Dados sintéticos** | Gerador com semente (3 unidades, cerca de 300 médicos, histórico de ofertas com aceite e comparecimento); dicionário de dados; relatório de qualidade | `data/synthetic/`, `docs/dados/` | Mesma semente gera os mesmos dados; dicionário e qualidade documentados | G1 |
| **A2 Análise exploratória** | Estatísticas, correlações, padrões, segmentações e análise textual das vagas livres, com figuras e leitura | `docs/analise/` | Pelo menos 6 figuras com interpretação e as limitações | Dicionário (G1); dados de A1 |
| **A3 Solução de IA: regras e ranking** | Especificação do filtro de elegibilidade e jornada; desenho do ranking (baseline heurístico e modelo); validação temporal; protocolo de avaliação (precision@5, recall@5); fatores por candidato | `docs/solucao-ia.md` | Entrada, processamento, saída e usuário descritos; por que IA e onde não; protocolo de avaliação | G1 |
| **A4 Solução de IA: LLM com Gemini** | Desenho da extração e da explicação; esquema de saída (Pydantic); guardrails; 10 casos de injeção de prompt especificados; fallback; conjunto de avaliação; custo e latência estimados | `docs/solucao-ia.md` (seção LLM) | Prompts e esquemas versionados em documento; casos de injeção e de avaliação listados | ADR 0003 |
| **A5 Segurança, ética e conformidade** | STRIDE leve; leitura dos textos oficiais das Res. 2.454, 2.460 e 2.462; matriz de conformidade; ficha de risco; viés e equidade | `docs/seguranca-ameacas.md`, `docs/conformidade/` | Cada norma marcada como verificada ou não; o que depende de jurídico separado | n/d |
| **Coordenação (Victor)** | Metas com linha de base; `docs/03`; portões; Moodle | `docs/` | Documento de 8 páginas revisado | Todas |

## 4. Cronograma e portões de aprovação

Em cada portão eu explico o que foi feito e o que vem, e só sigo com o "ok" do Victor.

| Quando | O que acontece | Portão |
| --- | --- | --- |
| **Qua 28/10 (hoje)** | Victor aprova este plano e os ADRs 0001 a 0004; merge do PR #1; convites aos colegas e proteção da `main`; colegas instalam as ferramentas (`make doctor`) | **G0** (aprovado em 28/10; faltam o merge do PR #1, os convites e a proteção da `main`) |
| **Qui 29/10, manhã** | Eu preparo o **dicionário de dados v0** (o contrato de dados) e o Victor aprova; as frentes A1 a A5 começam em paralelo | **G1** |
| **Qui 29/10, noite** | Dados gerados e análise preliminar; o Victor decide a **forma da PoC** (P1, P2 ou P3) | **G-P** |
| **Sex 30/10** | A2 conclui a análise; A3 e A4 fecham o desenho; rascunho completo do `docs/03`; revisão do `revisor-professor`; se o G-P aprovou, constrói-se a PoC escolhida | **G3** |
| **Sáb 31/10, manhã** | Congelar ao meio-dia; `docs/03` final; tag `etapa-2`; envio no Moodle pelo Victor | **G4** |

## 5. Opções para a PoC (decisão no G-P)

| Opção | O que é | Esforço | Risco |
| --- | --- | --- | --- |
| **P1 PoC mínima executável** (recomendada) | Notebook ou script que roda o núcleo sobre os dados sintéticos e mostra top 5, motivos e excluídos | Cerca de 1 dia de 2 pessoas | Baixo |
| **P2 API sem interface** | P1 mais uma API pequena | 1,5 dia | Médio |
| **P3 API e interface do coordenador** | Fluxo completo do plano anterior | Mais de 2 dias | Alto para 31/10 |

**Risco declarado:** o professor lista a PoC entre os 4 entregáveis; sem nenhum artefato executável a nota da Etapa 2 é afetada. Por isso o G-P tem data limite (quinta à noite): depois disso a P1 ainda cabe na sexta.

## 6. Metas com linha de base (resposta ao FB-3, para aprovar)

Nenhum número abaixo é resultado: são o jeito de medir. Com dados sintéticos, o modelo reaprende o simulador; por isso a comparação é sempre com o baseline e o rótulo é **simulação**.

| Indicador | Como medimos | Linha de base | Meta |
| --- | --- | --- | --- |
| Qualidade do ranking | precision@5 e recall@5 em hold-out **temporal** sintético | Ranking heurístico (distância e disponibilidade) | Modelo >= baseline; o ganho exigido só é fixado **depois** de medir o baseline |
| Violações de jornada nas recomendações | Testes do filtro | n/d | 0, por construção e por teste |
| Ranking influenciado por pagamento | Teste de neutralidade na CI (já existe) | n/d | 0 |
| Explicações válidas | Esquema validado e só fatores recebidos; falhas simuladas do LLM caem no template | n/d | 100% válidas; 100% das falhas cobertas |
| Injeção de prompt | Pelo menos 10 casos (especificados na A4, executados se a PoC for aprovada) | n/d | 0 vazamentos, 0 mudança de regra |
| Latência e custo por recomendação | Estimados com os preços do Gemini (ADR 0003); medidos só se houver PoC | A medir | Sem meta antes de medir |
| Tempo de preenchimento (meta de -50%) | **Não mensurável** com dados sintéticos | Entrevistas (Etapa 3) | Mantida como hipótese |
| Recall >= 0,7 | Pertence à **previsão de vagas descobertas** (Etapa 3), não ao ranking | n/d | Reformulada na Etapa 3 |

## 7. Estrutura do `docs/03` (8 páginas)

| Seção | Páginas | Alimentada por |
| --- | --- | --- |
| Recap do problema e do segmento | 0,5 | Entrega 1, ADR 0001 |
| Dados | 1,25 | A1 |
| Análise | 1,0 | A2 |
| Solução de IA (entrada, processamento, saída, usuário; por que IA e onde não; baseline; LLM com Gemini) | 1,75 | A3, A4 |
| PoC e demonstração (conforme o G-P) | 1,25 | Opção escolhida |
| Segurança, ética e conformidade | 1,0 | A5 |
| Metas, resultados preliminares (rotulados) e limites | 0,75 | Seção 6 |
| Próximos passos e uso de IA no desenvolvimento | 0,5 | Diário de bordo |
| **Total** | **8,0** | |

## 8. Riscos e respostas

| Risco | Resposta |
| --- | --- |
| PoC ficar sem artefato executável | Portão G-P com data limite e a opção P1 como mínimo |
| Ambiente dos colegas não instala a tempo | A CI do GitHub roda testes e lint; trabalho em dupla até instalar |
| Camada gratuita do Gemini expor texto digitado pela plateia | Camada paga na demo e aviso "não digite dados reais" (ADR 0003) |
| Preço e modelos do Gemini mudarem | IDs e preços datados em 28/10; reconferir antes da demo |
| Escopo crescer | ADRs 0002 e 0004 |
| Documento estourar 8 páginas | Orçamento por seção (seção 7) e fichas curtas |
| Conflitos de merge | Uma frente por pessoa, pastas separadas, revisão cruzada |
| Números sintéticos serem lidos como evidência | Rótulo "simulação", baseline e seção de limites |

## 9. O que depende do Victor

1. Aprovar este plano e os ADRs 0001 a 0004; fazer o merge do PR #1.
2. Passar os usuários do GitHub dos colegas e escolher o dono de cada frente (A1 a A5).
3. Convidar os colegas e proteger a `main` (passo a passo na resposta da sessão).
4. Criar a chave do Gemini no Google AI Studio para testes com dados sintéticos e, para a demo, um projeto com faturamento ativo e alerta de orçamento.
5. Instalar as ferramentas do `make doctor` e, se quiser o vídeo da aula usado, colar as anotações.
6. Decidir a forma da PoC no G-P (quinta à noite).
7. Enviar a entrega no Moodle em 31/10.
