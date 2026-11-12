# Perguntas prováveis do professor, com as respostas

Preparação para a apresentação de **17/11/2026** e para a conversa depois dela. As perguntas vêm do feedback da Entrega 3 e de onde um professor de IA e de negócios costuma apertar. Cada resposta traz **o que dizer** (até 40 segundos), **os números** e **onde está a evidência**, para quem for perguntado achar a fonte.

**Regras de honestidade para todas as respostas:**

1. Todo número de desempenho é **de simulação**: diga "em simulação" ou "no mundo simulado". Não existe dado real nem entrevistas.
2. Não diga que "está em conformidade com a LGPD ou com o CFM": diga que **lemos os textos e propusemos**, e que a validação é do jurídico.
3. Não diga que "resolvemos" a exclusão por zona: **medimos, e não resolvemos**.
4. Quando o resultado contrariou o que o grupo esperava, **diga isso**: é o que mostra que se mediu.

## A cola de uma página: os números

| Assunto | Número | Onde |
| --- | --- | --- |
| Tempo até preencher | 110 min no manual para 47 min (−57%); ofertas por vaga de 3,31 para 1,32 | [fluxo](../resultados/metricas-fluxo.md) |
| Quem gera o ganho | **72% do ganho de tempo vem do filtro de regras**; o modelo acrescenta 7% sobre o baseline | [Entrega 3, seção 2.3](../04-entrega-3-validacao.md) |
| Modelo contra baseline | Top-5: 71,2% contra 67,7% (**+3,5 pontos**, erro-padrão 0,22); AUC 0,762 contra 0,702; oráculo 75,8% | [ranking](../resultados/metricas-ranking.md) |
| Robustez | O modelo vence em **17 de 17** cenários (+2,1 a +6,4 pontos); a meta de −50% de tempo vale em 14 de 17 | [robustez](../resultados/metricas-robustez.md) |
| LightGBM | Fica entre **−1,3 e +0,6 ponto** contra a regressão logística; **não ganha** | [LightGBM](../resultados/metricas-lightgbm.md) |
| Concentração | Os 10% mais expostos recebem 82,1% das ofertas só pelo modelo e **35,7% com o rodízio**; custo de 1,8 ponto | [concentração](../resultados/metricas-concentracao.md) |
| Zona | Zona menos exposta: **0,07** do proporcional com o rodízio. Nenhuma medida cumpre os critérios | [zona](../resultados/metricas-zona.md) |
| Custo | Um hospital sozinho: **R$ 69 mil por ano, R$ 159 mil no primeiro ano**; a tecnologia é só R$ 4 mil | [custos](../resultados/metricas-custos.md) |
| Preço | Fecha a partir de cerca de **30 vagas por dia** sozinho (17 com 3 hospitais, 13 com 10); hospital grande, cerca de R$ 13 mil por mês | [custos](../resultados/metricas-custos.md) |
| Escala | Motor: 4 ms a 130 ms de 300 a 9.000 médicos. O limite é a consulta das telas, que caiu de 4 para 1 requisição | [escala](../resultados/metricas-escala.md) |
| Carga real (04/11) | 126.803 chamadas, 0 falhas; p95 de 518 ms no fluxo completo | [carga](../resultados/metricas-carga-api.md) |
| Risco | **Médio (preliminar)**, Res. CFM 2.454 | [classificação](../conformidade/classificacao-de-risco.md) |
| Injeção de prompt | 60 de 60 sinalizados, 0 de 340 normais por engano; no Gemini real, nenhum dos 10 tipos foi obedecido | [solução de IA](../solucao-ia.md) |

---

## 1. Resultado técnico

### 1.1 "O modelo aprende o simulador que gerou os dados. Então o que vale?"

**O que dizer.** Vale a comparação, e não o valor absoluto. O modelo e o baseline aprendem o mesmo mundo, então o que medimos é a diferença entre eles. Para ver se a conclusão depende do simulador, refizemos o mundo 17 vezes (outras sementes, pesos de distância, preferência e confiabilidade, aceite geral, expiração e uma calibração com dados públicos): o modelo vence o baseline em todos, de +2,1 a +6,4 pontos. E testamos um mundo com regra não linear.

**Números.** +3,5 pontos na base; 17 de 17. **Onde:** [robustez](../resultados/metricas-robustez.md), [Entrega 3, seção 2.5](../04-entrega-3-validacao.md).

**Se insistir.** Concordo que nenhum número aqui vale como desempenho no hospital. Por isso o piloto começa pelo baseline, e o modelo só entra se ganhar em teste temporal com dados reais (critério C6).

### 1.2 "Vocês compararam com LightGBM, como prometeram?"

**O que dizer.** Sim, na CI, e ele não ganhou. Treinamos no mesmo teste temporal, com as mesmas sete variáveis, em cinco mundos: a base, três outras sementes e um mundo onde a distância pesa mais a partir de 15 km e interage com a preferência, que a regressão não representa. A diferença do LightGBM para a regressão ficou entre −1,3 e +0,6 ponto, e ele empatou até no mundo não linear.

**Números.** Critério de troca definido antes (1 ponto e 3 erros-padrão, na base e no mundo não linear): não cumprido. **Onde:** [LightGBM](../resultados/metricas-lightgbm.md).

**Se perguntarem por que a regressão continua.** Desempenho igual, mais a leitura por peso, que a tela do coordenador mostra como "por que este nome". O LightGBM não entra nas dependências da API.

### 1.3 "O modelo é bom? Quanto ele agrega?"

**O que dizer.** Ele agrega pouco, e dizemos isso. O ganho de tempo vem sobretudo do **filtro de regras**, isto é, de não chamar quem não poderia aceitar: 72% do ganho. O modelo acrescenta 7% sobre o baseline (51 para 47 minutos) e 3,5 pontos de chance de sucesso no top-5. A maior parte do valor está em regra clara e explicável, e IA entra onde regra não basta.

**Números.** 110 para 51 min só com regras e baseline; 47 com o modelo. **Onde:** [Entrega 3, seção 2.3](../04-entrega-3-validacao.md), [solução de IA, seção 2](../solucao-ia.md).

### 1.4 "E se o coordenador real já escolhe bem?"

**O que dizer.** Então o ganho encolhe, e medimos quanto. Se o coordenador já chama só quem pode ir, a economia de tempo cai de 57% para 27%; se escolhe tão bem quanto o baseline, cai para 7%. É a premissa que mais pesa, e só o piloto em paralelo a resolve.

**Onde:** [robustez](../resultados/metricas-robustez.md), [Entrega 3, seção 2.4](../04-entrega-3-validacao.md).

### 1.5 "Como o modelo começa sem histórico?"

**O que dizer.** Pior que o baseline. Em simulação, no dia 7 (114 ofertas com resultado) ele perde 2,5 pontos, e passa a ganhar a partir do dia 14 (252 ofertas). Por isso o piloto começa pelo baseline.

**Onde:** [robustez, curva de lançamento](../resultados/metricas-robustez.md).

### 1.6 "Os dados são sintéticos. Como confiar neles?"

**O que dizer.** Não pedimos confiança: declaramos a premissa e a comparamos com fonte pública quando existe. Na composição, contra a *Demografia Médica no Brasil 2025*, o simulador acertou a especialidade e errou o gênero na pediatria (46,1% contra 76,8%) e a faixa de 55 anos ou mais (14,0% contra 26,8%); mostramos o cenário calibrado ao lado, e a redução de tempo vai de 57% para 55%. No comportamento, a fonte inglesa mostra 11,3% de turnos sem cobertura contra 5,4% do nosso processo manual: **o simulador é otimista**, e isso está dito.

**Onde:** [premissas](../resultados/metricas-robustez.md#comparação-com-dados-públicos), [premissas de comportamento](../resultados/premissas-comportamento.md).

### 1.7 "O LLM não é um risco? Injeção de prompt?"

**O que dizer.** O Gemini só lê o pedido e escreve o motivo; não tem ferramentas, não tem segredos, devolve esquema fechado, e o texto suspeito nem chega a ele. Quem decide é o coordenador. Nos 400 pedidos sintéticos, 60 de 60 ataques foram sinalizados e nenhum pedido normal por engano; no Gemini real, nenhum dos 10 tipos foi obedecido. O que resta é um ataque novo. Se o Gemini cai ou passa do teto diário de 100 chamadas, a leitura segue pelas regras.

**Onde:** [solução de IA, seção 4](../solucao-ia.md), [teste manual do Gemini](../teste-manual-gemini.md).

---

## 2. Resultado para o negócio

### 2.1 "O ROI depende do custo de uma vaga descoberta, que vocês não sabem."

**O que dizer.** Exato, e dizemos isso. O V só vem do financeiro do hospital. O que fizemos foi mostrar **o quanto ele pesa**: o ponto de equilíbrio, os cenários e quanto V seria preciso para cada porte de hospital pagar o preço. Para o hospital grande, com V de R$ 1.000 a R$ 2.000 e metade das vagas descobertas evitada, o retorno é bem positivo; para o pequeno, nem evitando todas o benefício cobre o custo. O piloto em paralelo existe para medir o V antes de cobrar.

**Números.** Benefício central do hospital pequeno R$ 41 mil por ano contra custo anualizado de R$ 99 mil. **Onde:** [custos](../resultados/metricas-custos.md), [Entrega 3, seção 3.2](../04-entrega-3-validacao.md).

### 2.2 "Quanto custa de verdade, com implantação, treinamento e parecer?"

**O que dizer.** Um hospital sozinho custa **R$ 69 mil por ano** no cenário base, **R$ 159 mil no primeiro ano** com implantação, treinamento, parecer jurídico, relatório de impacto e teste de segurança. A faixa vai de R$ 64 mil a R$ 395 mil no primeiro ano. A tecnologia é só uns R$ 4 mil por ano: o custo é de gente e de conformidade. Os preços de tabela (Supabase, Vercel, Hostinger, Gemini) foram conferidos em 11/11; horas, parecer e margem são premissas, e o parecer ainda não foi cotado.

**Onde:** [custos](../resultados/metricas-custos.md).

### 2.3 "Como o preço é fixado e como o hospital contrata depois do piloto?"

**O que dizer.** Em três passos: o **piso** é o custo com margem e imposto; o **teto** é uma parcela do benefício do hospital; o preço é o meio da faixa, quando ela existe. A contratação segue as fases da Entrega 3: antes do piloto, carta de intenção e acordo de tratamento de dados; piloto em paralelo, sem licença; uso assistido, com assinatura mensal curta; e contrato anual com saída sem multa se um indicador de parada for atingido.

**Onde:** [preço e contratação](../negocio/preco-e-contratacao.md).

### 2.4 "Por que não cobrar por vaga preenchida? Seria mais justo."

**O que dizer.** Porque a Res. CFM 2.460/2026 veda vantagem econômica ligada à contratação e ao favorecimento em escala, inclusive por plataformas digitais, e uma cobrança por colocação pareceria comissão. A assinatura é fixa, paga pelo hospital; nada é cobrado do médico, e o valor do plantão não entra no ranking, com teste na CI. É leitura nossa, a validar com jurídico.

**Onde:** [conformidade, seção 3](../conformidade/README.md).

### 2.5 "Então qual hospital compra?"

**O que dizer.** Hospital grande, rede ou grupo. O custo quase não depende do porte, e o benefício sim, então o preço só fecha com muitos plantões: cerca de 30 vagas por dia para um hospital sozinho, 17 com três hospitais dividindo a plataforma e 13 com dez. Para hospital pequeno ou médio isolado, **não fecha**, e o plano para eles ainda não foi calculado. Isso muda uma conclusão da Entrega 3, que dizia que o projeto se paga ao evitar 17 vagas por ano, com um custo de R$ 34 mil que não incluía parecer nem implantação.

**Onde:** [custos](../resultados/metricas-custos.md).

### 2.6 "O que o diferencia de LinkEscala, Pega Plantão e outros?"

**O que dizer.** Ter IA não é diferencial. O diferencial é ser **explicável, contestável e auditável**, desenhado para as resoluções do CFM, e aceitar medir o próprio resultado contra um baseline. Não encontramos preço público dos concorrentes; a única referência (uma ferramenta de escala a R$ 5,7 mil por mês, "preço inicial") vem de um comparador de terceiros e não está confirmada.

**Onde:** [Entrega 3, seção 3.3](../04-entrega-3-validacao.md).

### 2.7 "A referência de fora faz mais do que vocês. O que falta?"

**O que dizer.** Comparamos com a Flexzo em 12/11. O núcleo está coberto: vaga publicada, ordem sugerida por IA e ofertas em sequência. A conferência de credenciais, que ela anuncia como diferencial, aparece na tela do médico: registro no CRM, status do cadastro e validade, esta última **simulada**. Ficaram de fora, por escolha, três coisas: **previsão de vagas** (hoje o "Em risco" é uma regra de 24 horas, e a previsão não foi medida), **float pool** (o cadastro não separa o quadro do hospital da rede de fora) e **escala** (cobrimos o plantão descoberto, não montamos a escala do mês). O que temos e ela não mostra é o que as regras brasileiras pedem: explicação por recomendação, contestação, trilha de auditoria e medida de equidade.

**Cuidado:** a lista da Flexzo vem do site e de notas da própria empresa. É o que ela diz de si, não o que conferimos no produto.

**Onde:** [roteiro até o MVP, seção 8](../roteiro-ate-o-mvp.md#8-fora-do-mvp), com o momento da demonstração em que cada uma aparece.

---

## 3. Experiência do usuário

### 3.1 "Vocês testaram com usuários?"

**O que dizer.** **Não.** O teste de usabilidade com cinco pessoas está desenhado e não foi executado; não houve entrevistas. O que existe: a jornada dos dois usuários, as telas funcionando e a avaliação pelas diretrizes de interação humano-IA, que não substitui usuários. Os critérios de aceite (4 de 5 entendem o motivo sem ajuda; SUS de 68 ou mais) estão definidos para o piloto.

**Onde:** [Entrega 3, seção 4.3](../04-entrega-3-validacao.md), [roteiro do teste](../ux/teste-de-usabilidade.md).

### 3.2 "O que garante que o coordenador não confia cegamente na lista?"

**O que dizer.** A IA sugere, o humano decide: sem a aprovação do coordenador nenhuma oferta sai. A tela mostra o motivo de cada nome, os alertas de jornada, quem ficou de fora e por qual regra, e a decisão humana tem outra cor que a sugestão da IA. Se o coordenador aprova alguém com alerta de jornada, precisa justificar, e a justificativa vai para a trilha. Mesmo assim, a confiança excessiva é um risco declarado, que se trata com treinamento e com o indicador de adoção.

**Onde:** [Entrega 3, seção 4.1](../04-entrega-3-validacao.md), [direção de arte](../design/direcao-de-arte.md).

### 3.3 "E o médico? É um perfil difícil."

**O que dizer.** O médico enxerga por que foi chamado (o "Por que você"), recusa com um de quatro motivos, sem texto livre, vê o prazo andando e pode **contestar** a recomendação; a resposta fica na trilha. "Minha conta" mostra o que o sistema usa e não usa sobre ele, o nível de risco, os direitos e permite baixar os dados. A recusa conta no histórico, e isso está dito: a taxa de aceite dos últimos 90 dias é uma das sete variáveis, com peso pequeno (0,116), e "Minha conta" a lista entre o que o sistema usa. É uma pergunta legítima de justiça, e a resposta honesta é que a variável existe e pesa pouco.

**Onde:** [Minha conta](../../apps/web/app/medico/conta/page.tsx), [Entrega 3, seção 4](../04-entrega-3-validacao.md).

---

## 4. Segurança e ética

### 4.1 "O rodízio reduz a concentração de verdade?"

**O que dizer.** Sim, e testamos em seis mundos. Os 10% mais expostos recebem de 74,6% a 85,2% das ofertas só pelo modelo e de 30,2% a 49,9% com o rodízio de 10 pontos; na base, de 82,1% para 35,7%. O custo é de 1,8 ponto de chance de sucesso e 2 minutos a mais por vaga. O rodízio está na API desde 06/11.

**Números.** Meta C5: 35% ou menos; ficamos perto dela, numa estimativa superior. **Onde:** [concentração](../resultados/metricas-concentracao.md), [zona](../resultados/metricas-zona.md).

### 4.2 "E resolve a desigualdade entre regiões?"

**O que dizer.** **Não, e foi o que mais nos surpreendeu.** Com o rodízio, a zona menos exposta recebe 0,07 do que receberia se a distribuição fosse proporcional. Esperávamos que um lugar de oportunidade, sem olhar zona nem distância, ajudasse; levou a 0,14. Reservar o 2º lugar a quem mora longe leva a 0,39, por 3,3 pontos de chance de sucesso e 2 minutos; uma cota por zona, usando a zona, chega a 0,73. **Nenhuma cumpre o critério que escrevemos antes** (0,50 com perda de até 2 pontos), então a API não muda. Parte da diferença é preferência real de quem mora longe, e por isso a meta é igualdade de chance de ser chamado, e não de resultado. O preço da equidade regional é uma escolha do hospital e da Comissão de IA, a fazer com ofertas reais.

**Onde:** [zona](../resultados/metricas-zona.md); a tela de equidade mostra o problema aberto.

### 4.3 "Por que não usar a zona no ranking para corrigir?"

**O que dizer.** A zona fica só na auditoria, de propósito: usar o local de residência para decidir sobre pessoas é o tipo de escolha que a LGPD e a Res. CFM 2.454 pedem para justificar. Medimos o que uma cota por zona ganharia (0,73) só como teto, e não a adotamos. Se o hospital quiser pagar esse preço, é decisão dele.

### 4.4 "Qual a classificação de risco? Vocês validaram?"

**O que dizer.** **Médio, de forma preliminar.** Reli o texto da Res. CFM 2.454 e confrontei cada fator do art. 12: o sistema ordena pessoas e apoia uma decisão operacional importante, o que o Anexo II trata como médio, mas não executa nada sozinho, não toca em decisão clínica e não usa dado de paciente, o que o afasta do alto. A Entrega 1 dizia baixo; isso não se sustenta, porque ignora o impacto sobre a renda de quem é ranqueado. A classificação formal é do hospital. O risco sobe se a oferta virar automática, se o ranking for usado para punir ou premiar médicos, se entrar dado de paciente ou se um viés não puder ser eliminado.

**Onde:** [classificação de risco](../conformidade/classificacao-de-risco.md).

### 4.5 "E a LGPD? Vocês leram a lei?"

**O que dizer.** Lemos o texto compilado e o confrontamos com o sistema. O hospital é o controlador, a plataforma é operadora; treinar um modelo para vários hospitais a tornaria controladora, então a saída é um modelo por hospital. Nenhum dado de paciente e nenhum dado sensível como tal entram; três pontos pedem cautela (descanso, motivo "cansaço" e texto livre da contestação). Nome, CRM e telefone nunca vão ao LLM. O art. 20 (decisão automatizada) provavelmente não se aplica, porque o coordenador aprova. A trilha imutável precisa de prazo de retenção e de um jeito de anonimizar o pseudônimo. É leitura de engenharia, a validar com jurídico.

**Onde:** [LGPD](../conformidade/lgpd.md).

### 4.5.1 "Dado pessoal vai para o Google?"

**O que dizer.** Só o texto do pedido da vaga, depois de tirar nome, CRM e telefone. Em produção, a camada **paga** do Gemini é obrigatória (a gratuita usa o conteúdo para melhorar os produtos, segundo a página de preços de 11/11). O risco que resta é o coordenador digitar um dado pessoal que o filtro não pegue. Na demonstração, tudo é sintético.

### 4.6 "Há viés de gênero ou idade?"

**O que dizer.** O ranking não usa gênero, idade nem zona; eles ficam só na auditoria. Mesmo assim, a participação no top-5 em relação aos elegíveis mostra gênero feminino em 1,20 e masculino em 0,83: vem de outras variáveis, e a tela de equidade mostra isso. Como o simulador errou a composição por gênero e idade, a linha de base de equidade precisa ser refeita com dados reais no piloto.

**Onde:** [Entrega 3, seção 5.3](../04-entrega-3-validacao.md), tela de equidade.

---

## 5. Implantação

### 5.1 "A arquitetura aguenta o volume de um hospital?"

**O que dizer.** No que depende de CPU e memória, sim, para um hospital grande. Replicamos a rede simulada de 300 a 9.000 médicos: recomendar uma vaga vai de 4 ms a 130 ms, e a memória é de uns 111 MB. **O que apertava era a consulta a cada 3 segundos das telas:** cada médico com a tela aberta fazia 4 requisições; reduzimos para 1. Em um hospital de 1.500 médicos, isso leva o pico de 230 para 56 leituras por segundo, contra os 431 medidos no Supabase gratuito. Para uma rede de 10 hospitais, de 900 para 220.

**Os limites de arquitetura que dizemos de frente:** a API é um processo só, com o mundo em memória, então não escala para os lados nem tem alta disponibilidade; o servidor é único; o Supabase gratuito pausa e não tem backup. Em produção: notificação em vez de consulta (Realtime), Supabase pago, API com mais de um processo e índice atualizado em vez de refeito.

**Premissas minhas:** tamanhos de hospital e 10% de médicos online no pico. **Onde:** [escala](../resultados/metricas-escala.md), [carga de 04/11](../resultados/metricas-carga-api.md).

### 5.2 "Por que o servidor é só um, e o banco gratuito?"

**O que dizer.** Porque o protótipo existe só até a apresentação, com a decisão registrada: o simples vence o escalável. O desenho de produção (mais um worker do n8n, servidor maior, banco pago, Gemini na camada paga com acordo de tratamento) está nos documentos como roteiro, e o custo dele está no relatório de custos.

**Onde:** [ADR 0009](../adr/0009-servidor-so-para-a-apresentacao.md).

### 5.3 "E se cair no meio da demonstração?"

**O que dizer.** Há plano B: se a API não responde, a tela oferece o **modo de demonstração**, que faz o mesmo caminho sem o servidor (as ofertas e a cascata são simuladas numa aba só); se o Gemini cai, a leitura segue pelas regras; e o vídeo gravado do roteiro e a limpeza do banco antes do ensaio estão previstos na fase G, ainda por fazer.

**Onde:** [roteiro até o MVP, fases F a H](../roteiro-ate-o-mvp.md).

### 5.4 "Como os dados entrariam num hospital real?"

**O que dizer.** Quase tudo nasce dentro da plataforma; o dado real que substitui o sintético é o registro de ofertas e respostas. O cadastro de hospital e unidade vem do CNES (API pública), a situação do CRM vem do CFM, a disponibilidade é declarada pelo médico, e as vagas são digitadas pelo coordenador. O acesso ao CFM custa cerca de R$ 948 por ano para empresa particular e talvez precise de contrato do hospital.

**Onde:** [dados em produção](../dados/dados-em-producao.md).

### 5.5 "O que vocês fariam com mais tempo?"

**O que dizer.** Primeiro, o **piloto em paralelo** (3 meses, com o sistema só calculando), para medir a linha de base real e o V. Depois: teste de usabilidade com coordenadores reais; relatório de impacto completo e parecer jurídico; o plano para hospitais pequenos; e, na técnica, Realtime, API com mais de um processo e a comparação dos modelos com dados reais. No produto, o que a referência de fora já anuncia: previsão de vagas, float pool e integração com a escala do hospital ([2.7](#27-a-referência-de-fora-faz-mais-do-que-vocês-o-que-falta)).

---

## Perguntas armadilha (e a resposta honesta)

| Pergunta | Resposta que não promete demais |
| --- | --- |
| "Quantas vagas o sistema vai evitar?" | Não sabemos. Em simulação, o processo manual deixa 5,4% descobertas e o fluxo, 0,0%; a fonte pública inglesa mostra 11,3% no manual, então o simulador é otimista. Só o piloto responde |
| "Isso reduz o custo do hospital?" | Só em hospital de volume alto: o preço fecha a partir de cerca de 30 vagas por dia sozinho. Em hospital pequeno, não fecha |
| "Está em conformidade com a LGPD?" | Lemos a lei e propusemos; não temos parecer. Está marcado "validar com jurídico" em cada ponto |
| "Vocês resolveram a exclusão geográfica?" | Medimos, e não resolvemos; o rodízio ajuda a concentração entre pessoas, mas a zona menos exposta recebe 0,07 do proporcional |
| "O LightGBM seria melhor?" | Testamos, em cinco mundos: não ganhou |
| "Funciona com dados reais?" | Não sabemos; não temos. O sistema foi feito para começar com baseline e só passar ao modelo depois de ganhar em teste temporal com dados reais |
| "O Gemini é seguro?" | Ele só lê o pedido, sem ferramentas nem segredos, e o humano decide; em produção, camada paga e acordo de tratamento |
| "Quanto tempo leva para o médico responder?" | O prazo da oferta é de 2 minutos na demonstração e é premissa; a fonte pública encontrada tem contexto diferente (aviso a todos de uma vez) |
