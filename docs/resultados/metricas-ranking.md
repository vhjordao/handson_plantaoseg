# Resultados preliminares do ranking (simulação)

> **Simulação.** Os dados são sintéticos e o modelo aprende o simulador que os gerou (circularidade). Nada aqui é evidência de desempenho no mundo real. O que importa é a comparação com o baseline heurístico, nas mesmas condições.

Modelo: `logreg-v1` (regressão logística). Teste temporal: ofertas a partir de 2026-08-01; treino com as anteriores.

## Avaliação observacional (AUC)

Treino: 6259 ofertas (sucesso em 30,1%). Teste: 1296 ofertas (sucesso em 27,3%). Só há resposta de quem foi chamado pelo processo manual simulado (viés de seleção).

| Ranking | AUC no teste |
| --- | ---: |
| Baseline heurístico (distância e disponibilidade) | 0,702 |
| Modelo (regressão logística) | 0,762 |

## Avaliação contrafactual (possível só em simulação)

Para cada uma das 392 vagas do período de teste, o filtro de regras deixou em média 50 médicos elegíveis. Como o simulador conhece a chance verdadeira de cada um aceitar e comparecer, mede-se a **chance média de sucesso dos 5 recomendados** (equivale à precisão@5 esperada).

| Método | Chance média no top-5 | Em relação ao oráculo |
| --- | ---: | ---: |
| Oráculo (os 5 melhores de verdade) | 75,8% | 100,0% |
| Modelo | 71,2% | 94,0% |
| Baseline heurístico | 67,7% | 89,4% |
| Sorteio entre elegíveis | 52,9% | 69,8% |

Diferença modelo menos baseline: **3,5 pontos percentuais** (erro-padrão 0,22), pareada por vaga.

## Coeficientes do modelo (variáveis padronizadas)

| Variável | Peso |
| --- | ---: |
| Horas da vaga cobertas pela disponibilidade (`availability_overlap_hours`) | 0,822 |
| Distância até o hospital (km) (`distance_km`) | -0,430 |
| Preferência de período coincide (`night_shift_preference_match`) | 0,252 |
| Especialidade (principal = 1; secundária = 0,5) (`specialty_match`) | 0,154 |
| Horas desde o último plantão (`hours_since_last_shift`) | 0,145 |
| Taxa de aceite nos últimos 90 dias (`acceptance_rate_90d`) | 0,116 |
| Taxa de comparecimento nos últimos 90 dias (`attendance_rate_90d`) | 0,010 |

Pesos positivos aumentam o score. Os pesos refletem o treino em ofertas do processo manual, que chamou também médicos sem disponibilidade; por isso a cobertura da vaga pesa muito no treino e é constante entre os elegíveis (o filtro já exige cobertura total).

## Participação no top-5 em relação aos elegíveis

Razão = participação no top-5 dividida pela participação entre os elegíveis (1,00 = proporcional). Atributos de auditoria, **fora** do ranking.

| Atributo | Grupo | Elegíveis | Top-5 modelo | Razão modelo | Top-5 baseline | Razão baseline |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Gênero | F | 47,0% | 56,2% | 1,20 | 64,6% | 1,37 |
| Gênero | M | 53,0% | 43,8% | 0,83 | 35,4% | 0,67 |
| Faixa etária | 25-34 | 25,2% | 28,4% | 1,13 | 20,9% | 0,83 |
| Faixa etária | 35-44 | 34,5% | 28,6% | 0,83 | 27,1% | 0,79 |
| Faixa etária | 45-54 | 26,1% | 24,0% | 0,92 | 33,6% | 1,29 |
| Faixa etária | 55+ | 14,2% | 19,0% | 1,34 | 18,4% | 1,29 |
| Zona de residência | centro | 38,6% | 33,5% | 0,87 | 30,6% | 0,79 |
| Zona de residência | leste | 13,1% | 0,1% | 0,01 | 0,0% | 0,00 |
| Zona de residência | norte | 17,6% | 29,3% | 1,66 | 32,2% | 1,83 |
| Zona de residência | oeste | 10,5% | 0,1% | 0,01 | 1,1% | 0,11 |
| Zona de residência | sul | 20,3% | 37,0% | 1,82 | 36,1% | 1,78 |

A distância funciona como proxy da zona de residência: quem mora perto do hospital é recomendado mais vezes. É um critério operacional legítimo, mas precisa de monitoramento e de revisão humana (ver `docs/seguranca-ameacas.md`).
