# Ficha do componente: matching-api (motor de recomendação da PoC)

- **Frentes:** A3 (regras e ranking) e A4 (LLM com Gemini), mais a auditoria e a linha de comando.
- **Estado:** PoC mínima **executável por linha de comando**, sem tela, banco, n8n nem API HTTP (ADR 0004 e 0005). Atualizado em 30/10/2026.

## 1. O que é e qual dor resolve

É o núcleo do PlantãoSeguro: recebe o pedido de vaga em texto livre e devolve os médicos elegíveis, ordenados, com o motivo de cada um e a regra que barrou os demais. Resolve três dores da Entrega 1: a **vaga descoberta** (acha candidatos em segundos), a **seleção opaca** (cada recomendação vem com motivo e cada exclusão com a regra) e a **fadiga sem controle** (jornada e alertas em código). A IA recomenda; o humano decide (ADR 0002: este é o **núcleo** do escopo).

## 2. Como funciona

| Entrada | Processamento | Saída | Quem usa |
| --- | --- | --- | --- |
| Texto livre da vaga | Extração de campos: regras e, opcionalmente, Gemini com validação (`app/llm`) | Unidade, especialidade, início, fim e urgência | Coordenador, que **confere** |
| Campos conferidos + cadastro de médicos | Filtro determinístico de elegibilidade e jornada (`app/rules.py`) | Elegíveis e, por excluído, a regra que barrou | Coordenador |
| Elegíveis + histórico até o pedido | 7 variáveis no instante da oferta e regressão logística (`app/ranking`) | Top 5 com score | Coordenador |
| Top 5 + fatores | Texto fixo a partir dos fatores; Gemini só reescreve, se não acrescentar nada (`app/explain.py`) | Motivo por candidato e alertas de jornada | Coordenador |
| Decisão do coordenador | Aprovação e trilha encadeada por hash (`app/pipeline.py`, `app/audit.py`) | Registro auditável | Auditoria e Comissão de IA |

O que a IA faz e o que o código faz está em [docs/solucao-ia.md](../../docs/solucao-ia.md).

## 3. Como foi feito

1. Dicionário de dados ([v0.2](../../docs/dados/dicionario-de-dados.md)) como contrato entre as frentes.
2. Gerador sintético reprodutível e regras de qualidade (`app/synthetic`).
3. Filtro de regras com casos de borda de jornada, escritos primeiro como testes (`tests/test_rules.py`).
4. Variáveis no instante da oferta, com teste de que o futuro não vaza (`tests/test_ranking.py`).
5. Baseline heurístico, regressão logística por mínimos quadrados reponderados (IRLS) em Python puro e avaliação contra o baseline.
6. Explicação, extração e guardrails; depois a trilha de auditoria e a linha de comando.
7. Análise exploratória, exemplo trabalhado e CI que roda a PoC inteira.

Cada passo foi conferido com `ruff` e `pytest` antes do commit; a decisão sobre tirar carga recente do ranking veio de um experimento (71,2% com e sem a variável) registrado em `app/ranking/features.py`.

## 4. Código-chave

| Arquivo | O que faz | Trecho a entender |
| --- | --- | --- |
| `app/rules.py` | Elegibilidade e jornada, com a regra que barrou | `schedule_check`: conflito, cadeia de horas contínuas e descanso |
| `app/ranking/compute.py` | Variáveis sem vazamento do futuro | `resolved_at < t`: a própria oferta nunca entra na sua conta |
| `app/ranking/features.py` | Contrato das variáveis do ranking | `validar_features` barra pagamento e atributos protegidos |
| `app/ranking/model.py` | Regressão logística (IRLS) e contribuições | `contributions(..., reference)`: o que diferencia o candidato da média |
| `app/ranking/evaluate.py` | AUC, avaliação contrafactual e concentração | O simulador conhece a chance verdadeira (só vale em simulação) |
| `app/llm/guardrails.py` | Limpeza, detecção de injeção e esquema fechado de saída | `validate_extraction` rejeita qualquer desvio |
| `app/llm/extraction.py` | Extração por regras e camada do Gemini | O texto sinalizado nunca chega ao LLM |
| `app/explain.py` | Explicação e validação da reescrita | Números e fatores da reescrita têm de existir no texto-base |
| `app/audit.py` | Trilha só de inserção, encadeada por hash | `verify` acusa alteração ou remoção |
| `app/pipeline.py` | Une tudo; recomendar não envia oferta | `approve` só aceita quem foi recomendado |

## 5. Ferramentas e versões

| Ferramenta | Versão | Para quê | Por que esta e não outra | Custo |
| --- | --- | --- | --- | --- |
| Python (biblioteca padrão) | 3.12.10 local; 3.12 na CI | Todo o motor | Roda na CI e em qualquer máquina sem instalar pacote; a máquina do autor não tinha pip até 30/10 | 0 |
| pytest | 8.3.3 | Testes (147) | Padrão do ecossistema; os testes usam `unittest`, que o pytest também executa | 0 |
| ruff | 0.7.0 | Lint (E, F, I, UP, B) | Rápido e igual na CI e localmente | 0 |
| GitHub Actions | checkout@v4, setup-python@v5, upload-artifact@v4 | CI com 5 jobs | Já era a escolha do `docs/02` | 0 |
| Gemini (`google-genai`) | não instalado nem exercitado | Extração e reescrita, opcional | Decisão do Victor ([ADR 0003](../../docs/adr/0003-llm-do-produto-gemini.md)) | Estimado em menos de US$ 1 para 200 chamadas |
| Regressão logística própria | IRLS, até 15 iterações | Ranking | Explicável por peso e sem dependência; scikit-learn e LightGBM não mostraram ganho necessário nesta PoC | 0 |
| FastAPI, Next.js, n8n, Supabase | adiados | API, tela, cascata, banco | ADR 0004 (protótipo adiado) | 0 |

Desvio declarado em relação ao `docs/02`: a validação da saída do LLM usa um **esquema fechado escrito à mão** (biblioteca padrão), e não Pydantic; o Pydantic entra quando a API for construída.

## 6. Como rodar e testar

```
cd services/matching-api
python -m app.cli seed          # dados sintéticos e relatório de qualidade
python -m app.cli evaluate      # treina o modelo e compara com o baseline
python -m app.cli demo --yes    # fluxo completo para uma vaga
python -m pytest -q             # 147 testes
python -m ruff check .          # lint
```

Da raiz do repositório: `make poc` roda tudo na ordem; `make test` e `make lint` rodam as verificações. No Windows sem `python` no PATH: `make PYTHON="py -3.12" poc`.

## 7. Testes e resultados

- **147 testes** (`tests/`): regras e jornada, dados sintéticos e reprodutibilidade, variáveis sem vazamento, modelo, AUC e avaliação, extração, 10 tipos de injeção de prompt, saídas maliciosas do LLM, explicação, auditoria, pipeline, análise e exemplo trabalhado.
- **CI:** 5 jobs verdes (segredos, lint e testes, neutralidade econômica, PoC e Compose). O job da PoC confere que a execução em Linux gera os **mesmos checksums** dos CSV da máquina do autor.
- **Resultados em simulação** ([docs/resultados](../../docs/resultados/metricas-ranking.md)): AUC 0,762 (modelo) contra 0,702 (baseline); chance média de sucesso no top-5 de 71,2% contra 67,7% e 75,8% do oráculo, em 392 vagas de teste.

## 8. Dados e segurança

Só dados sintéticos; nome, CRM e telefone são fictícios e **nunca** entram no prompt, na trilha de auditoria nem nas variáveis (testado). Pagamento e valor do plantão ficam em tabela separada e fora do ranking (teste na CI). O texto da vaga é entrada hostil. Detalhes em [docs/seguranca-ameacas.md](../../docs/seguranca-ameacas.md).

## 9. Limitações e honestidade

- O modelo **reaprende o simulador**: os números são simulação, sempre ao lado do baseline.
- O Gemini **não foi exercitado contra o serviço real**; os testes cobrem validação, fallback e injeção com clientes falsos, não o comportamento do modelo.
- Plantões de 12 h em horários fixos fazem o descanso de 11 h quase nunca ser a regra que barra; o limite de 24 h contínuas é o que aparece.
- A distância funciona como proxy da zona de residência: zonas distantes quase não são recomendadas (ver a concentração em `docs/resultados`).
- Contestação e avaliação de impacto algorítmico estão desenhadas, não construídas.

## 10. Uso de IA no desenvolvimento

O código, os testes e os documentos foram escritos pelo Claude Code (Sonnet 5.5) com revisão e decisões do Victor; cada decisão de escopo está em um ADR. Correções que o próprio processo encontrou: o motivo "fez 9 plantões" aparecia a favor do candidato (virou alerta), o gerador de textos errava o período em pedidos ambíguos e a extração não reconhecia "ter" como terça-feira.

## 11. Próximos passos

API HTTP e tela do coordenador, cascata no n8n, contestação, previsão de vagas descobertas, mitigação do viés de distância (por exemplo, rodízio) e teste do Gemini com chave (ver [docs/teste-manual-gemini.md](../../docs/teste-manual-gemini.md)).
