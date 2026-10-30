# Segurança, ameaças e risco

Seção de Cybersecurity da Etapa 2, no formato que o professor pede: quais dados, se há dados pessoais, onde ficam, quem acessa, quais ameaças e quais proteções. Inclui a ficha de risco (Res. CFM 2.454, Art. 12) e o esboço da avaliação de impacto algorítmico. **Isto não é parecer jurídico**: o que depende de jurídico está marcado.

## 1. Dados, dados pessoais, onde ficam e quem acessa

| Dado | Hoje (PoC) | Em produção (desenho) | Pessoal? | Onde fica | Quem acessa |
| --- | --- | --- | --- | --- | --- |
| Cadastro de médicos (nome, CRM, telefone) | **Sintético**, marcado `SIM` | Real | Sim | Hoje: CSV local ignorado pelo Git. Depois: banco (Supabase, região São Paulo) | Hoje: a equipe. Depois: o médico vê o próprio; o coordenador só candidatos elegíveis para a própria vaga (RLS, **desenho**) |
| Localização, raio e disponibilidade | Sintético | Real, minimizado (distância calculada, endereço não exibido) | Sim | Idem | Idem; **nunca vai ao LLM** |
| Atributos de auditoria (gênero, faixa etária, zona) | Sintético | Real, só para auditoria de viés | Sim | Idem | Só a auditoria; **fora do ranking e do LLM** |
| Vaga e pedido em texto livre | Sintético | Real | Pode conter dado pessoal digitado | Idem | Coordenador; vai ao LLM como **texto não confiável**, após limpeza |
| Ofertas, respostas e comparecimento | Sintético | Real | Sim | Idem | Partes envolvidas (RLS) |
| Valor do plantão e pagamento | Sintético, tabela separada | Real | Sim | Tabela separada | Financeiro; **fora do ranking e do LLM** |
| Trilha de auditoria | Arquivo JSONL com hash | Tabela só de inserção | Só IDs pseudônimos | Idem | Comissão de IA e auditoria |

Na PoC **não há dado pessoal real**. Em produção, a LGPD se aplica: base legal, minimização e relatório de impacto; **validar com jurídico**, inclusive o envio de texto a um provedor de LLM que pode processar fora do Brasil (ADR 0003).

## 2. Modelagem de ameaças (STRIDE leve)

| Categoria | Ameaça | Defesa | Evidência | Residual |
| --- | --- | --- | --- | --- |
| **S**poofing | Alguém se passa por coordenador ou médico | Autenticação por papel (Supabase Auth, desenho); a trilha registra o ator | `app/audit.py` | A PoC não tem login: **construir com a API** |
| **T**ampering | Alterar ou apagar registros da trilha | Cadeia de hash e arquivo só de acréscimo | `tests/test_audit.py` (alteração e remoção são detectadas) | Hash local não impede quem apaga o arquivo inteiro: em produção, tabela só de inserção e cópia externa |
| **T**ampering | Resposta do LLM forjada ou corrompida | Esquema fechado: chaves exatas, listas fixas, datas coerentes | `tests/test_llm.py` (12 saídas maliciosas rejeitadas) | Esquema não pega valor plausível e errado: por isso o coordenador confere |
| **T**ampering | Manipular os dados sintéticos | Manifesto com SHA-256 por arquivo; CI confere contra a máquina do autor | `docs/dados/manifesto-da-geracao.json`, job `poc` | Informativo, não bloqueia |
| **R**epudiation | Negar que aprovou uma oferta | Aprovação registrada com ator, hora e versão do modelo | `tests/test_pipeline.py` | Sem assinatura digital |
| **I**nformation disclosure | Dado pessoal vai ao LLM | Prompt só com o texto da vaga e nomes de hospitais; nome, CRM e telefone inexistentes no prompt | `tests/test_llm.py` | Texto digitado pode conter dado pessoal: camada paga e aviso na demo |
| **I**nformation disclosure | Vazar segredo no repositório (público) | `.env` fora do Git; varredura de padrões de chave na CI (Gemini, Anthropic, JWT, Telegram); só dados sintéticos | Job `segredos` | Padrões conhecidos apenas |
| **I**nformation disclosure | Trilha vazar dado pessoal | A trilha recusa campos de nome, CRM, telefone, e-mail e CPF | `tests/test_audit.py` | Depende de nomes de campo |
| **D**enial of service | Texto gigante, LLM fora do ar, abuso da plateia | Limite de 500 caracteres, fallback sem LLM; limite de requisições no Traefik (desenho) | `tests/test_llm.py` | Sem limite de taxa na PoC |
| **E**levation of privilege | Injeção de prompt para ganhar ação ou segredo | LLM sem ferramentas e sem segredos; texto suspeito nunca chega ao LLM; decisão humana obrigatória | `tests/test_llm.py` (10 tipos de ataque) | O comportamento do Gemini a ataques novos não foi testado |
| **IA** Viés | Excluir grupos por proxy (zona via distância) | Atributos protegidos fora do ranking; relatório de participação e concentração | `docs/resultados/metricas-ranking.md` | **Existe:** zonas distantes quase não são recomendadas; mitigar e monitorar |
| **IA** Influência econômica | Pagamento influenciar o ranking | Lista fechada de variáveis e teste na CI | `tests/test_neutralidade_economica.py` | Depende de a lista continuar sob revisão |
| **IA** Excesso de confiança | Coordenador aprovar sem olhar | Motivos e alertas visíveis; aprovação explícita; auditoria | `app/pipeline.py` | Treinamento e cultura |

## 3. Cadeia de suprimentos e segredos

- A PoC usa só a biblioteca padrão do Python; as ferramentas de desenvolvimento são `pytest` 8.3.3 e `ruff` 0.7.0, com versão fixada.
- As ações do GitHub estão fixadas por versão principal (`v4`, `v5`); **fixar por hash do commit** e ligar o Dependabot são melhorias para a Etapa 3.
- As chaves (Gemini) ficam fora do Git, uma por pessoa e com limite de gasto; o repositório é público.

## 4. Ficha de risco (Res. CFM 2.454, Art. 12 e 13)

| Item | Conteúdo |
| --- | --- |
| Sistema | PlantãoSeguro: recomenda médicos para plantões e explica; humano decide |
| Finalidade | Apoio administrativo e operacional à gestão de escalas (não é ato médico nem apoio à decisão clínica) |
| Impacto | Afeta o acesso a plantões (renda) de médicos; pacientes só indiretamente, pela cobertura da escala |
| Autonomia | Nenhuma: não envia oferta sem aprovação humana |
| Dados | Sintéticos na PoC; pessoais em produção; pagamento e atributos protegidos fora do modelo |
| Classificação proposta | **Médio risco (preliminar)**. A Entrega 1 propôs baixo risco; o Anexo II cita agendamento como baixo risco, mas o sistema ranqueia pessoas e apoia decisão operacional importante, que o anexo trata como médio. **A classificação formal é do hospital; validar com jurídico** |
| Controles | Supervisão humana, explicabilidade, auditoria, monitoramento de viés, neutralidade econômica, dados pessoais fora do LLM |
| Revisão | A cada mudança de modelo, de variáveis ou de segmento, e ao menos semestral |

## 5. Esboço da avaliação de impacto algorítmico (Anexo I, XIII)

| Pergunta | Resposta na PoC |
| --- | --- |
| Quem é afetado? | Médicos (acesso a plantões e renda), coordenadores (carga de decisão), hospitais, e pacientes de forma indireta |
| Que danos são possíveis? | Exclusão sistemática de médicos que moram longe; concentração das ofertas em poucos; confiança excessiva na lista; vazamento de dado pessoal |
| O que já se mediu? | Em simulação: os 10% mais recomendados ocupam 50,7% dos lugares do top-5; 47% dos elegíveis nunca aparecem; zonas leste e oeste com razão de participação de 0,01 |
| Medidas | Revisão humana da lista; monitoramento por grupo; estudar limite ao peso da distância e rodízio entre elegíveis equivalentes; contestação do médico (desenho) |
| Quando reavaliar? | A cada versão do modelo e com dados reais do piloto |
| Responsável | Diretor técnico do hospital e Comissão de IA e Telemedicina (Res. 2.454, Art. 14) |

## 6. Riscos residuais e próximos passos

Construir autenticação, RLS e limite de requisições com a API; fixar as ações da CI por hash; testar o Gemini com chave contra os 10 tipos de ataque; mitigar o viés geográfico; validar com jurídico a classificação de risco, o enquadramento na 2.460 e a situação da 2.462 ([docs/conformidade](conformidade/README.md)).
