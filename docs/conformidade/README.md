# Conformidade: o que os textos oficiais dizem e o que ainda precisa de jurídico

O professor sugeriu conferir os **textos oficiais vigentes**, interpretar as obrigações para a plataforma e separar o que depende de análise jurídica (feedback FB-4). Em 30/10/2026 lemos o texto das três resoluções do CFM citadas na Entrega 1.

> **Isto não é parecer jurídico.** As leituras abaixo são hipóteses de engenharia e de produto, sempre a **validar com jurídico**. Os artigos são citados por número e resumidos; o texto completo está nos links.

## 1. Como a leitura foi feita

| Norma | Fonte lida | Como foi lida | Observação |
| --- | --- | --- | --- |
| Res. CFM 2.454/2026 (IA na medicina) | [DOU de 27/02/2026, Seção 1, p. 158](https://www.in.gov.br/web/dou/-/resolucao-cfm-n-2.454-de-11-de-fevereiro-de-2026-689247948), em cópia hospedada pela [Fiocruz](https://observatoriohospitalar.fiocruz.br/sites/default/files/biblioteca/RESOLU%C3%87%C3%83O_2.454.pdf) | Texto do PDF extraído com `pdftotext` | A própria cópia avisa: "Este conteúdo não substitui o publicado na versão certificada". A Entrega 1 só citava notícias |
| Res. CFM 2.460/2026 | [PDF no portal do CFM](https://portal.cfm.org.br/wp-content/uploads/2026/06/2460_2026.pdf) (DOU de 15/06/2026, Seção 1, p. 200) | Idem | Texto e exposição de motivos |
| Res. CFM 2.462/2026 | [PDF no portal do CFM](https://sistemas.cfm.org.br/normas/arquivos/resolucoes/BR/2026/2462_2026.pdf) (DOU de 02/06/2026, Seção 1, p. 121) | Idem | **O PDF traz aviso de suspensão judicial** (ver seção 4) |

Não foram lidos: LGPD (Lei 13.709/2018), o Tema 1.389 do STF, os pareceres de jornada e a decisão judicial que suspendeu a 2.462.

## 2. Res. CFM 2.454/2026: inteligência artificial na medicina

Data: 11/02/2026; publicada em 27/02/2026; entra em vigor 180 dias depois (Art. 23), por volta de **26/08/2026**.

| O que o texto diz | Artigo | Como o PlantãoSeguro responde |
| --- | --- | --- |
| Aplica-se a "plataformas de IA utilizadas na gestão em saúde" e a aplicações de "apoio administrativo" | Anexo I, itens II e III | O projeto está no escopo por definição; **validar com jurídico** a aplicação à plataforma e ao hospital |
| Instituições médicas, públicas ou privadas, que desenvolvem ou usam IA fazem **avaliação preliminar de risco** e classificam em baixo, médio, alto ou inaceitável; o nível deve ser informado ao usuário | Art. 12 e 13; Anexo II | A Entrega 1 propôs "baixo risco (preliminar)". Os exemplos de baixo risco do Anexo II são agendamento de consultas e logística; já "sistemas que apoiam decisões clínicas ou **operacionais importantes**, sem executá-las de forma autônoma" são de **médio risco**. Como o PlantãoSeguro ranqueia profissionais e afeta o acesso a plantões, **recomendamos reavaliar para médio risco**; a classificação formal é do hospital |
| As soluções "não são soberanas, sendo obrigatória a supervisão humana"; a IA não pode restringir nem substituir a autoridade final | Art. 15, parágrafo único; Art. 18 | Decisão humana obrigatória: sem a aprovação do coordenador nenhuma oferta sai, e a aprovação fica no `audit_log` |
| Direito de não seguir a recomendação da IA; instituições não impõem metas que subordinem condutas | Art. 3º IV; Art. 19 | A recomendação é só ordenação com motivos; o coordenador pode escolher qualquer elegível |
| Governança, transparência, monitoramento de vieses com resultados estratificados e acesso para órgãos de controle | Art. 14; Anexo III, I, II e VIII | Explicação por recomendação, trilha de auditoria, relatório de disparidade (`docs/resultados`) e `docs/seguranca-ameacas.md` |
| Comissão de IA e Telemedicina quando a instituição adota sistemas próprios | Art. 14, parágrafo único | O hospital que adotar o sistema precisa dessa comissão; a documentação do projeto serve de insumo |
| Dados tratados conforme a LGPD, com proteção contra acesso indevido e vazamento | Art. 16 e 17 | Só dados sintéticos na PoC; nome, CRM e telefone nunca vão ao LLM (testado) |
| Definições de explicabilidade, contestabilidade, auditabilidade e avaliação de impacto algorítmico | Anexo I, XIII, XVIII, XIX, XX | Explicabilidade e auditabilidade estão na PoC; **contestação e avaliação de impacto algorítmico estão desenhadas, não construídas** (evolução futura) |

## 3. Res. CFM 2.460/2026: vantagens econômicas ligadas à contratação

Data: 21/05/2026; publicada em 15/06/2026; em vigor na publicação (Art. 7º).

| O que o texto diz | Artigo | Leitura para o PlantãoSeguro (a validar) |
| --- | --- | --- |
| Veda ao médico oferecer, pagar, receber ou conceder valor ou vantagem como condição para influenciar a contratação ou "o favorecimento em escala de trabalho médico" | Art. 1º, I | O ranking **não usa** pagamento nem valor do plantão (teste automatizado na CI) |
| Também é infração participar, intermediar ou beneficiar-se de prática que condicione relações profissionais a compensação, "ainda que dissimulada" como taxa, comissão, bonificação, "contribuição para grupo ou **plataforma digital**" | Art. 2º | Modelo de receita: **assinatura fixa paga pelo hospital**, sem comissão e sem cobrança ao médico; qualquer cobrança do médico ou por colocação precisa de parecer antes de existir |
| Alcança "empresas intermediadoras, **plataformas digitais**" e independe da forma jurídica | Art. 4º, §2º | A plataforma é citada de forma expressa; **validar com jurídico** o enquadramento e o modelo de cobrança |
| Alcança o médico que permite a prática quando exerce direção técnica ou **coordenação de escala** | Art. 5º, III | O coordenador de escala (se médico) tem dever próprio; a trilha de auditoria ajuda a demonstrar critério técnico |
| Não se enquadram remunerações previstas em contrato com PJ para serviços administrativos ou de gestão reais e comprovados, "desde que não vinculados a privilégios no acesso a vagas" | Art. 6º | É a base para sustentar a assinatura fixa, desde que **sem** vínculo com acesso a vagas; **validar com jurídico** |

A exposição de motivos afirma que o CFM "não regula contratos civis ou trabalhistas" e descreve o problema da devolução de honorários e do "cashback" para obter plantões, sobretudo no setor privado e nos serviços terceirizados, justamente o segmento escolhido (ADR 0001).

## 4. Res. CFM 2.462/2026: inadimplemento remuneratório de pessoas jurídicas

Data: 22/05/2026; publicada em 02/06/2026; em vigor 30 dias depois (Art. 8º).

> **Correção importante.** O PDF oficial lido no portal do CFM abre com o aviso: "RESOLUÇÃO SUSPENSA integralmente por decisão judicial proferida nos autos do Processo nº 1025417-59.2026.4.01.0000". A Entrega 1 e o `docs/02` tratam a 2.462 como norma em vigor que "pune quem deixa de pagar". **Isso precisa ser revisto**: a situação atual da decisão judicial não foi verificada aqui.

| O que o texto diz | Artigo | Leitura para o PlantãoSeguro (a validar) |
| --- | --- | --- |
| Pessoas jurídicas que "prestem, organizem, contratem, **intermedeiem** ou administrem" assistência médica, inclusive empresas intermediadoras de serviços médicos, mantêm registro no CRM com diretor técnico médico | Art. 1º | Pode alcançar o intermediário; **validar com jurídico** se a plataforma, que não contrata nem paga médicos, se enquadra |
| Inadimplemento é o não pagamento de plantões e honorários após o vencimento; atribui responsabilidade à pessoa jurídica mesmo que o contratante atrase o repasse | Art. 2º | A plataforma **não custodia dinheiro** nem paga médicos |
| Sanções: advertência, multa (1 a 50 anuidades, até 100 na reincidência), suspensão do registro por até 1 ano e cancelamento | Art. 4º | Risco regulatório do hospital e de intermediadores, não do ranking |

Efeito no projeto: o controle "rastro de pagamentos" (tabela `payments`, prazos e alertas) segue como **boa prática e evolução futura**, mas **deixa de ser apresentado como obrigação decorrente da 2.462** enquanto a situação judicial não for confirmada.

## 5. O que ainda depende de jurídico

1. Se o PlantãoSeguro se enquadra como "sistema de IA na gestão em saúde" (2.454) e quem faz a avaliação de risco: o hospital contratante, o desenvolvedor ou ambos.
2. A classificação de risco: baixo (proposta da Entrega 1) ou médio (leitura do Anexo II acima).
3. O enquadramento da plataforma e da **assinatura fixa** frente aos Art. 2º, 4º §2º e 6º da 2.460.
4. A situação atual da suspensão da 2.462 e se a plataforma se enquadra como "empresa intermediadora".
5. LGPD: base legal e transferência internacional se um dia houver dado real e LLM de provedor estrangeiro (ADR 0003).
6. Contratação de médicos em hospital privado (Tema 1.389 do STF, ainda pendente).
7. Limites de jornada: 24 h contínuas e 11 h de descanso são **configuração do projeto**, não norma verificada.

## 6. Matriz de controles (resumo)

| Exigência ou risco | Controle técnico | Onde está | Estado |
| --- | --- | --- | --- |
| Supervisão humana (2.454, Art. 15) | Aprovação do coordenador e registro | `app/pipeline.py`, `tests/test_pipeline.py` | **Construído na PoC** |
| Explicabilidade (2.454, Anexo I XIX) | Motivos por candidato e regra por excluído | `app/explain.py`, `app/rules.py` | **Construído** |
| Auditabilidade (2.454, Anexo I XVIII) | Trilha encadeada por hash | `app/audit.py` | **Construído** |
| Monitoramento de viés (2.454, Anexo III II) | Tabela de participação no top-5 | `docs/resultados/metricas-ranking.md` | **Construído em simulação** |
| Neutralidade econômica (2.460, Art. 1º e 2º) | Lista fechada de variáveis e teste na CI | `app/ranking/features.py` | **Construído** |
| Dados pessoais fora do LLM (2.454, Art. 16 e 17) | Prompt sem nome, CRM e telefone; trilha sem dado pessoal | `tests/test_llm.py`, `tests/test_audit.py` | **Construído** |
| Contestabilidade (2.454, Anexo I XX) | Contestação do médico com resposta registrada | Desenho em `docs/solucao-ia.md` | Desenhado, **não construído** |
| Avaliação de impacto algorítmico (2.454, Anexo I XIII) | Documento periódico | Esboço em `docs/seguranca-ameacas.md` | Desenhado, **não construído** |
| Rastro de pagamentos | Tabela `payments`, prazos | Dicionário de dados, 4.11 | Evolução futura; base normativa a rever |
