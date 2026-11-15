# PlantãoSeguro: falas da apresentação final

Uma fala por slide, em duas versões, para a apresentação de 17/11 (15 a 20 minutos e perguntas).

- **Versão de 18 minutos:** é a que vai para a sala. Cada slide tem o tempo-alvo e o relógio acumulado; a soma é 18:00, a cerca de 130 palavras por minuto.
- **Versão completa (sem minutagem):** a mesma fala com mais contexto e números. Serve para estudar, ensaiar e responder às perguntas; não cabe inteira no tempo.
- Os colchetes são marcações de cena, não se leem em voz alta. Os “Cuidados” são lembretes para quem fala.
- As mesmas falas estão nas notas de cada slide do deck.

## Versão de 18 minutos

| # | Slide | Tempo | Relógio |
|---|---|---|---|
| 1 | Abertura | 0:30 | 0:30 |
| 2 | O problema | 1:10 | 1:40 |
| 3 | A oportunidade da IA | 0:50 | 2:30 |
| 4 | A solução | 0:50 | 3:20 |
| 5 | Demonstração ao vivo | 4:35 | 7:55 |
| 6 | Os dados | 0:50 | 8:45 |
| 7 | Resultado técnico | 0:55 | 9:40 |
| 8 | Resultado no processo | 1:00 | 10:40 |
| 9 | A IA no projeto | 0:50 | 11:30 |
| 10 | O placar dos nove critérios | 0:45 | 12:15 |
| 11 | O valor para o negócio | 1:00 | 13:15 |
| 12 | Risco e governança | 0:45 | 14:00 |
| 13 | LGPD | 0:55 | 14:55 |
| 14 | Guardrails contra injeção de prompt | 1:00 | 15:55 |
| 15 | Implantação em seis meses | 0:55 | 16:50 |
| 16 | A recomendação | 0:40 | 17:30 |
| 17 | Encerramento | 0:30 | 18:00 |

### 1. Abertura · 0:30 (de 0:00 a 0:30)

Olá a todos. Quem foi chamado para este plantão, e por quê? [pausa] Hoje, na maioria dos hospitais, ninguém consegue responder a essa pergunta com segurança. O PlantãoSeguro nasce dessa lacuna, e a proposta cabe numa frase: a IA recomenda, o humano decide. Nos próximos minutos, vamos mostrar o problema, a solução funcionando, o que medimos e por que ela merece um piloto. E, no fim, voltamos a esta pergunta.

> **Cuidado:** Comece pela pergunta, sem ler o slide, e espere um segundo antes de seguir.

### 2. O problema · 1:10 (de 0:30 a 1:40)

Imagine uma sexta-feira, seis da tarde. O pediatra do plantão noturno avisa que não vai. A coordenadora abre o grupo de mensagens, liga para três nomes e anota numa planilha quem respondeu. A cena é ilustrativa, mas junta quatro dores. A vaga descoberta é percebida tarde. A seleção é opaca: ninguém sabe por que um médico foi chamado e outro não, e desde 2026 a Resolução 2.460 do CFM trata o favorecimento por vantagem econômica como infração ética. A fadiga não tem controle, porque não há um limite único de jornada. E o pagamento fica sem rastro, agora com sanção pela Resolução 2.462. O custo aparece em casos públicos: em 2025, a Justiça bloqueou 200 mil reais do município de Canoas, no Rio Grande do Sul, por escalas com lacunas. Mas sejamos claros: não existe dado nacional sobre plantões descobertos, e não fizemos entrevistas. O problema é uma hipótese forte, e é o piloto que vai confirmá-la.

> **Cuidado:** Diga que a cena é ilustrativa. A frase sobre não haver dado nacional nem entrevistas não pode sair.

### 3. A oportunidade da IA · 0:50 (de 1:40 a 2:30)

Onde a IA entra? Só onde há texto livre e incerteza. O pedido de vaga chega escrito de qualquer jeito, então um modelo de linguagem o lê. Quem tem mais chance de aceitar é incerto, então um modelo de machine learning simples estima isso. Todo o resto é regra exata ou decisão de uma pessoa: elegibilidade, jornada e prazo estão em código, e nenhuma oferta sai sem o clique do coordenador. A IA atua em três dos oito passos, de propósito. A nossa proposta: usar IA para recomendar e explicar quem chamar, a fim de cobrir vagas mais rápido e dentro das regras do CFM, medindo o sucesso pelo tempo até preencher a vaga.

> **Cuidado:** A frase da proposta é a da Entrega 1: diga devagar, é a tese do projeto.

### 4. A solução · 0:50 (de 2:30 a 3:20)

Na prática, cada vaga percorre oito passos. O coordenador escreve o pedido, o Gemini extrai cinco campos e a pessoa confere. As regras filtram quem pode ir, e cada excluído mostra a regra que o barrou. Um modelo de regressão logística ordena os elegíveis, com um rodízio para não chamar sempre os mesmos, e o motivo de cada nome sai dos fatores do próprio modelo. O coordenador aprova, a cascata chama o próximo quando o prazo vence, e tudo fica numa trilha de auditoria. Os contornos mostram quem age em cada passo: tracejado é a IA, contínuo é a pessoa, cinza é a regra. Vamos ver isso funcionando.

> **Cuidado:** Não é aula de algoritmo: aponte os contornos, não os detalhes técnicos.

### 5. Demonstração ao vivo · 4:35 (de 3:20 a 7:55)

[0:00, coordenador] Agora eu sou a coordenadora. Escrevo o pedido como escreveria no grupo e clico em “Ler a vaga”. A IA leu, e cada campo diz de onde veio: está no texto ou foi calculado. Eu confiro e sigo. [1:00, lista] Esta é a sugestão: cinco nomes, cada um com o seu motivo. E aqui está quem ficou de fora, e por qual regra. Nada fica escondido. [1:45, aprovação] Quem decide sou eu. O sistema sugere, não escolhe. Marco três nomes e aprovo; sem este clique, nenhuma oferta sai. [2:15, médico] Agora eu sou o médico. A oferta chegou com o prazo correndo e com o “Por que você”. Hoje não posso, então recuso, com um motivo. [2:55, cascata] De volta à coordenação: a recusa já chamou o próximo, sem ninguém olhar o relógio. [3:10, aceite] O segundo médico aceita, e a vaga fecha. [3:40, auditoria] E cada passo ficou registrado: a sugestão da IA, a minha aprovação, a recusa e o aceite, numa trilha encadeada por hash. Verifico a cadeia: íntegra. [4:10, só se houver tempo] O médico também pode contestar a recomendação, e a resposta fica na trilha. [fecho] Esse é o fluxo inteiro: a IA lê e sugere, as regras protegem, e a pessoa decide.

> **Cuidado:** Roteiro de cliques em docs/apresentacao/roteiro-da-demonstracao.md. Se algo travar por mais de 10 segundos: “vamos pelo plano B, que faz o mesmo caminho sem o servidor”, e siga no modo de demonstração. A demonstração tem 4:35 nesta versão: a contestação só entra se o relógio deixar. Corte a contestação antes de cortar a recusa e o aceite.

### 6. Os dados · 0:50 (de 7:55 a 8:45)

Tudo o que vocês viram roda sobre dados sintéticos: 300 médicos, 2.448 vagas e 7.555 ofertas, gerados com semente fixa ao longo de um ano. Usamos dados sintéticos porque não temos dados reais, e dado de médico é dado pessoal. Mas não pedimos confiança cega: cada premissa está declarada e comparada com fonte pública quando ela existe, e oito regras de qualidade passam sem nenhuma violação. A comparação também mostra onde erramos: o simulador tem menos pediatras mulheres do que a Demografia Médica de 2025, e deixa menos turnos descobertos do que uma fonte do Reino Unido. Ou seja, o nosso simulador é otimista, e nós dizemos isso.

> **Cuidado:** O “simulador é otimista” é um ponto forte: mostra que comparamos com a realidade.

### 7. Resultado técnico · 0:55 (de 8:45 a 9:40)

Agora, o resultado técnico, sempre em simulação. Medimos a chance de sucesso dos cinco primeiros sugeridos: a chance de alguém aceitar e comparecer. Um sorteio entre os elegíveis chega a 52,9%; uma regra simples, por proximidade e disponibilidade, a 67,7%; o nosso modelo, a 71,2%. São três pontos e meio acima da regra simples, e ele venceu nos 17 cenários com premissas diferentes. O LightGBM, que prometemos comparar, empatou, então ficamos com a regressão, que explica cada nome. E o Gemini acertou os 54 pedidos que leu, num teste de 60 com a resposta certa conhecida. Mas às vezes demora: 16 de 56 respostas passaram de seis segundos, e aí a leitura sai pelas regras.

> **Cuidado:** Se perguntarem do valor absoluto: o que vale é a comparação, porque o modelo aprende o simulador.

### 8. Resultado no processo · 1:00 (de 9:40 a 10:40)

O que isso muda no processo? No processo manual simulado, uma vaga leva em média 110 minutos para ser preenchida. Com o nosso fluxo, 47 minutos: 57% a menos, e com menos da metade das ofertas por vaga. Mas o número mais importante é outro: 72% desse ganho vem das regras, de não chamar quem não pode ir. O modelo acrescenta 7%. E o quadro ao lado mostra o que não funcionou: o LightGBM não ganhou; a zona menos atendida continua recebendo pouco; sem histórico, o modelo começa pior que a regra simples; e, se o coordenador real já chama só quem pode ir, o ganho cai de 57% para 27%. É por isso que o próximo passo é um piloto, e não uma venda.

> **Cuidado:** Mostrar o que não funcionou é o que a Aula 5 pede: “não esconda as limitações”.

### 9. A IA no projeto · 0:50 (de 10:40 a 11:30)

Como este é um MBA de IA, vale mostrar onde ela trabalhou. No produto, ela ranqueia os médicos e lê o pedido, e nos dois casos medimos contra uma alternativa simples. Na construção, usamos o Claude Code como par de programação, com regras claras: um pull request por fase, testes automáticos e nenhuma mudança sem aprovação humana. São mais de 600 testes e um diário com o uso de IA em cada passo. E a IA também errou: a conferência contra a fonte pegou números errados e frases que exageravam o que o sistema faz. Nos dois lugares, a regra foi a mesma: a IA propõe, e uma pessoa valida com evidência.

> **Cuidado:** Se perguntarem quanto foi escrito pela IA: a maior parte do código e dos textos; as decisões, as conferências e as aprovações foram do grupo.

### 10. O placar dos nove critérios · 0:45 (de 11:30 a 12:15)

Aplicamos a nós mesmos o Conselho de Investimentos da disciplina: nove critérios, cada um com uma cor, e nunca com nota. Temos evidência sólida em dois: a IA é necessária, porque medimos onde ela agrega, e a hipótese é testável, com metas e critérios de parada. Temos evidência parcial em seis: problema, processo, dados, viabilidade, valor e riscos. E falta evidência em um: o usuário. Não fizemos entrevistas, e o teste de usabilidade ficou desenhado, sem execução. Por esses critérios, a resposta honesta não é investir já. É validar: fazer um teste barato antes de escalar.

> **Cuidado:** Se alguém pintaria um critério de outra cor, acolha: é a conversa que o Conselho propõe.

### 11. O valor para o negócio · 1:00 (de 12:15 a 13:15)

E o valor para o negócio? Primeiro, o custo: um hospital sozinho custa cerca de 69 mil reais por ano, e 159 mil no primeiro ano, contando implantação, treinamento e parecer jurídico. A tecnologia é só 4 mil: o custo está em pessoas e em conformidade. O preço fica entre o custo e o valor. Para um hospital grande, com cerca de 40 vagas por dia, o preço sugerido é de 13,2 mil reais por mês, dividindo a plataforma com outros dois hospitais, e o retorno do hospital vai de 117% a 990%, conforme quantas vagas descobertas ele evita e quanto cada uma custa. Para o hospital pequeno ou médio, o preço não fecha. E há uma incógnita que não escondemos: o custo de uma vaga descoberta. É o piloto que vai medi-lo.

> **Cuidado:** Tudo neste slide é estimativa com premissas declaradas; os preços de tabela foram conferidos em 11/11.

### 12. Risco e governança · 0:45 (de 13:15 a 14:00)

Classificamos o risco como médio, pela Resolução 2.454 do CFM, e organizamos a governança pelas quatro funções do NIST AI RMF. Governar: o hospital controla os dados, o coordenador aprova cada oferta e não há comissão por vaga. Mapear: os afetados são os médicos ranqueados. Medir: a concentração das ofertas caiu de 82% para 36% com o rodízio, e a desigualdade por zona fica em alerta. Gerir: se o Gemini falhar, as regras assumem, e o médico pode contestar. E quem pode parar a IA? O coordenador, em qualquer oferta, porque nada sai sem o clique dele.

> **Cuidado:** Nunca diga “estamos em conformidade”: lemos as normas e propusemos; a validação é do jurídico.

### 13. LGPD · 0:55 (de 14:00 a 14:55)

Sobre a LGPD, lemos a lei e desenhamos o produto a partir dela, mas a validação é do jurídico. O hospital é o controlador, e a plataforma, a operadora; por isso, um modelo por hospital. Tratamos cadastro, agenda e histórico de ofertas: nenhum dado de paciente e nenhum dado sensível. As bases legais são o contrato ou o legítimo interesse, e a obrigação regulatória para auditar viés. O Gemini recebe só o texto da vaga, sem nome, CRM ou telefone. E o médico vê o que o sistema usa sobre ele e baixa os próprios dados. Antes de qualquer dado real, ainda faltam o prazo de retenção, o plano de incidentes e o relatório de impacto completo.

> **Cuidado:** Se perguntarem do art. 20: provavelmente não se aplica, porque a decisão não é só automatizada; passa a valer se a oferta virar automática.

### 14. Guardrails contra injeção de prompt · 1:00 (de 14:55 a 15:55)

Uma pergunta que sempre aparece é sobre injeção de prompt. Fizemos um red team: escrevemos ataques que o nosso detector nunca tinha visto, e ele pegava só dois de trinta e cinco. Ampliamos o detector e, para não nos enganarmos, medimos depois com vinte ataques novos: ele pega sete, sem marcar nenhum dos 386 textos normais. A lição é que um detector por padrões generaliza mal, e por isso ele é só a primeira de cinco camadas. O ataque que passa encontra um modelo sem ferramentas e sem dados pessoais, uma resposta que só vale em cinco campos fixos, um ranking que não lê o texto e uma pessoa que aprova. No teste com a chave real, o Gemini não obedeceu a nenhum dos dez tipos de ataque.

> **Cuidado:** O “7 de 20” é o número honesto; não troque pelo “35 de 35”, que foi usado para ajustar o detector.

### 15. Implantação em seis meses · 0:55 (de 15:55 a 16:50)

Como saberemos, em seis meses, se deu certo? Antes do piloto, assinamos a carta de intenção, o acordo de dados e o parecer jurídico. Nos três primeiros meses, o piloto roda em paralelo: o coordenador trabalha como sempre, e o sistema só calcula, medindo a linha de base real e o custo da vaga descoberta. No mês três há um portão: só seguimos se o ranking for melhor que a regra simples e a concentração estiver sob controle. Do quarto ao sexto mês, o coordenador passa a aprovar as ofertas pela ferramenta. E as metas e os limites de parada estão definidos antes, como mostra a tabela: se o tempo não cair pelo menos 20%, paramos.

> **Cuidado:** É a pergunta da Entrega 3: “como saberemos, depois de 6 meses, se deu certo?”.

### 16. A recomendação · 0:40 (de 16:50 a 17:30)

Por isso, a nossa recomendação é validar. Não pedimos para escalar: pedimos um piloto em paralelo, que custa pouco para provar ou refutar a ideia. Para isso, precisamos de três coisas: um hospital grande ou uma rede, com cerca de trinta vagas por dia; o financeiro do hospital, para medir quanto custa uma vaga descoberta; e o jurídico, para validar o desenho com o CFM e a LGPD. O investimento só é liberado com o portão do mês três, o parecer e o acordo de dados assinados.

> **Cuidado:** Se perguntarem por que não “investir”: porque a evidência de usuário é ausente e a de valor, parcial.

### 17. Encerramento · 0:30 (de 17:30 a 18:00)

Voltamos à pergunta do início: quem foi chamado para este plantão, e por quê? Com o PlantãoSeguro, isso deixa de ser um mistério: dá para saber, contestar e auditar. Não estamos propondo apenas automatizar uma escala. Estamos propondo mudar a forma como se decide quem é chamado, com velocidade, com explicação e dentro das regras de 2026. Obrigado. Ficamos à disposição para as perguntas.

> **Cuidado:** Diga a frase final sem pressa. O agradecimento é falado; o slide não termina em “obrigado”.

## Versão completa, sem minutagem

### 1. Abertura

Olá a todos. Quero começar com uma pergunta: quem foi chamado para este plantão, e por quê? [pausa] Em quase nenhum hospital alguém consegue responder a essa pergunta com segurança, e é dessa lacuna que nasce o nosso projeto. O PlantãoSeguro é uma plataforma que ajuda hospitais a cobrir plantões médicos mais rápido e com mais segurança, e a ideia cabe numa frase: a IA recomenda, o humano decide. Na interface, isso aparece em três contornos: o tracejado é o que a IA sugere, o contínuo é o que uma pessoa decide, e o cinza é a regra do sistema. Vamos mostrar o problema, a solução funcionando, o que medimos, quanto custa e por que acreditamos que ela merece um piloto. E, no fim, voltamos a esta pergunta.

### 2. O problema

Imagine uma sexta-feira, seis da tarde. O pediatra do plantão noturno avisa que não vai. A coordenadora abre o grupo de mensagens, liga para três nomes e anota numa planilha quem respondeu. A cena é ilustrativa, mas junta quatro dores reais. A primeira: a vaga descoberta é percebida tarde, sem nenhuma previsão que permita agir antes. A segunda: a seleção é opaca. Ninguém sabe por que um médico foi chamado e outro não, e desde 2026 a Resolução 2.460 do CFM trata como infração ética o favorecimento em escala por vantagem econômica. A terceira: a fadiga não tem controle, porque não há um limite federal único de jornada, e o CFM recomenda até 24 horas seguidas. A quarta: o pagamento fica sem rastro, e a Resolução 2.462 criou sanção para o atraso. Como isso se resolve hoje? Com grupos, planilhas, gestoras de equipes e aplicativos de vagas e escalas. Lá fora, a Flexzo já faz combinação por IA, o que mostra que existe mercado, mas ela não conhece as regras brasileiras. Pelo que essas empresas publicam, falta uma recomendação que se explique, que o médico possa contestar e que deixe uma trilha auditável. O custo do problema aparece em casos públicos: em 2025, a Justiça bloqueou 200 mil reais do município de Canoas, no Rio Grande do Sul, por escalas com lacunas. E aqui precisamos ser honestos: não existe dado nacional sobre plantões descobertos, e nós não fizemos entrevistas. O problema é uma hipótese forte, apoiada em casos públicos e em regras novas, e o primeiro trabalho do piloto é confirmá-la.

### 3. A oportunidade da IA

A pergunta que orienta esta parte é: por que IA, e não outra coisa? A nossa resposta é que a IA só entra onde há texto livre e incerteza. O pedido de vaga chega escrito de qualquer jeito, com abreviações, erros de digitação e datas como “quinta que vem”, e uma regra fixa quebra com isso; por isso um modelo de linguagem, o Gemini, lê o pedido. Saber quem tem mais chance de aceitar e comparecer é incerto e depende de vários fatores ao mesmo tempo, como distância, disponibilidade e histórico; por isso um modelo de machine learning simples faz essa estimativa. Onde o erro vira risco assistencial, como CRM, jornada, descanso e prazo, usamos regra em código, que é exata, testável e auditável. E a decisão final é sempre de uma pessoa, porque a Resolução 2.454 do CFM não admite que a IA seja soberana. No fluxo de oito passos, a IA atua em três, e isso é uma escolha de desenho. A nossa proposta, no formato da primeira entrega, é esta: usar IA para recomendar e explicar quem chamar em cada plantão, a fim de cobrir vagas mais rápido e dentro das regras do CFM, medindo o sucesso pelo tempo até preencher a vaga.

### 4. A solução

Na prática, cada vaga percorre oito passos. Primeiro, o coordenador escreve o pedido em texto livre. Segundo, o Gemini extrai cinco campos: unidade, especialidade, início, fim e urgência, sem acesso a ferramentas nem a segredos. Terceiro, a pessoa confere cada campo antes de seguir. Quarto, as regras filtram quem pode ir: CRM ativo, especialidade, agenda, raio de deslocamento, jornada e descanso, e cada excluído mostra a regra que o barrou. Quinto, um modelo de regressão logística com sete variáveis ordena os elegíveis pela chance de aceitar e comparecer, com um rodízio entre médicos de chance parecida para não chamar sempre os mesmos. Sexto, o motivo de cada nome sai dos fatores do próprio modelo, e não de um texto inventado. Sétimo, o coordenador aprova, e sem essa aprovação nenhuma oferta sai. Oitavo, a cascata, feita no n8n, chama o próximo aprovado quando o prazo vence, e tudo fica numa trilha de auditoria encadeada por hash. Por trás disso há uma interface web, uma API em Python, o banco no Supabase com controle de acesso por linha e o Gemini Flash-Lite. E por que regressão logística, e não um modelo mais sofisticado? Porque, quando comparamos com o LightGBM, ele empatou, e a regressão nos permite explicar o peso de cada fator para quem decide. Vamos ver isso funcionando.

### 5. Demonstração ao vivo

[Coordenador] Agora eu sou a coordenadora de escala. Escrevo o pedido como escreveria no grupo: um pediatra para o plantão noturno de quarta, das 19h às 7h, no Hospital Modelo Centro, com urgência alta. Clico em “Ler a vaga”. A IA leu, e cada campo diz de onde veio: se estava no texto ou se foi calculado. Se a IA demorar ou falhar, a leitura sai pelas regras, e a tela avisa. Eu confiro e sigo. [Lista] Esta é a sugestão: cinco nomes, cada um com o seu motivo em linguagem simples e a faixa de chance. Os alertas de jornada aparecem aqui. E aqui está quem ficou de fora, e por qual regra, com pseudônimo. Nada fica escondido. [Aprovação] Quem decide sou eu. Marco três nomes e aprovo. Se eu aprovasse alguém com alerta de jornada, o sistema me pediria uma justificativa, que iria para a trilha. Sem este clique, nenhuma oferta sai. [Médico] Agora eu sou o médico. A oferta chegou com o prazo correndo e com o “Por que você”, que mostra o que pesou para eu ser chamado. Hoje não posso, então recuso, escolhendo um de quatro motivos, sem texto livre. [Cascata] De volta à coordenação: a recusa já chamou o próximo da lista, sem ninguém precisar olhar o relógio; se ninguém responder no prazo, o n8n chama o próximo sozinho. [Aceite] O segundo médico aceita, e a vaga fecha. [Auditoria] E cada passo ficou registrado: a sugestão da IA, a minha aprovação, a recusa e o aceite, cada registro preso ao anterior por um hash. Verifico a cadeia aqui mesmo, no navegador: íntegra. [Contestação] O médico também pode contestar a recomendação. A coordenação responde, e a resposta fica na trilha. Em “Minha conta”, ele vê o que o sistema usa sobre ele e baixa os próprios dados. [Fecho] Esse é o fluxo inteiro: a IA lê e sugere, as regras protegem, e a pessoa decide.

### 6. Os dados

Tudo o que vocês viram roda sobre dados sintéticos: 300 médicos de duas especialidades, em três unidades, com 2.448 vagas e 7.555 ofertas ao longo de um ano, de outubro de 2025 a setembro de 2026. Eles saem de um simulador com semente fixa, que gera também a disponibilidade de cada médico, a chance de aceitar e de comparecer e 400 pedidos em texto livre, dos quais 60 são tentativas de ataque. Usamos dados sintéticos porque não temos dados reais, e dado de médico é dado pessoal. Mas não pedimos confiança cega. Oito regras de qualidade, como integridade, datas coerentes e ausência de dado real, passam sem nenhuma violação. E cada premissa está declarada e comparada com fonte pública quando ela existe. Essa comparação mostra onde erramos: o simulador tem menos pediatras mulheres do que a Demografia Médica de 2025, 46% contra 77%, e menos médicos com 55 anos ou mais. Quando calibramos com os dados públicos, a redução de tempo vai de 57% para 55%, então a conclusão se mantém. E, no comportamento, o simulador deixa 5,4% de turnos descobertos, contra 11,3% numa fonte do Reino Unido. Ou seja, o nosso simulador é otimista, e nós dizemos isso. Num hospital real, quase todo o dado de que o modelo precisa nasceria dentro da própria plataforma, no registro de ofertas e respostas.

### 7. Resultado técnico

Agora, o resultado técnico, sempre em simulação. O modelo usa sete variáveis calculadas no momento da oferta, como distância, disponibilidade para o horário e taxa de aceite nos últimos 90 dias. Valor do plantão, gênero, idade e zona de moradia ficam de fora do ranking, de propósito. Treinamos no passado e testamos no período seguinte, em 392 vagas. A medida é a chance de sucesso dos cinco primeiros sugeridos, ou seja, a chance de alguém aceitar e comparecer. Um sorteio entre os elegíveis chega a 52,9%. Uma regra simples, que pondera proximidade e disponibilidade, chega a 67,7%. O nosso modelo chega a 71,2%: três pontos e meio acima da regra simples, com erro-padrão de 0,22, e oitenta por cento do caminho até o teto teórico de 75,8%. Para ver se isso dependia do simulador, refizemos o mundo 17 vezes, com outras sementes, outros pesos e uma calibração com dados públicos: o modelo venceu em todos, de 2,1 a 6,4 pontos. Comparamos também com o LightGBM, em cinco mundos, inclusive um com regra não linear: ele ficou entre 1,3 ponto abaixo e 0,6 acima, ou seja, empatou, e ficamos com a regressão, que explica cada nome. Por fim, o Gemini: em 60 pedidos com a resposta certa conhecida, ele acertou os 54 que leu. Mas 16 de 56 respostas passaram de seis segundos, o limite em que a tela desiste e usa as regras. Com esse limite, o sistema acerta 22 de 24 pedidos escritos à mão, contra 20 das regras sozinhas. Ele ajuda, mas pouco.

### 8. Resultado no processo

O que isso muda no processo? Simulamos o fluxo inteiro nas mesmas 392 vagas, cem vezes cada uma, chamando os médicos na ordem de cada método até alguém aceitar. No processo manual simulado, uma vaga leva em média 110 minutos para ser preenchida. Com regras e sorteio, 65. Com regras e a regra simples, 51. Com regras e o modelo, 47: 57% a menos que o manual, com as ofertas por vaga caindo de 3,31 para 1,32 e as vagas sem cobertura de 5,4% para zero. Mas o número mais importante é outro: 72% desse ganho vem das regras, de simplesmente não chamar quem não pode ir. O modelo acrescenta 7% sobre a regra simples. E mostramos, com o mesmo destaque, o que não funcionou. O LightGBM, que prometemos comparar, não ganhou. A zona menos atendida recebe só 7% do que seria proporcional, e nenhuma das políticas que testamos cumpre o critério que escrevemos antes de ver o resultado. Sem histórico, o modelo começa pior que a regra simples e só passa a ganhar a partir do décimo quarto dia, por isso o piloto começa pela regra simples. E a premissa que mais pesa: se o coordenador real já chama só quem pode ir, o ganho cai de 57% para 27%, e para 7% se ele escolhe tão bem quanto a regra simples. É por isso que o próximo passo é um piloto, e não uma venda.

### 9. A IA no projeto

Como este é um MBA de IA, vale mostrar a IA nos dois lugares em que ela trabalhou, e como sabemos que funcionou. No produto, ela ranqueia os médicos e lê o pedido. Nos dois casos medimos contra uma alternativa simples: o ranking vence a regra simples em 17 de 17 cenários, e o Gemini acertou os 54 pedidos que leu, sem obedecer a nenhum dos dez tipos de ataque que testamos com a chave real. O limite também está dito: ele acrescenta pouco e às vezes demora. Na construção, usamos o Claude Code como par de programação, com dez subagentes de papéis separados, como arquitetura, dados, segurança, jurídico e acessibilidade. As regras eram claras: um pull request por fase, testes automáticos verdes e nenhuma mudança sem aprovação humana, sempre com dado sintético. A evidência está no repositório: mais de 600 testes na API, mais de 50 pull requests e um diário com o uso de IA em cada passo. E a IA também errou: a conferência de cada número contra o relatório de origem pegou valores trocados e frases que diziam mais do que o sistema faz, e tudo foi corrigido. Nos dois lugares, a regra foi a mesma: a IA propõe, e uma pessoa valida com evidência.

### 10. O placar dos nove critérios

Aplicamos a nós mesmos o Conselho de Investimentos que a disciplina propôs: nove critérios, cada um com uma cor, e nunca com nota. Verde é evidência disponível e verificável; amarelo é evidência parcial; vermelho é evidência ausente. Temos evidência sólida em dois critérios. A IA é necessária, porque medimos onde ela agrega e onde a regra basta. E a hipótese é testável, porque o piloto tem metas e critérios de parada definidos antes. Temos evidência parcial em seis: o problema, apoiado em casos públicos, mas sem dado nacional; o processo, mapeado em fontes públicas, mas não observado num hospital; os dados, sintéticos e calibrados; a viabilidade, que fecha só em hospital grande; o valor, medido em simulação; e os riscos, com controles no produto, mas sem validação jurídica. E falta evidência em um: o usuário. Não fizemos entrevistas, e o teste de usabilidade com cinco pessoas ficou desenhado, sem execução. Por esses critérios, a resposta honesta não é investir já. É validar: fazer um teste barato antes de escalar. Pode haver quem pinte algum critério de outra cor, e essa é exatamente a conversa que o Conselho propõe.

### 11. O valor para o negócio

E o valor para o negócio? Começamos pelo custo, com tudo incluído. Um hospital sozinho custa cerca de 69 mil reais por ano e 159 mil no primeiro ano, somando implantação, treinamento, parecer jurídico, relatório de impacto e teste de segurança. A tecnologia, que é banco, servidor, hospedagem e Gemini, é só 4 mil por ano: o custo está em pessoas e em conformidade. O preço segue três passos: o piso é o custo com margem e imposto; o teto é 30% do benefício do hospital; e o preço é o meio da faixa, quando ela existe. Para um hospital grande, com cerca de 40 vagas por dia, dividindo a plataforma com outros dois hospitais, o piso é de 94,7 mil por ano, o teto é de 221 mil, e o preço sugerido é de 13,2 mil reais por mês. O retorno do hospital, com esse preço, vai de 117% a 990%, conforme a parcela de vagas descobertas que ele evita e quanto cada uma custa. Já para o hospital pequeno ou médio isolado, o preço não fecha: o custo quase não depende do porte, e o benefício sim. Ele só fecha a partir de cerca de 30 vagas por dia num hospital sozinho, 17 com três hospitais e 13 com dez. O modelo é de assinatura fixa, paga pelo hospital, sem comissão por vaga, por causa da Resolução 2.460. E há uma incógnita que não escondemos: o custo real de uma vaga descoberta. Só o financeiro do hospital sabe, e é o piloto que vai medi-lo antes de qualquer cobrança.

### 12. Risco e governança

Classificamos o risco da solução como médio, pela Resolução 2.454 do CFM, e revalidamos essa classificação fator por fator contra o texto da resolução. A classificação de baixo risco que fizemos na primeira entrega ignorava o impacto sobre quem é ranqueado. Para organizar a governança, usamos as quatro funções do NIST AI RMF. Governar, ou quem responde: o hospital controla os dados, a plataforma opera, o coordenador aprova cada oferta, e não há comissão por vaga. Mapear, ou quem é afetado: os coordenadores e, principalmente, os médicos ranqueados. Medir, ou como saberemos: a concentração das ofertas nos 10% de médicos mais chamados caiu de 82% para 36% com o rodízio, e a desigualdade por zona fica em alerta de revisão humana. Gerir, ou o que fazemos quando falha: se o Gemini cair, as regras leem o pedido; o médico pode contestar; e o piloto tem critérios de parada. E quem pode parar a IA? O coordenador, em qualquer oferta, porque nada sai sem o clique dele, e o hospital, no piloto. Em aberto, e dito com clareza: a validação jurídica, o prazo de retenção da trilha, o plano de resposta a incidentes e um teste de invasão.

### 13. LGPD

Sobre a LGPD, lemos a lei e desenhamos o produto a partir dela, mas a validação é do jurídico; não afirmamos conformidade. Quanto aos papéis, o hospital é o controlador, porque decide para que os dados servem, e a plataforma é a operadora. Se a plataforma treinasse um único modelo com dados de vários hospitais, passaria a decidir a finalidade e viraria controladora; por isso o desenho é de um modelo por hospital. Tratamos cadastro, agenda e histórico de ofertas do médico: nenhum dado de paciente e nenhum dado sensível. As bases legais são a execução do contrato, quando há vínculo, ou o legítimo interesse, com teste de balanceamento, e a obrigação regulatória para auditar viés, que a Resolução 2.454 exige. O consentimento fica só para um aviso opcional, porque entre hospital e médico ele dificilmente seria livre. Pela minimização, o Gemini recebe só o texto da vaga, sem nome, CRM ou telefone, e a trilha guarda pseudônimos. O médico vê, em “Minha conta”, o que o sistema usa e não usa sobre ele, e baixa os próprios dados. Quanto ao artigo 20, sobre decisão automatizada, ele provavelmente não se aplica, porque o coordenador decide cada oferta; mas passaria a valer, e o risco subiria, se a oferta virasse automática. Antes de qualquer dado real, ainda faltam o prazo de retenção, o plano de resposta a incidentes, com comunicação à ANPD em três dias úteis, e o relatório de impacto completo.

### 14. Guardrails contra injeção de prompt

Uma pergunta que sempre aparece em projetos com IA generativa é sobre injeção de prompt: alguém escrever, no pedido, uma instrução para enganar o modelo. A nossa defesa tem cinco camadas. A primeira é um detector de texto suspeito: se ele acende, o texto não vai ao Gemini, a leitura sai pelas regras e o sinal fica na tela e na trilha. Contra os nossos próprios ataques ele acertava 60 de 60, mas foi escrito junto com eles. Então fizemos um red team, com técnicas que ele nunca tinha visto, como letras de outro alfabeto, números no lugar de letras, texto em base64, marcadores falsos de prompt, pedidos de favorecimento e critérios discriminatórios. Ele pegava só dois de trinta e cinco. Ampliamos o detector e, para não nos enganarmos, medimos depois com vinte ataques novos, escritos sem olhar para ele: pega sete, contra dois antes, sem marcar nenhum dos 386 textos normais. A lição é que um detector por padrões generaliza mal, e por isso ele é só a primeira camada. O ataque que passa encontra um modelo sem ferramentas, sem segredos e sem dados pessoais no prompt; uma resposta que só vale se couber em cinco campos de listas fixas; um ranking que não lê o texto do pedido; e uma pessoa que aprova cada oferta. No teste com a chave real, o Gemini não obedeceu a nenhum dos dez tipos de ataque.

### 15. Implantação em seis meses

Como saberemos, em seis meses, se deu certo? E o que precisa existir para isso funcionar sem o time do projeto por perto? Antes do piloto, assinamos a carta de intenção, o acordo de tratamento de dados e o parecer jurídico. Nos três primeiros meses, o piloto roda em paralelo: o coordenador trabalha como sempre, e o sistema só calcula a recomendação, sem enviar oferta. Isso mede a linha de base real do hospital e o custo de uma vaga descoberta. No mês três há um portão: só seguimos se o ranking for melhor que a regra simples com dado real e se a concentração estiver sob controle. Do quarto ao sexto mês, no uso assistido, o coordenador passa a aprovar as ofertas pela ferramenta. As metas e os limites de parada estão definidos antes: queremos o tempo até preencher 40% menor, e paramos se ele não cair pelo menos 20%; as ofertas por vaga 40% menores; nenhuma violação de jornada; a concentração em 35% ou menos; e o ranking pelo menos dois pontos acima da regra simples. Se ele não ganhar com dado real, o sistema volta para a regra simples. Depois, o acompanhamento é contínuo, com painel semanal e revisão mensal das contestações.

### 16. A recomendação

Por isso, a nossa recomendação, nas categorias do Conselho de Investimentos, é validar. Não pedimos para escalar, nem para investir já: pedimos um piloto em paralelo, que custa pouco para provar ou refutar a ideia. Não é “preparar”, porque o produto já funciona de ponta a ponta, e não é “despriorizar”, porque as evidências que temos apontam na direção certa. Para o piloto, precisamos de três coisas: um hospital grande ou uma rede, com cerca de trinta vagas por dia ou mais, que é onde o preço fecha; o financeiro do hospital, para medir quanto custa uma vaga descoberta; e o jurídico, para validar o desenho com o CFM e a LGPD e fechar o acordo de tratamento de dados. E o investimento só é liberado com três condições: o portão do mês três, o parecer jurídico e o acordo de dados assinados.

### 17. Encerramento

Voltamos à pergunta do início: quem foi chamado para este plantão, e por quê? Com o PlantãoSeguro, isso deixa de ser um mistério: dá para saber, contestar e auditar. Mostramos um problema relevante, uma solução que funciona de ponta a ponta, resultados medidos com honestidade, inclusive onde não funcionou, e um caminho barato para provar o valor com dado real. Não estamos propondo apenas automatizar uma escala. Estamos propondo mudar a forma como se decide quem é chamado: com velocidade, com explicação e dentro das regras de 2026. Por que alguém deveria investir nisso? Porque é a forma de unir esses três pontos, e porque um piloto em paralelo responde à pergunta com pouco risco. Obrigado. Ficamos à disposição para as perguntas.
