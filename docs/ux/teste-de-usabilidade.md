# Roteiro do teste de usabilidade da plataforma

- **Para quê:** a área "Experiência" da Etapa 3 pede jornada e interface com evidência ([A4-4](../rastreabilidade-professor.md)). Este roteiro mede se coordenadores e médicos conseguem usar a plataforma e entender **por que** a IA sugeriu cada nome.
- **Quem aplica:** os colegas do grupo, com o Claude Code só na preparação. **Quando:** a tarefa 1 (coordenador) já pode ser aplicada no link público; as tarefas do médico ficam para depois da fase 4 do [roteiro](../roteiro-ate-o-mvp.md). É opcional (passo E.2): se o grupo não puder aplicar, o documento usa uma avaliação pelas diretrizes de interação humano-IA e diz isso.
- **O que não se conclui:** com 3 a 5 pessoas e dados sintéticos, os números abaixo são **indicativos**. Não generalize, não compare com outros produtos e não chame de "resultado real". As metas são hipóteses a testar, não resultados.

## 1. Metas a testar

| Tarefa | Quem | Dispositivo | Meta de tempo | Critério de sucesso |
| --- | --- | --- | --- | --- |
| 1. Criar e aprovar uma vaga | Coordenador | Computador | até 90 s | Chega à oferta aprovada **e** diz por que o primeiro nome foi sugerido e por que alguém ficou de fora |
| 2. Aceitar uma oferta | Médico | Celular | até 30 s | Aceita a oferta e diz o que acontece depois |
| 3. Contestar uma recomendação | Médico | Celular | até 60 s | Descobre sozinho como contestar, envia e vê o protocolo |
| Questionário SUS | Todos | Qualquer | pontuação de 80 ou mais | Resposta completa aos dez itens |

Critério de aceite sugerido pelo wireframe (`docs/wireframes/README.md`): **4 em 5** pessoas entendem o motivo e a regra sem ajuda.

## 2. Participantes e consentimento

- **3 a 5 pessoas por papel**, de preferência quem já coordena escala ou faz plantão. Sem identificação: use um código ("C1", "M2").
- **Consentimento (ler em voz alta):** "Estamos testando uma plataforma de um trabalho acadêmico, não você. Nada aqui é real: os dados são inventados. Você pode parar quando quiser. Anotamos o que você fala e o tempo, sem o seu nome. Posso gravar a tela? Pode dizer que não."
- **Não digite dados reais.** A plataforma avisa, e o facilitador repete.
- **Fichas preenchidas nunca entram no Git** (repositório público). Guarde em pasta fora do repositório e leve só os agregados para o documento da Etapa 3.

## 3. Preparação (10 minutos antes)

1. Abra a plataforma no link publicado, em janela nova, e confirme o aviso "Ambiente de demonstração".
2. Dispositivos: tarefa 1 em computador; tarefas 2 e 3 em um **celular de verdade** (não o emulador).
3. Entre como **coordenador** para a tarefa 1 e como **médico** para as outras. Anote a persona sorteada.
4. Cronômetro, folha de registro (seção 6) e, se a pessoa permitir, gravação de tela.
5. Dois facilitadores: um conduz, outro cronometra e anota. Nenhum dos dois ajuda a clicar.

## 4. Roteiro

**Abertura (2 min).** "Vou pedir três tarefas. Fale em voz alta o que está pensando, inclusive quando estiver em dúvida. Se travar, diga, mas eu não vou ajudar a clicar. Não há resposta errada."

**Tarefa 1: criar e aprovar uma vaga (coordenador).**

> "Você coordena a escala do Hospital Modelo Centro. Precisa de um pediatra para o plantão noturno de sexta, das 19h às 7h, com urgência alta. Escreva esse pedido do seu jeito, confira o que o sistema entendeu, escolha quem deve receber a oferta e aprove."

Observar: quantas vezes corrige os campos lidos; se percebe que a leitura é por regras; se entende o aviso de "chances parecidas"; se usa "Ver motivos"; se aprova com alerta e escreve a justificativa; se o diálogo de aprovação é lido ou só confirmado.

Perguntas depois, **sem apontar o texto da tela**:
1. "Por que o primeiro nome foi sugerido?" (mede se o motivo foi compreendido)
2. "Quem ficou de fora e por quê?" (mede se a regra e a evidência bastam)
3. "O que aconteceria se você não tivesse clicado em aprovar?" (mede se a decisão humana ficou clara)

**Tarefa 2: aceitar uma oferta (médico).**

> "Você é um médico plantonista e acabou de receber uma oferta no celular. Veja se ela serve e responda."

Observar: se lê o "Por que você"; se acha o prazo; se entende que pode desfazer enquanto a oferta estiver aberta. Pergunta: "O que acontece agora?"

**Tarefa 3: contestar uma recomendação (médico).**

> "Você acha que essa oferta não faz sentido para você. Registre isso e descubra como saber a resposta."

Observar: se descobre "Contestar" **sem ajuda** (é a medida principal); se escolhe o motivo; se entende o protocolo e onde verá a resposta.

**Fechamento (5 min).** SUS (seção 5) e três perguntas abertas: "O que mais ajudou?", "O que mais atrapalhou?", "O que você mudaria primeiro?".

## 5. Questionário SUS

Escala de 1 (discordo totalmente) a 5 (concordo totalmente). **Aviso:** a tradução abaixo é **provisória**, feita pelo grupo a partir do original em inglês (Brooke, 1996, "SUS: a quick and dirty usability scale"). Antes de publicar qualquer pontuação, **cite uma versão validada em português do Brasil** (fonte a conferir pela equipe) ou diga que a tradução é do grupo.

1. Acho que gostaria de usar este sistema com frequência.
2. Achei o sistema mais complexo do que precisava.
3. Achei o sistema fácil de usar.
4. Acho que precisaria da ajuda de uma pessoa técnica para usar este sistema.
5. Achei que as várias funções do sistema estavam bem integradas.
6. Achei que havia inconsistência demais no sistema.
7. Imagino que a maioria das pessoas aprenderia a usar este sistema muito rápido.
8. Achei o sistema muito trabalhoso de usar.
9. Senti-me muito confiante ao usar o sistema.
10. Precisei aprender muita coisa antes de conseguir usar este sistema.

**Pontuação:** nos itens ímpares, subtraia 1 da resposta; nos pares, subtraia a resposta de 5; some os dez valores e multiplique por 2,5 (0 a 100). Guarde também cada item, não só o total.

## 6. Folha de registro (uma por pessoa)

| Campo | Tarefa 1 | Tarefa 2 | Tarefa 3 |
| --- | --- | --- | --- |
| Código da pessoa e papel | | | |
| Sucesso (sim, parcial, não) | | | |
| Tempo (s) | | | |
| Erros (e de que tipo) | | | |
| Pediu ajuda? Quantas vezes | | | |
| Frases literais que chamaram atenção | | | |
| A pessoa explicou o motivo e a regra sem ajuda? | | | |

Erros mais úteis de anotar: corrigiu campo lido; clicou em "Pular" sem querer; ignorou o alerta de jornada; não achou "Contestar"; aprovou sem ler os motivos.

## 7. Como analisar

1. Por tarefa: taxa de sucesso, tempo (mediana, não média, com tão poucas pessoas) e os erros que se repetiram em **duas ou mais** pessoas.
2. SUS: a pontuação de cada pessoa e a mediana, sem tirar conclusões com menos de cinco respostas.
3. Compare com as metas da seção 1, **dizendo que são hipóteses** e quantas pessoas foram.
4. Cada problema encontrado vira uma linha com a tela, a frase da pessoa, a gravidade e a correção proposta; os graves viram tarefas antes do congelamento de 13/11.
5. No documento da Etapa 3, escreva as limitações com franqueza: amostra pequena, dados sintéticos, ambiente de demonstração e facilitadores do próprio grupo.
