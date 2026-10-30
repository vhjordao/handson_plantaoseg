# Solução de IA

Desenho da solução de IA do PlantãoSeguro para a Etapa 2: o que a IA faz, o que o código faz, por que cada escolha e como se mede. O que roda hoje está na PoC mínima (`services/matching-api`); o que não roda está marcado como **desenho**. Tudo é simulação com dados sintéticos.

![Fluxo da solução](figuras/fluxo-solucao.svg)

## 1. Entrada, processamento de IA, saída e usuário

| Etapa | Entrada | Processamento | Saída | Usuário | Estado |
| --- | --- | --- | --- | --- | --- |
| 1-2 Extração | Texto livre da vaga | **NLP**: Gemini propõe os campos; regras são linha de base e fallback | Unidade, especialidade, início, fim, urgência | Coordenador | Regras rodam; Gemini **não testado** com chave |
| 3 Conferência | Campos extraídos | Nenhum (decisão humana) | Campos confirmados | Coordenador | Na PoC, mostrado no terminal; a tela é evolução futura |
| 4 Filtro | Campos + cadastro + agenda conhecida | **Regras em código**: CRM, especialidade, raio, disponibilidade, jornada | Elegíveis e, por excluído, a regra | Coordenador | Roda |
| 5 Ranking | Elegíveis + histórico até o pedido | **ML**: regressão logística em 7 variáveis | Top 5 com score | Coordenador | Roda |
| 6 Explicação | Fatores do modelo | Texto fixo; Gemini só **reescreve** com validação | Motivo e alertas por candidato | Coordenador | Template roda; Gemini não testado |
| 7 Aprovação | Top 5 | Nenhum (decisão humana) | Aprovados | Coordenador | Roda (registro) |
| 8 Auditoria | Cada passo | Registro encadeado por hash | Trilha verificável | Comissão de IA, auditoria | Roda |
| Oferta e contestação | Aprovados | Cascata no n8n; contestação do médico | Aceite, check-in, resposta | Médico | **Desenho**, evolução futura |

## 2. Por que IA, e onde não

A IA entra onde há **texto livre** e **incerteza**; onde a resposta tem de ser exata e auditável, é código (Excelência Operacional: automatizar o que é regra, usar ML para o que é estimativa, NLP para o que é linguagem).

| Etapa | Usa IA? | Por quê | Alternativa descartada e motivo |
| --- | --- | --- | --- |
| Extração do texto | Sim (NLP) | Os pedidos variam: abreviações, erros, datas relativas, informação faltando | Formulário rígido: reduz a adoção. Só regras: acerta tudo em texto gerado por modelo, mas é otimista (circularidade) e frágil em texto real |
| Filtro de elegibilidade e jornada | **Não** | Regra exata, testável e auditável; erro aqui é risco assistencial | LLM decidindo regras: não determinístico e não auditável |
| Ranking | Sim (ML simples) | Combina sinais (distância, preferência, histórico) que uma pessoa pondera "no olho" | Só heurística: é o baseline; o modelo ganha 3,5 pontos percentuais. LightGBM: sem ganho demonstrado e perde a leitura por peso |
| Explicação | Quase não | Os fatores já são conhecidos; o LLM só pode reescrever | LLM gerando o motivo livremente: pode inventar motivo |
| Aprovação | **Não** | Res. CFM 2.454, Art. 15: a solução não é soberana e a supervisão humana é obrigatória | Aprovação automática: viola o princípio do projeto |
| Previsão de vagas descobertas | Evolução futura | Não é necessária para o núcleo | Fica para a Etapa 3 |

## 3. Ranking

**Variáveis** (7, lista fechada em `app/ranking/features.py`, calculadas no instante da oferta com `resolved_at < t`): especialidade, distância, horas da vaga cobertas pela disponibilidade, taxa de aceite e de comparecimento nos últimos 90 dias (suavizadas), horas desde o último plantão e preferência de período.

**Fora do ranking, por desenho:**

- pagamento e valor do plantão (Res. CFM 2.460; teste na CI);
- atributos protegidos: gênero, faixa etária e zona de residência (usados só para auditar viés);
- **carga recente** (`shifts_last_30d`) e **exposição** (`offers_received_30d`): em simulação não melhoram o top-5 (71,2% com e sem elas), a carga ganhava peso positivo por confundimento (quem é confiável aceita mais plantões) e a exposição pode realimentar viés. Viram variáveis de contexto: a carga alta vira **alerta de jornada**.

**Baseline:** 70% proximidade (relativa ao raio do médico) e 30% cobertura da vaga. **Modelo:** regressão logística com padronização e regularização L2, treinada no passado e testada no período seguinte (teste temporal a partir de 01/08/2026).

**Resultados em simulação** ([completo](resultados/metricas-ranking.md)):

| Medida | Baseline | Modelo | Oráculo | Sorteio |
| --- | ---: | ---: | ---: | ---: |
| AUC no teste (ofertas observadas) | 0,702 | 0,762 | n/d | n/d |
| Chance média de sucesso no top-5 (392 vagas, cerca de 50 elegíveis cada) | 67,7% | 71,2% | 75,8% | 52,9% |

A diferença modelo menos baseline é de 3,5 pontos percentuais (erro-padrão 0,22). A **avaliação contrafactual** só é possível porque o simulador conhece a chance verdadeira; em dados reais a medida seria outra (AUC e recomendação revisada por humanos).

**Concentração (indicador da Entrega 1):** os 10% de médicos mais recomendados ocupam 50,7% dos lugares do top-5 no modelo (61,2% no baseline), e 121 dos 257 elegíveis (47%) nunca aparecem. Médicos das zonas leste e oeste quase não são recomendados (razão de participação de 0,01), porque a distância pesa. Mitigações a estudar: limitar o peso da distância, rodízio entre elegíveis equivalentes e revisão humana da lista.

## 4. LLM com Gemini

**Onde entra:** só em duas etapas estreitas, **sem ferramentas e sem segredos**: extrair os campos e reescrever a explicação. Modelos (ADR 0003): `gemini-3.5-flash-lite` (extração e explicação) e `gemini-3.8-flash` (casos ambíguos). A interface fica atrás de `LLMClient`, para o resto do sistema funcionar sem LLM.

**Prompt** versionado (`extracao-v1`): trata o texto entre `<pedido>` e `</pedido>` como **dado não confiável**, pede JSON com 5 chaves e informa unidades e datas válidas. A cópia exata está em [teste-manual-gemini.md](teste-manual-gemini.md).

**Defesa em camadas** (`app/llm/guardrails.py`):

1. A entrada é limpa: caracteres de controle e invisíveis, marcadores do prompt e excesso de tamanho (500 caracteres).
2. Texto com **sinal de injeção** (padrões como "ignore as regras", chave, valor, JSON forjado, papel falso) **nunca chega ao LLM**; só as regras rodam.
3. A saída do LLM só vale se passar por um **esquema fechado**: chaves exatas, valores de listas fixas, unidade conhecida, datas coerentes e na janela, duração até 24 h. Qualquer desvio cai nas regras.
4. A reescrita da explicação só vale se **não acrescentar** número, fator, valor, CRM, telefone ou nome.
5. Nome, CRM e telefone não existem no prompt (testado). A trilha de auditoria não aceita campos de dado pessoal.

**Os 10 tipos de ataque** (gerados em `app/synthetic/texts.py`, 6 de cada nos dados, 60 no total):

| Tipo | O que tenta | Defesa | Resultado nos testes |
| --- | --- | --- | --- |
| `ignore_rules` | Mandar ignorar as regras | Detecção de injeção; LLM não é chamado | Sinalizado |
| `leak_secret` | Pedir chave e variáveis de ambiente | Idem; o prompt não tem segredo | Sinalizado |
| `inject_payment` | Ordenar por valor ou menor valor | Idem; o ranking não tem campo de pagamento | Sinalizado |
| `forge_fields` | Forjar o JSON de saída | Idem; esquema fechado rejeita campo extra | Sinalizado e rejeitado |
| `oversize` | Texto enorme | Limite de 500 caracteres e detecção | Sinalizado |
| `control_chars` | Caracteres de controle e invisíveis | Limpeza e detecção | Sinalizado |
| `language_switch` | Trocar de idioma e pedir o prompt | Detecção | Sinalizado |
| `role_play` | Assumir papel de administrador | Detecção | Sinalizado |
| `pii_exfiltration` | Pedir nome, CRM e telefone | Detecção; o prompt não os contém | Sinalizado |
| `prompt_leak` | Pedir as instruções iniciais | Detecção | Sinalizado |

**O que isso prova e o que não prova.** Nos 400 pedidos sintéticos, 60 de 60 ataques são sinalizados e 0 de 340 pedidos normais são sinalizados por engano. Doze saídas maliciosas de um LLM comprometido (campo extra, unidade ou especialidade inventada, data no passado, fuso, duração de 40 h, texto fora do JSON) são rejeitadas pelo esquema. **Não prova** que o Gemini resista a um ataque novo: isso exige a chave e o teste manual, e o texto adversarial real será mais variado que o gerado por modelos.

**Fallback:** sem chave, com falha do serviço ou com resposta inválida, a extração usa as regras e a explicação usa o texto fixo; a recomendação nunca depende do LLM.

**Custo estimado:** 200 chamadas de 2.000 tokens de entrada e 500 de saída custam cerca de US$ 0,37 no Flash-Lite e US$ 0,68 no 3.8 Flash (preços do Google lidos em 28/10/2026; a saída inclui tokens de raciocínio e pode ser maior). A camada gratuita só recebe dado sintético; a demo com plateia usa a paga (ADR 0003).

## 5. Contestação e avaliação de impacto (desenho)

- **Contestação (Res. 2.454, Anexo I, XX):** o médico contesta uma recomendação ou exclusão; o coordenador responde; texto, resposta e prazo ficam em `contestations` e na trilha. Nenhuma decisão derivada da IA é definitiva sem possibilidade de correção. Não construída.
- **Avaliação de impacto algorítmico (Anexo I, XIII):** documento periódico com a classificação de risco, os grupos afetados, as métricas de viés (participação e concentração) e as medidas de mitigação; esboço em [seguranca-ameacas.md](seguranca-ameacas.md).

## 6. Avaliação e metas

| Indicador | Como se mede | Linha de base | Resultado (simulação) |
| --- | --- | --- | --- |
| Qualidade do ranking | Chance média de sucesso no top-5 e AUC, teste temporal | Baseline heurístico | +3,5 pontos percentuais; AUC 0,762 contra 0,702 |
| Violação de jornada nas recomendações | Testes do filtro | n/d | 0 (por regra e por teste) |
| Ranking influenciado por pagamento | Teste na CI | n/d | 0 |
| Extração por regras | Acerto dos 5 campos contra o gabarito | n/d | 100% em pedidos formais, abreviados e com erros; nos 45 ambíguos nenhum fica completo, com 53% dos campos deixados em branco para o coordenador e 4% errados |
| Injeção de prompt | 10 tipos, 60 pedidos | n/d | 60 de 60 sinalizados |
| Tempo de preenchimento (meta de 50% de redução) | Não mensurável em dados sintéticos | Entrevistas (Etapa 3) | Hipótese a validar |

## 7. Ferramentas e alternativas

| Escolha | Alternativa | Por que esta |
| --- | --- | --- |
| Gemini (decisão do Victor) | Claude | ADR 0003 |
| Regressão logística em Python puro | scikit-learn, LightGBM | Sem dependência, explicável por peso; sem ganho demonstrado nos outros |
| Linha de comando | API e tela | Protótipo adiado (ADR 0004) |
| Trilha em arquivo com hash | Tabela `audit_log` no Postgres | Equivalente para a PoC; a tabela entra com o banco |
| Esquema fechado escrito à mão | Pydantic | Sem dependência na PoC; Pydantic entra com a API |

## 8. Limites

O modelo aprende o simulador; o Gemini não foi exercitado; a distância cria viés geográfico; a extração por regras é otimista; contestação e avaliação de impacto não estão construídas; os limites de jornada são configuração do projeto, não norma verificada.
