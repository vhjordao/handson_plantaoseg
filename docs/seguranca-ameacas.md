# Segurança, ameaças e risco

Seção de Cybersecurity da Etapa 2, no formato que o professor pede: quais dados, se há dados pessoais, onde ficam, quem acessa, quais ameaças e quais proteções. Inclui a ficha de risco (Res. CFM 2.454, Art. 12) e o esboço da avaliação de impacto algorítmico. **Isto não é parecer jurídico**: o que depende de jurídico está marcado.

## 1. Dados, dados pessoais, onde ficam e quem acessa

| Dado | Hoje (PoC) | Em produção (desenho) | Pessoal? | Onde fica | Quem acessa |
| --- | --- | --- | --- | --- | --- |
| Cadastro de médicos (nome, CRM, telefone) | **Sintético**, marcado `SIM` | Real | Sim | CSVs locais, ignorados pelo Git, e banco do Supabase, em São Paulo, com os dados sintéticos desde 04/11 | No banco: o médico vê o próprio; o coordenador só candidatos elegíveis para a própria vaga (RLS com testes na CI, [ficha do banco](../supabase/README.md)) |
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
| **S**poofing | Alguém se passa por coordenador ou médico | JWT do Supabase validado na API, só em ES256; papel e organização lidos de `profiles`, sem perfil não há acesso; a trilha registra o ator | `tests/test_api_auth.py`, `tests/test_api_rotas.py`, [ADR 0010](adr/0010-api-de-matching.md) | As telas ainda não têm login: a API exige, e as telas entram depois |
| **S**poofing | Entrar no servidor adivinhando a senha do root | Login só por chave e firewall com 22, 80 e 443 | [`infra/preparar-servidor.sh`](../infra/preparar-servidor.sh), `tests/test_contrato_infra.py` | Quem tiver a chave privada entra como root |
| **T**ampering | Alterar ou apagar registros da trilha | Cadeia de hash e arquivo só de acréscimo | `tests/test_audit.py` (alteração e remoção são detectadas) | Hash local não impede quem apaga o arquivo inteiro. O banco já tem a tabela só de inserção, com gatilho; falta a cópia externa |
| **T**ampering | Resposta do LLM forjada ou corrompida | Esquema fechado: chaves exatas, listas fixas, datas coerentes | `tests/test_llm.py` (12 saídas maliciosas rejeitadas) | Esquema não pega valor plausível e errado: por isso o coordenador confere |
| **T**ampering | Manipular os dados sintéticos | Manifesto com SHA-256 por arquivo; CI confere contra a máquina do autor | `docs/dados/manifesto-da-geracao.json`, job `poc` | Informativo, não bloqueia |
| **R**epudiation | Negar que aprovou uma oferta | Aprovação registrada com ator, hora e versão do modelo; a cascata só chama quem está nesse registro | `tests/test_pipeline.py`, `tests/test_api_cascata.py` | Sem assinatura digital |
| **E**levation of privilege | Criar oferta sem o clique do coordenador, pela API ou pelo n8n | `approve` é a única entrada; `advance` recusa sem aprovação na trilha e refaz as regras; o segredo do n8n não aprova | `tests/test_api_cascata.py` | Quem tem a chave de serviço grava direto no banco: ela fica só no servidor |
| **I**nformation disclosure | A API, que ignora a RLS, ler o que não deve | Colunas sempre listadas, `select=*` e `shift_compensation` barrados no cliente, dado pessoal nem carregado | `tests/test_api_rest.py`, `tests/test_api_repositorio.py`, `tests/test_neutralidade_economica.py` | Da residência, a API lê as coordenadas, para calcular o raio |
| **S**poofing | Chamar as rotas internas pela internet | Rota pública do Traefik exclui `/internal`, e as rotas pedem o segredo do n8n | `tests/test_contrato_infra.py`, conferido de fora | Quem está dentro do servidor alcança |
| **S**poofing | Disparar a cascata de fora | O webhook do n8n não existe na internet e pede o segredo; mesmo disparado, `advance` recusa vaga sem aprovação ([ADR 0013](adr/0013-aviso-da-api-inicia-a-cascata.md)) | `tests/test_contrato_infra.py`, `tests/test_contrato_n8n.py`, conferido de fora | Quem entra no editor do n8n usa o segredo, mas ele não aprova nem cria oferta |
| **I**nformation disclosure | Dado pessoal vai ao LLM | Prompt só com o texto da vaga e nomes de hospitais; nome, CRM e telefone inexistentes no prompt | `tests/test_llm.py` | Texto digitado pode conter dado pessoal: camada paga e aviso na demo |
| **I**nformation disclosure | Vazar segredo no repositório (público) | `.env` fora do Git; varredura de padrões de chave na CI (Gemini, Anthropic, JWT, Telegram); só dados sintéticos | Job `segredos` | Padrões conhecidos apenas |
| **I**nformation disclosure | Trilha vazar dado pessoal | A trilha recusa campos de nome, CRM, telefone, e-mail e CPF | `tests/test_audit.py` | Depende de nomes de campo |
| **D**enial of service | Texto gigante, LLM fora do ar, abuso da plateia | Limite de 500 caracteres no motor e de 5.000 na API, fallback sem LLM; limite de requisições por IP e de tamanho do corpo no Traefik | `tests/test_llm.py`, `tests/test_contrato_infra.py`, [medição](resultados/metricas-carga-api.md) | A plateia pode sair toda pelo mesmo IP; 1 vCPU tem o limite medido |
| **E**levation of privilege | Injeção de prompt para ganhar ação ou segredo | LLM sem ferramentas e sem segredos; texto suspeito nunca chega ao LLM; decisão humana obrigatória | `tests/test_llm.py` (10 tipos de ataque) | O comportamento do Gemini a ataques novos não foi testado |
| **E**levation of privilege | Invadir pelo editor do n8n e alcançar o resto do servidor | Editor aberto na web só em HTTPS, com login, limite de tentativas por IP no Traefik e por e-mail no n8n; webhook, formulário e MCP fora da rota pública; versões fixas; segredos fora do Compose ([ADR 0012](adr/0012-editor-do-n8n-na-web.md)) | [`infra/docker-compose.yml`](../infra/docker-compose.yml), `tests/test_contrato_infra.py` | A tela de login está na internet, e nada protege de uma falha do n8n antes do login além da versão fixa. O Traefik lê o socket do Docker, então uma falha nele alcança o servidor; aceito para um servidor de poucos dias |
| **IA** Viés | Excluir grupos por proxy (zona via distância) | Atributos protegidos fora do ranking; relatório de participação e concentração | `docs/resultados/metricas-ranking.md` | **Existe:** zonas distantes quase não são recomendadas; mitigar e monitorar |
| **IA** Influência econômica | Pagamento influenciar o ranking | Lista fechada de variáveis e teste na CI | `tests/test_neutralidade_economica.py` | Depende de a lista continuar sob revisão |
| **IA** Excesso de confiança | Coordenador aprovar sem olhar | Motivos e alertas visíveis; aprovação explícita; auditoria | `app/pipeline.py` | Treinamento e cultura |

## 3. Cadeia de suprimentos e segredos

- O núcleo e a CLI usam só a biblioteca padrão do Python, e um teste barra pacote de fora. A API tem as versões fixas em `services/matching-api/requirements-api.txt`, publicadas há pelo menos duas semanas em 04/11/2026; as ferramentas de desenvolvimento são `pytest` 8.3.3 e `ruff` 0.7.0.
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

Construir autenticação e limite de requisições com a API, sobre a RLS já testada; fixar as ações da CI por hash; testar o Gemini com chave contra os 10 tipos de ataque; mitigar o viés geográfico; validar com jurídico a classificação de risco, o enquadramento na 2.460 e a situação da 2.462 ([docs/conformidade](conformidade/README.md)).
