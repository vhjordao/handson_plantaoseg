# Leitura do pedido pelo Gemini contra as regras (simulação)

> **Texto sintético ou escrito para o teste; camada gratuita.** O conjunto é pequeno e a medição é de um momento só (2026-11-13, modelo `gemini-3.1-flash-lite`): vale como indício, não como taxa. Gerado por `python -m app.cli extraction`.

## Pergunta

O teste manual de 05/11 ([teste-manual-gemini.md](../teste-manual-gemini.md)) leu só 3 pedidos normais: serviu para escolher o modelo e ver os ataques, mas não mede quanto o Gemini acerta. Este experimento mede isso e compara com as regras, que são a linha de base e o caminho de segurança.

## Como foi feito

- **Sintético (36 pedidos):** 12 de cada estilo (formal, abreviado e com erros de digitação), sorteados do conjunto de 400 pedidos do gerador com a semente 20261113, sem os ataques. O gabarito é o que o gerador guardou. As regras têm vantagem aqui, porque o texto vem de modelos de frase que elas conhecem.
- **Natural (24 pedidos):** escritos à mão, fora dos modelos de frase, em linguagem de coordenador: gírias, datas relativas ("quinta que vem"), informação faltando, hospital que não existe e especialidade que o sistema não tem. O gabarito marca só o campo que o texto permite afirmar e marca `None` onde o certo é não inventar. Quem escreveu os textos foi o Claude Code, não coordenadores reais.
- **Quatro leituras:** as **regras** sozinhas; o **Gemini** sozinho, só nos pedidos que ele respondeu e que passaram na validação do código; o **sistema**, que é o que a API faz (Gemini quando vale, regras quando o Gemini não responde ou a resposta é barrada); e o **sistema com o limite da API**, em que o Gemini só vale se respondeu em até 6 s. A medição deixou o Gemini levar até 30 s, para ver o que ele faz; a API desiste em 6 s e usa as regras, e é isso que o coordenador veria.
- **Campo certo:** igual ao gabarito, inclusive `None` (não inventar). **Pedido 100% certo:** todos os campos do gabarito certos.
- **Pausa de 6.5 s entre pedidos**, para ficar abaixo do limite por minuto da camada gratuita.

## Resultado: pedidos naturais

| Método | Lidos | Pedidos 100% certos | Campos certos | Inventou (certo era `None`) |
| --- | ---: | ---: | ---: | ---: |
| Regras | 24 de 24 | 20 de 24 (83%) | 95 de 100 (95%) | 0 |
| Gemini (só o que ele respondeu) | 21 de 24 | 21 de 21 (100%) | 91 de 91 (100%) | 0 |
| Sistema sem limite de tempo (Gemini, ou regras se falhar) | 24 de 24 | 24 de 24 (100%) | 100 de 100 (100%) | 0 |
| Sistema com o limite da API (6 s) | 24 de 24 | 22 de 24 (92%) | 98 de 100 (98%) | 0 |

| Campo | Regras | Gemini | Sistema | Sistema (6 s) |
| --- | ---: | ---: | ---: | ---: |
| Unidade | 24 de 24 (100%) | 21 de 21 (100%) | 24 de 24 (100%) | 24 de 24 (100%) |
| Especialidade | 24 de 24 (100%) | 21 de 21 (100%) | 24 de 24 (100%) | 24 de 24 (100%) |
| Início | 15 de 16 (94%) | 16 de 16 (100%) | 16 de 16 (100%) | 16 de 16 (100%) |
| Fim | 15 de 16 (94%) | 16 de 16 (100%) | 16 de 16 (100%) | 16 de 16 (100%) |
| Urgência | 17 de 20 (85%) | 17 de 17 (100%) | 20 de 20 (100%) | 18 de 20 (90%) |

## Resultado: pedidos sintéticos

| Método | Lidos | Pedidos 100% certos | Campos certos | Inventou (certo era `None`) |
| --- | ---: | ---: | ---: | ---: |
| Regras | 36 de 36 | 36 de 36 (100%) | 180 de 180 (100%) | 0 |
| Gemini (só o que ele respondeu) | 33 de 36 | 33 de 33 (100%) | 165 de 165 (100%) | 0 |
| Sistema sem limite de tempo (Gemini, ou regras se falhar) | 36 de 36 | 36 de 36 (100%) | 180 de 180 (100%) | 0 |
| Sistema com o limite da API (6 s) | 36 de 36 | 36 de 36 (100%) | 180 de 180 (100%) | 0 |

| Campo | Regras | Gemini | Sistema | Sistema (6 s) |
| --- | ---: | ---: | ---: | ---: |
| Unidade | 36 de 36 (100%) | 33 de 33 (100%) | 36 de 36 (100%) | 36 de 36 (100%) |
| Especialidade | 36 de 36 (100%) | 33 de 33 (100%) | 36 de 36 (100%) | 36 de 36 (100%) |
| Início | 36 de 36 (100%) | 33 de 33 (100%) | 36 de 36 (100%) | 36 de 36 (100%) |
| Fim | 36 de 36 (100%) | 33 de 33 (100%) | 36 de 36 (100%) | 36 de 36 (100%) |
| Urgência | 36 de 36 (100%) | 33 de 33 (100%) | 36 de 36 (100%) | 36 de 36 (100%) |

### Por estilo (pedidos 100% certos)

| Estilo | Pedidos | Regras | Gemini | Sistema |
| --- | ---: | ---: | ---: | ---: |
| Formal | 12 | 12 de 12 (100%) | 10 de 10 (100%) | 12 de 12 (100%) | 12 de 12 (100%) |
| Abreviado | 12 | 12 de 12 (100%) | 12 de 12 (100%) | 12 de 12 (100%) | 12 de 12 (100%) |
| Com erros de digitação | 12 | 12 de 12 (100%) | 11 de 11 (100%) | 12 de 12 (100%) | 12 de 12 (100%) |

## O serviço

- Estado de cada chamada ao Gemini: barrada duracao invalida: 2, ok: 54, sem resposta: 4.
- Demora das 56 chamadas que tiveram resposta: mediana de 1666 ms, 95% até 26153 ms, máxima de 28980 ms. 40 delas dentro do limite da API (6000 ms); as demais teriam caído nas regras na tela.

## Pedido a pedido (naturais)

| Caso | Texto | Regras | Gemini | Sistema (6 s) |
| --- | --- | --- | --- | --- |
| N01 | Pessoal, preciso de pediatra pro Centro amanhã à noite, das 19 às 7. Urgente! | certo | certo | certo |
| N02 | Furou o clínico do Norte no sábado, plantão diurno 7h-19h | certo | certo | certo |
| N03 | Alguém pro Sul na segunda de dia, 7 às 19, clínica médica, sem urgência | errou: Urgência | certo | certo |
| N04 | Hospital Modelo Centro precisa de pediatra hoje 19h até 7h da manhã, urgência alta | certo | certo | certo |
| N05 | pediatra plantão 12h noturno dom Norte | certo | certo | certo |
| N06 | Preciso cobrir quinta que vem, clínico, Sul, 19-7, urgência média | certo | certo | certo |
| N07 | Urgente!! pediatra Centro agora à noite | certo | sem leitura | certo |
| N08 | Falta médico no Norte sábado. | certo | certo | certo |
| N09 | Boa tarde, tem como arrumar um pediatra para o fim de semana no Sul? | certo | sem leitura | certo |
| N10 | plantão de terça, 19h às 07h, pediatria, H. Modelo Norte, urgência baixa | certo | certo | certo |
| N11 | Vaga aberta: clínica médica, Centro, quarta-feira, diurno das 7 às 19. Sem pressa. | errou: Urgência | certo | errou: Urgência |
| N12 | Preciso de um pediatra | certo | certo | certo |
| N13 | me ajuda a cobrir o plantão do dia 12/10, 19h às 7h, clínico, Centro, alta | errou: Urgência | certo | errou: Urgência |
| N14 | plantão noturno de sexta no Norte, pediatria, entra 19h sai 7h | certo | certo | certo |
| N15 | Pediatra, Sul, hoje, 7h às 19h, urgencia alta pf | certo | certo | certo |
| N16 | Clínico médico para amanhã de manhã, Centro, urgência média | certo | certo | certo |
| N17 | Quem pode cobrir o Sul na madrugada de domingo? Precisa ser pediatra. | certo | certo | certo |
| N18 | Sábado e domingo à noite, pediatra, Norte | certo | sem leitura | certo |
| N19 | urgencia alta - pediatria - centro - sex 19h/7h | errou: Início, Fim | certo | certo |
| N20 | Preciso urgente de médico clínico. Não sei ainda qual hospital nem o horário. | certo | certo | certo |
| N21 | Cobrir o plantão da próxima segunda, 19h às 7h, pediatra, Norte, urgência baixa | certo | certo | certo |
| N22 | Clínica médica no HM Sul, quarta, plantão diurno 7-19, urgência média | certo | certo | certo |
| N23 | Preciso de pediatra no Hospital Modelo Leste amanhã 19h às 7h | certo | certo | certo |
| N24 | cardiologista para o Centro sábado à noite | certo | certo | certo |

## Onde o Gemini errou nos pedidos sintéticos

Nenhum pedido sintético com resposta errada.

## Limites

- **Pequeno e de um momento só:** 60 pedidos, uma rodada. Uma diferença de um ou dois pedidos não é uma diferença. O serviço também varia: o 503 de alta demanda apareceu em 05/11.
- **O gabarito natural é nosso:** os 24 textos e as respostas certas foram escritos por quem projetou as regras (com o Claude Code), o que favorece as regras em alguns casos e o Gemini em outros. Não substituem pedidos de coordenadores reais.
- **O sintético é circular:** o texto vem de modelos de frase que as regras conhecem.
- **O coordenador sempre confere os campos** antes de seguir; este experimento mede quanto ele teria de corrigir, e não o risco de uma decisão errada.
