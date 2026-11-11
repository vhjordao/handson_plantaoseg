# Escala hospitalar: o que o motor e a API aguentam (simulação)

> **Simulação.** O motor foi medido com dados sintéticos replicados e as premissas de volume e de uso são nossas, sem dado real. Os tempos são do motor em Python, em um processo, numa máquina de desenvolvimento: valem pela proporção, e não pelo valor absoluto no servidor da apresentação. Gerado por `python -m app.cli scale`.

## Pergunta

O professor perguntou, na Entrega 3, se a solução e a arquitetura atual suportam o volume de um ambiente hospitalar. A medição de carga de 04/11 ([resultado](metricas-carga-api.md)) mostrou a API com 302 médicos. Aqui se mede o que ela não cobre e se confronta com o volume que cada porte de hospital pede.

## O motor com redes maiores

A rede simulada (300 médicos e 7.555 ofertas, um ano de histórico) foi replicada 1, 3, 10 e 30 vezes. Para cada tamanho, mediu-se o tempo de recomendar uma vaga (mediana de 12 vagas), o de reconstruir o índice de variáveis, que a API refaz depois de cada escrita, e a memória do mundo carregado.

| Médicos | Ofertas no histórico | Recomendar uma vaga (mediana / p95) | Reconstruir o índice | Memória do mundo |
| ---: | ---: | ---: | ---: | ---: |
| 300 | 7.555 | 3,9 ms / 4,5 ms | 10 ms | 4 MB |
| 900 | 22.665 | 12,0 ms / 13,6 ms | 36 ms | 11 MB |
| 3.000 | 75.550 | 43,8 ms / 49,6 ms | 174 ms | 37 MB |
| 9.000 | 226.650 | 130,0 ms / 163,4 ms | 504 ms | 111 MB |

- **O custo do motor cresce em linha reta com o número de médicos**, e é pequeno: com 9.000 médicos, recomendar uma vaga leva 130 ms. Quase todo o tempo de uma recomendação na API (276 ms na medição de 04/11) vem das idas e vindas ao banco, e não do motor.
- **O índice de variáveis é o item que mais pesa:** a API o reconstrói inteiro na próxima recomendação depois de qualquer escrita (`WorldCache`), e com 9.000 médicos isso leva 504 ms. É um ponto de otimização conhecido (atualizar o índice em vez de refazê-lo), não necessário nos portes P, M e G.
- **Memória:** cerca de 3,7 MB por 300 médicos com um ano de histórico. Os 512 MB do contêiner aguentam bem uma rede de milhares de médicos por vários anos de histórico, mas o histórico só cresce.

## O volume que cada porte pede

Premissas, todas à vista porque mudam o resultado: 10% dos médicos com a tela aberta no pico, cada coordenador com 3 telas de vaga abertas, 1.37 ofertas por vaga (simulação), 25% das vagas do mês publicadas em lote em 10 minutos (a escala mensal colada de uma vez) e consulta a cada 3 s (D7). Os tamanhos dos hospitais são escolhas nossas, não dado real: o que vale é onde cada limite estoura.

| Porte | Médicos | Vagas por dia | Telas de médico no pico | Leituras por segundo (hoje, com 4 por consulta) | Leituras por segundo (com 1 por consulta) |
| --- | ---: | ---: | ---: | ---: | ---: |
| P: Pequeno: 1 pronto-socorro | 150 | 6,0 | 15 | 25 | 7 |
| M: Médio: a rede simulada, 3 unidades | 300 | 6,7 | 30 | 50 | 14 |
| G: Grande: hospital de referência | 1.500 | 40,0 | 150 | 230 | 62 |
| R: Rede: 10 hospitais no mesmo sistema | 6.000 | 150,0 | 600 | 900 | 240 |

Uso de cada limite (abaixo de 50% é folga, até 100% é atenção, acima disso excede):

| Porte | CPU do servidor no lote | Leituras do Supabase (hoje) | Leituras (com 1 por consulta) | Limite de 30 chamadas por segundo por IP | Teto diário do Gemini | Memória da API |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| P | 1% (folga) | 6% (folga) | 2% (folga) | 5% (folga) | 6% (folga) | 14% (folga) |
| M | 1% (folga) | 12% (folga) | 3% (folga) | 8% (folga) | 7% (folga) | 14% (folga) |
| G | 9% (folga) | 53% (atenção) | 14% (folga) | 29% (folga) | 40% (folga) | 17% (folga) |
| R | 94% (atenção) | 209% (excede) | 56% (atenção) | 100% (excede) | 150% (excede) | 28% (folga) |

## Leitura

- **Um hospital grande (G) cabe no desenho de hoje no que depende de CPU e memória.** No lote da escala mensal, a CPU do servidor fica em 9% e a memória em 17%. O motor não é o gargalo.
- **O que aperta primeiro é a consulta a cada 3 segundos das telas.** Cada médico com a tela aberta faz 4 requisições por consulta (as ofertas, os médicos, as recomendações e as explicações), e o coordenador faz 6 (uma delas na API). Em G, são 230 leituras por segundo no pico, 53% do que o Supabase gratuito entregou na medição; em R, 900 por segundo, que **excede** o medido. Com uma requisição por consulta (as demais ficam guardadas na tela), G cai para 62 por segundo e R para 240.
- **Uma rede de dez hospitais (R) chega ao limite da CPU no lote:** 94% (2,0 ciclos de vaga por segundo de capacidade, contra 1,9 de demanda), sobretudo pela reconstrução do índice depois de cada escrita. É onde a otimização do índice passa a valer a pena.
- **O teto diário do Gemini (100 chamadas) cobre P, M e G e não cobre R (150 vagas por dia).** Em produção, o Gemini vai para a camada paga, como o documento da Entrega 3 já prevê.
- **O limite de 30 chamadas por segundo por IP aperta só na rede.** Só a API passa por ele (as telas leem o Supabase direto), mas a consulta da cascata do coordenador passa. Em G, o uso é de 29%; em R, de 100%, porque um hospital inteiro sai por um IP só. O valor se ajusta no `.env` do servidor.
- **Três limites não aparecem na conta e são de arquitetura:** (1) a API é um processo só, com o mundo em memória: dois processos teriam cópias diferentes, então ela não escala para os lados nem tem alta disponibilidade sem uma invalidação compartilhada; (2) o servidor é uma máquina só, sem redundância, escolha consciente para a apresentação; (3) o Supabase gratuito pausa por inatividade, não tem backup e não tem garantia de disponibilidade.

## O que muda em produção, em ordem

1. **Menos consultas por tela** (feito junto deste relatório): guardar na tela o que não muda entre consultas e limitar o histórico lido. Reduz as leituras para um quarto.
2. **Notificação em vez de consulta** (Supabase Realtime) ou uma consulta mais espaçada para quem não está esperando uma oferta. Reduz as leituras por ordem de grandeza.
3. **Supabase pago** (backup, sem pausa, disponibilidade contratada) e o limite por IP ajustado ao hospital.
4. **API com mais de um processo**, com a cópia do mundo invalidada por um aviso compartilhado (o Redis do n8n já está no servidor) e o índice de variáveis atualizado em vez de refeito.
5. **Servidor maior ou dois servidores** atrás do Traefik, depois do item 4.

## Limites desta medição

- É o motor, sem banco nem rede, numa máquina de desenvolvimento. O servidor (1 vCPU) é mais lento, e as idas ao banco dominam o tempo real de uma recomendação.
- As cópias da rede têm médicos iguais aos originais: o tempo do motor não depende dos valores, mas a diversidade real de agendas e distâncias pode mudar um pouco o filtro.
- Os tamanhos de hospital, a parcela online no pico e o lote mensal são premissas. O teto de leituras (431 por segundo) é o do Supabase gratuito numa consulta simples, com 40 simultâneas e sem platô: pode ser maior, e consultas reais com junções são mais pesadas.
- Não houve novo teste de carga no servidor: a medição de 04/11 continua sendo a única, e ela deve ser repetida em um piloto, com o tráfego real.
