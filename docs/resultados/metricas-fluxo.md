# Fluxo recomendado contra o processo manual (simulação)

> **Simulação.** Os dados são sintéticos e as premissas de tempo são do grupo, sem fonte externa. O resultado mostra de onde vem o ganho dentro do simulador; não é evidência de quanto tempo um hospital real economizaria.

## Como foi medido

- **Processo manual:** o que o gerador registrou. A coordenação sorteia quem chamar, com mais chance para quem mora perto e para quem já está no hospital (dobra), checando só CRM e especialidade: não olha disponibilidade, raio nem jornada.
- **Fluxo recomendado:** nas mesmas 392 vagas do período de teste (a partir de 2026-08-01), chama os médicos que passam no filtro de regras, na ordem de cada método, até alguém aceitar (no máximo 8 ofertas). A chance de aceite de cada médico é a verdadeira do simulador.
- **Tempos (premissas do gerador):** primeira oferta de 5 a 30 min depois da publicação; resposta média de 20 min; entre quem não aceita, 70% recusa e 30% deixa expirar (60 min); a próxima oferta sai de 1 a 10 min depois. São 100 repetições por vaga e ordem, com semente fixa.

## Linha de base: o processo manual simulado

| Indicador | Ano inteiro (2.448 vagas) | Período de teste (392 vagas) |
| --- | ---: | ---: |
| Vagas sem cobertura | 4,8% | 5,4% |
| Ofertas por vaga | 3,09 | 3,31 |
| Tempo até preencher, média (min) | 103 | 110 |
| Tempo até preencher, mediana (min) | 83 | 85 |
| Tempo até preencher, 90% das vagas até (min) | 214 | 236 |
| Preenchidas com 24 h ou mais de antecedência | 68,8% | 70,7% |
| Vagas já publicadas com 24 h ou mais (teto desse indicador) | 74,5% | 76,0% |
| Aceites que violam a jornada | 1,3% (30 de 2.330) | 1,3% (5 de 371) |
| Ofertas recebidas pelos 10% de médicos mais ofertados | 27,7% | 31,1% |

## Fluxo recomendado, nas mesmas vagas de teste

| Ordem de chamada | Ofertas por vaga | Sem cobertura | Tempo médio (min) | Mediana (min) | Preenchidas com 24 h ou mais |
| --- | ---: | ---: | ---: | ---: | ---: |
| Processo manual (observado) | 3,31 | 5,4% | 110 | 85 | 70,7% |
| Regras + sorteio entre elegíveis | 1,82 | 0,2% | 65 | 48 | 74,3% |
| Regras + baseline heurístico | 1,41 | 0,0% | 51 | 40 | 74,8% |
| Regras + modelo | 1,32 | 0,0% | 47 | 38 | 74,8% |
| Oráculo (teto) | 1,23 | 0,0% | 44 | 36 | 74,9% |

## O que isso mostra

- **Tempo:** a média até preencher a vaga cai de 110 para 47 min (**57% a menos**; mediana de 85 para 38 min, 55% a menos) e as ofertas por vaga, de 3,31 para 1,32 (60% a menos). A meta da Entrega 1 era reduzir 50% o tempo.
- **De onde vem o ganho:** só o filtro de regras (sorteio entre elegíveis) já leva a média a 65 min (41% a menos), ou seja, 72% do ganho vem de não chamar quem não poderia aceitar. O modelo tira mais 7% do tempo do baseline heurístico (51 para 47 min).
- **Antecedência:** 76,0% das vagas já nascem com 24 h ou mais, e esse é o teto. O processo manual preenche com antecedência 70,7% delas e o fluxo recomendado, 74,8% (4,1 pontos percentuais a mais). A meta de +20 pontos não é alcançável só com a recomendação: depende de publicar a vaga antes, isto é, da previsão de vagas descobertas (evolução futura).

## Concentração das ofertas

Parcela recebida pelos 10% de médicos mais ofertados ou recomendados (30 médicos).

| Medida | Parcela |
| --- | ---: |
| Processo manual: ofertas feitas (período de teste) | 31,1% |
| Baseline heurístico: lugares do top-5 | 61,2% |
| Modelo: lugares do top-5 | 50,7% |
| Baseline heurístico: ofertas efetivas se a cascata seguir a ordem | 90,5% |
| Modelo: ofertas efetivas se a cascata seguir a ordem | 82,1% |
| Modelo: só a primeira oferta de cada vaga | 92,3% |

Recomendar por ordem **concentra mais** que o processo manual: quem lidera o ranking é chamado primeiro em vagas parecidas. A estimativa de ofertas efetivas é superior ao real, porque cada vaga é avaliada isoladamente e quem seria escalado não fica ocupado para as seguintes; mesmo assim a direção é clara. Mitigações a estudar na Etapa 3: rodízio entre elegíveis equivalentes, limite de ofertas por médico e menor peso da distância.

## Limites

- O processo manual simulado é uma premissa do grupo e não checa disponibilidade; um coordenador real pode ser melhor ou pior, e só as entrevistas dirão.
- A chance de aceite dos elegíveis é a verdadeira do simulador; no mundo real ela é desconhecida, e o modelo a estima com erro.
- Vagas sem cobertura próximas de zero no fluxo recomendado dependem dessa premissa e não devem ser lidas como promessa.
- O tempo de resposta e de expiração das ofertas são parâmetros do gerador (`FIRST_OFFER_DELAY_MINUTES`, `RESPONSE_MEAN_MINUTES`, `DECLINE_SHARE` e `NEXT_OFFER_GAP_MINUTES`).
