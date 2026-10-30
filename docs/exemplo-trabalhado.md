# Exemplo trabalhado: uma vaga, do texto livre à aprovação

> **Simulação.** Gerado por `python -m app.cli walkthrough` sobre os dados sintéticos; nomes, CRM e números são fictícios e nada tem validade médica ou legal. Cada passo mostra as contas para quem não vai rodar o código.

## Passo 1. O pedido em texto livre (entrada não confiável)

> Preciso de um pediatra para o plantão noturno de sexta, 19h às 7h, Hospital Modelo Centro, urgência alta

Data de referência ("hoje"): quinta, 01/10/2026 às 09h.

## Passo 2. Campos extraídos (o coordenador confere)

Fonte: **regras**. Sem chave do Gemini, o caminho por regras é o que roda; com a chave, o Gemini propõe os campos e o código só aceita a resposta se ela passar pelo esquema fechado (ver `docs/solucao-ia.md`).

| Campo | Valor extraído |
| --- | --- |
| Hospital | Hospital Modelo Centro |
| Especialidade | pediatria |
| Início | sexta, 02/10/2026 às 19h |
| Fim | sábado, 03/10/2026 às 07h |
| Urgência | alta |

## Passo 3. Filtro de regras (código, sem IA)

Dos 300 médicos, **65 são elegíveis** e 235 ficam de fora. Cada excluído mostra a primeira regra que o barrou, com a evidência:

| Regra | Excluídos | Exemplo e evidência |
| --- | ---: | --- |
| Especialidade diferente da vaga | 131 | id `20c56bf6`: especialidade `clinica_medica` (secundária: `None`) |
| Sem disponibilidade declarada para o horário da vaga | 64 | id `43fcf43c`: disponibilidade cobre 0 h de 12 h exigidas |
| Fora do raio de deslocamento do médico | 25 | id `63394f0e`: 17,7 km de distância; raio do médico: 10 km |
| CRM não está ativo | 15 | id `53905e4e`: situação do CRM simulado: `expired` |

Limites de jornada em vigor (configuração do projeto, não norma verificada): 24 h contínuas e 11 h de descanso. Os casos de borda estão em `tests/test_rules.py`.

## Passo 4. Variáveis e score do primeiro colocado

Candidato: **Felipe Ferraz Siqueira** (id `f4343f8e`, dado fictício). As 7 variáveis do ranking são calculadas só com o que já era conhecido antes do pedido. Cada uma é padronizada (valor menos a média do treino, dividido pelo desvio) e multiplicada pelo peso aprendido; a soma, mais o viés, passa pela função sigmoide.

| Variável | Valor | Padronizado (z) | Peso | Peso x z | Em relação à média dos elegíveis |
| --- | ---: | ---: | ---: | ---: | ---: |
| Especialidade (principal = 1; secundária = 0,5) | 1,00 | 0,22 | 0,154 | 0,035 | 0,033 |
| Distância até o hospital (km) | 1,41 | -1,36 | -0,430 | 0,586 | 0,525 |
| Horas da vaga cobertas pela disponibilidade | 12,00 | 1,10 | 0,822 | 0,905 | 0,000 |
| Taxa de aceite nos últimos 90 dias | 0,45 | 0,51 | 0,116 | 0,060 | 0,080 |
| Taxa de comparecimento nos últimos 90 dias | 0,83 | 0,93 | 0,010 | 0,010 | 0,010 |
| Horas desde o último plantão | 168,00 | 0,52 | 0,145 | 0,075 | 0,024 |
| Preferência de período coincide | 1,00 | 0,72 | 0,252 | 0,182 | 0,090 |

Viés do modelo: -1,057. Soma total = 0,795. Score = sigmoide(0,795) = **0,689** (o sistema mostrou 0,689).

A última coluna é o que vira motivo: só contam as variáveis em que o candidato está **acima da média dos elegíveis**. Variável igual para todos (como a cobertura da vaga) não explica por que este médico e não outro.

## Passo 5. Top 5, baseline e explicação

O baseline é o que uma coordenação faria no olho: mais perto e com a janela cobrindo a vaga. A tabela compara a posição de cada um dos 5 recomendados nos dois rankings.

| Posição no modelo | Posição no baseline | Médico | Score | Score do baseline | Alertas de jornada |
| ---: | ---: | --- | ---: | ---: | --- |
| 1 | 2 | `f4343f8e` | 0,689 | 0,934 | - |
| 2 | 9 | `5ae086d5` | 0,682 | 0,861 | - |
| 3 | 10 | `1bd5f9b3` | 0,670 | 0,853 | - |
| 4 | 6 | `d69d231d` | 0,662 | 0,905 | carga recente alta: 9 plantões nos últimos 30 dias |
| 5 | 16 | `41352c16` | 0,658 | 0,793 | - |

Explicações geradas (texto fixo a partir dos fatores; o Gemini só reescreve, e só se não acrescentar nada):

1. Recomendado porque mora a 1,4 km do hospital, prefere o período desta vaga e tem taxa de aceite estimada de 45% nos últimos 90 dias.
2. Recomendado porque mora a 3,0 km do hospital, tem taxa de aceite estimada de 56% nos últimos 90 dias e prefere o período desta vaga.
3. Recomendado porque mora a 3,2 km do hospital, tem taxa de aceite estimada de 50% nos últimos 90 dias e prefere o período desta vaga.
4. Recomendado porque mora a 1,4 km do hospital, prefere o período desta vaga e tem a especialidade principal da vaga.
5. Recomendado porque mora a 4,4 km do hospital, tem taxa de aceite estimada de 55% nos últimos 90 dias e prefere o período desta vaga.

## Passo 6. Decisão humana e trilha de auditoria

Recomendar não envia oferta. A oferta só pode sair depois da aprovação do coordenador, que fica registrada. Nesta execução a aprovação foi automática, **apenas para a demonstração**; no uso real é um clique humano.

| Seq | Quem | Ação | Hash anterior | Hash |
| ---: | --- | --- | --- | --- |
| 1 | system | recommendation_generated | 00000000 | 80ab3522 |
| 2 | system | explanation_generated | 80ab3522 | a4a81601 |
| 3 | system | explanation_generated | a4a81601 | d75404f7 |
| 4 | system | explanation_generated | d75404f7 | 9964c5d9 |
| 5 | system | explanation_generated | 9964c5d9 | afb5119c |
| 6 | system | explanation_generated | afb5119c | 395bcfce |
| 7 | coordinator | recommendation_approved | 395bcfce | fdaccb31 |

A cadeia de hash está íntegra (7 registros). Alterar ou apagar qualquer linha quebra a verificação (ver `tests/test_audit.py`). A trilha guarda só IDs pseudônimos e a versão do modelo (`logreg-v1`); nenhum nome, CRM ou telefone.

Resumo do resultado: o modelo recomendou com 68,9% de chance estimada para o primeiro colocado, em simulação; esse número vem do simulador e não prevê o mundo real.
