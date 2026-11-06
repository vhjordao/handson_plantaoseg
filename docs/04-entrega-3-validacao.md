# PlantãoSeguro: Entrega 3 (validação, resultados, riscos e plano de implementação)

**Disciplina:** Hands On – Aplicação de IA nos negócios (Mackenzie), Prof. Fabio Versolatto. **Grupo:** Victor Jordão, Roberval Silva, Guilherme Tarrago, Sergio Freitas, Lucas Barbosa e Plinio Camilo. **Entrega:** 07/11/2026 (versão de 06/11). **Código, dados e documentos:** [github.com/vhjordao/handson_plantaoseg](https://github.com/vhjordao/handson_plantaoseg).

> [!NOTE]
> **Resumo.** O PlantãoSeguro lê o pedido de plantão em texto livre e devolve os médicos elegíveis, ordenados e com o motivo de cada um: **a IA recomenda, o humano decide**. Esta entrega responde se a solução faz sentido para o negócio, em seis áreas: resultado técnico, resultado para o negócio, experiência, segurança e ética, implantação e **critérios de sucesso, que organizam o documento**. Em simulação, o fluxo recomendado preenche a vaga em menos da metade do tempo e não viola a jornada, mas **concentra as ofertas em poucos médicos**. Um rodízio entre médicos de chance parecida corrige boa parte disso, também em simulação, e precisa estar no sistema antes de qualquer piloto. **Todos os números abaixo são de dados sintéticos**: indicam a direção do ganho, não o ganho de um hospital real, e o piloto em paralelo existe para trocar a simulação por medição.

<!-- kpis -->
| Resultado | Indicador | Leitura (simulação) |
| --- | --- | --- |
| 47 min | tempo médio até preencher a vaga | processo manual: 110 min (57% a menos); cai para 7% se o coordenador real já escolher bem |
| +3,5 pontos | chance de sucesso do top-5 sobre o baseline | 71,2% contra 67,7%; à frente em 17 de 17 cenários |
| 0 | violações de jornada nas recomendações | processo manual: 1,3% dos aceites |
| 50,7% → 28,5% | lugares do top-5 ocupados pelos 10% mais recomendados | com rodízio entre médicos de chance parecida, perdendo 1,8 ponto de chance; manual: 31,1% das ofertas |

**Frase-síntese:** queremos utilizar IA para recomendar e explicar quais médicos chamar para cada plantão de pronto-socorro, a fim de reduzir o tempo de cobertura sem violar a jornada nem as regras do CFM, beneficiando coordenadores de escala, médicos e hospitais privados, medindo o sucesso aos 6 meses pelo tempo até preencher a vaga, pelas vagas sem cobertura, pelas violações de jornada, pela concentração das ofertas e pelo retorno para o hospital.

## 1. Critérios de sucesso: como saberemos, depois de 6 meses, que deu certo

Cada área seguinte volta a esta tabela. Os 6 meses têm duas partes: **meses 0 a 3, piloto em paralelo** (o coordenador trabalha como sempre, e o sistema só calcula a recomendação, sem enviar oferta), que mede a linha de base real; e **meses 4 a 6, uso assistido**, em que o coordenador aprova ofertas na ferramenta. As metas são propostas do grupo, a calibrar no piloto (não houve entrevistas; as premissas de comportamento foram comparadas a fontes públicas, seção 2.5); a coluna da simulação mostra de onde partimos, não o que prometemos.

| Critério | Como se mede | Linha de base | Simulação | Meta aos 6 meses | Seguir se | Parar se |
| --- | --- | --- | --- | --- | --- | --- |
| C1. Tempo até preencher | Média, em minutos, entre publicar a vaga e o aceite | Medida no piloto | 110 para 47 min (−57%) | −40% sobre a base real | −40% ou mais | menos de −20% |
| C2. Ofertas por vaga | Ofertas até alguém aceitar | Medida no piloto | 3,31 para 1,32 (−60%) | −40% | −40% ou mais | menos de −15% |
| C3. Vagas sem cobertura | % das vagas que ninguém cobriu | Medida no piloto | 5,4% para 0,0% | Metade da base real | −50% ou mais | sem melhora |
| C4. Jornada | % dos aceites que violam a política, sem exceção justificada | Medida no piloto | 1,3% para 0 | 0 | 0 | acima de 0 por 2 meses seguidos |
| C5. Concentração | % das ofertas recebida pelos 10% de médicos mais ofertados | Medida no piloto | 31,1% (manual); 50,7% do top-5 (modelo) e 28,5% (com rodízio) | 35% ou menos | 35% ou menos | acima de 50% |
| C6. Qualidade do ranking | Chance de sucesso do top-5 do modelo menos a do baseline, em teste temporal com dados reais | Baseline heurístico | +3,5 pontos (mínimo de +2,1 em 17 cenários) | +2 pontos | +2 pontos ou mais | abaixo de 0: volta ao baseline |
| C7. Adoção | % das recomendações aceitas pelo coordenador; % dos coordenadores que usam toda semana | Sem usuários | n/d | 60% e 80% | 60% ou mais | abaixo de 30% |
| C8. Entendimento e contestação | % dos usuários que entendem o motivo sem ajuda (teste com 5); contestações respondidas no prazo | Sem usuários | n/d | 4 de 5 e 100% | 4 de 5 | abaixo de 3 de 5 após ajuste |
| C9. Neutralidade econômica | Casos em que pagamento influenciou o ranking | 0 (teste na CI) | 0 | 0 | 0 | qualquer caso: suspende e audita |
| C10. Retorno | Custo por vaga preenchida; ROI do hospital (seção 3) | Não medido | ROI de −68% a +159% (premissas) | Retorno do custo em até 12 meses | ROI positivo com dados reais | ROI negativo no mês 6 |
| C11. Desempenho | Tempo de resposta (percentil 95) e disponibilidade | Medido em 04/11 | 518 ms no fluxo completo; 0 falhas em 126.803 chamadas | Abaixo de 1 s e 99% | Abaixo de 1 s | Acima de 3 s |

**Regra de decisão aos 6 meses (proposta).** Segue o projeto se **C1 a C4 e C9** passarem e ao menos **dois de C5 a C8**; entre os limiares de seguir e de parar, ajusta e mede de novo por 30 dias; o C10 decide a expansão. Marcos de medição: mês 0 (linha de base), mês 3 (**portão do piloto**: C6 e C5 antes de enviar uma única oferta pela ferramenta) e mês 6 (decisão).

**O que a simulação já responde e o que só o piloto responde.** Já responde: o modelo supera o baseline (C6), o filtro de regras zera a violação de jornada (C4) sob qualquer premissa testada, e o rodízio reduz a concentração (C5) com custo pequeno. Só o piloto responde: o tempo (C1 a C3) depende de como o coordenador real trabalha hoje; a adoção e o entendimento (C7 e C8) exigem usuários; o retorno (C10) exige o custo real de uma vaga descoberta. Nenhum desses é afirmado como resultado.

## 2. Resultado técnico

### 2.1 O que foi desenvolvido

A Entrega 2 deixou uma prova de conceito por linha de comando. Desde então o motor virou um sistema com banco, API e cascata no ar; a interface é a parte menos madura.

<!-- keep -->
| Componente | Estado em 06/11 | Evidência |
| --- | --- | --- |
| Motor: extração, filtro de regras, ranking, explicação e trilha de auditoria | Pronto | 510 testes automáticos (pytest) na CI, incluindo injeção de prompt e neutralidade econômica |
| Banco no Supabase (São Paulo): RLS, trilha de auditoria com hash e carga sintética | Aplicado | 100 testes de banco (pgTAP) na CI; 16.547 linhas sintéticas carregadas |
| API de matching (FastAPI), HTTPS, limite de requisições | No ar no servidor | 126.803 chamadas medidas, nenhuma falhou (seção 2.4) |
| Cascata de ofertas no n8n | No ar | 19 de 19 verificações de ponta a ponta, com o n8n reiniciado no meio da espera |
| Interface web | No ar no domínio público, só em modo de demonstração: página inicial, ajuda, entrada por persona e a tela completa do coordenador | 184 testes de unidade e 123 de jornada e acessibilidade (Playwright e axe) na CI; sem teste com usuários. A tela do médico e a ligação com a API estão em construção |
| Gemini (leitura do pedido) | Testado com o serviço real em 05/11, na camada gratuita e só com textos sintéticos | Modelo escolhido por medição (6 de 6 leituras certas); na rodada completa, 14 de 16 respostas, mediana de 0,9 s, e nenhum dos 10 ataques obedecido. Sem a chave, a leitura cai nas regras |

### 2.2 Como funciona

![Fluxo da solução](figuras/fluxo-solucao.svg)

A IA atua em três pontos: o **Gemini** lê o texto livre da vaga e devolve campos em JSON validado; uma **regressão logística** com sete variáveis ordena os médicos elegíveis; o **motivo** de cada um sai dos fatores do modelo, num texto fixo que o Gemini só pode reescrever sem acrescentar causa (na demonstração, a reescrita fica desligada). Filtro de CRM, especialidade, disponibilidade, raio e jornada (24 h contínuas, 11 h de descanso), prazos e trilha são **código determinístico**. Nome, CRM e telefone nunca vão ao LLM, e o valor do plantão fica fora do ranking (teste na CI). Sem o clique do coordenador, nenhuma oferta sai.

### 2.3 Resultados contra o baseline

Mesmas 392 vagas de teste (a partir de 01/08/2026), 100 repetições por vaga. O **baseline** é a ordem por distância e disponibilidade; o **processo manual** é o que o gerador registrou.

<!-- keep -->
| Ordem de chamada | Ofertas por vaga | Sem cobertura | Tempo médio (min) | Mediana (min) | Preenchidas com 24 h ou mais |
| --- | ---: | ---: | ---: | ---: | ---: |
| Processo manual (observado) | 3,31 | 5,4% | 110 | 85 | 70,7% |
| Regras + sorteio entre elegíveis | 1,82 | 0,2% | 65 | 48 | 74,3% |
| Regras + baseline heurístico | 1,41 | 0,0% | 51 | 40 | 74,8% |
| Regras + modelo | 1,32 | 0,0% | 47 | 38 | 74,8% |
| Oráculo (teto) | 1,23 | 0,0% | 44 | 36 | 74,9% |

<!-- keep -->
| Chance média de sucesso no top-5 | Valor | Em relação ao oráculo |
| --- | ---: | ---: |
| Oráculo | 75,8% | 100,0% |
| Modelo (AUC 0,762) | 71,2% | 94,0% |
| Baseline heurístico (AUC 0,702) | 67,7% | 89,4% |
| Sorteio entre elegíveis | 52,9% | 69,8% |

A diferença do modelo para o baseline é de **3,5 pontos** (erro-padrão 0,22). A leitura que importa para o negócio é outra: **72% do ganho de tempo vem do filtro de regras**, isto é, de não chamar quem não poderia aceitar; o modelo acrescenta 7% sobre o baseline (51 para 47 min).

![Do processo manual ao oráculo: o ganho de tempo (simulação)](resultados/fig-fluxo-tempo.svg)
![Quanto o ganho depende do coordenador real (simulação)](resultados/fig-robustez-coordenador.svg)

**O que pesa no ranking.** São sete variáveis, todas calculadas só com o que já se sabia antes de cada oferta (sem vazamento do futuro). Os pesos abaixo são da regressão logística, com as variáveis padronizadas; pesos positivos aumentam o score.

<!-- keep -->
| Variável | Peso | Leitura para o negócio |
| --- | ---: | --- |
| Horas da vaga cobertas pela disponibilidade | 0,822 | Quem não está livre não aceita; constante entre os elegíveis, porque o filtro já exige cobertura total |
| Distância até o hospital | −0,430 | Quanto mais longe, menor a chance de aceite (e a fonte do risco de viés por zona) |
| Preferência de período coincide | 0,252 | Quem prefere a noite aceita mais a noite |
| Especialidade (principal = 1; secundária = 0,5) | 0,154 | Ajuste fino sobre o filtro |
| Horas desde o último plantão | 0,145 | Descansado aceita e comparece mais |
| Taxa de aceite nos últimos 90 dias | 0,116 | Histórico recente de resposta |
| Taxa de comparecimento nos últimos 90 dias | 0,010 | Quase não pesa na simulação; deve pesar mais no mundo real |

### 2.4 Robustez e desempenho

- **17 cenários** (outras sementes, pesos de distância, preferência, confiabilidade e agenda, aceite geral, expiração da oferta e uma calibração com dados públicos): o modelo supera o baseline no AUC e no top-5 em **17 de 17** (de +2,1 a +6,4 pontos). A redução de 50% no tempo se sustenta em 14 de 17 (de 42% a 63%).
- **A premissa que mais pesa é o coordenador real.** Se ele já chama só quem pode ir, a economia de tempo cai de 57% para 27%; se já escolhe tão bem quanto o baseline, cai para 7%. Só o piloto resolve (não houve entrevistas).
- **Lançamento sem histórico:** o modelo perde do baseline no dia 7 (114 ofertas com resultado, −2,5 pontos) e passa a ganhar a partir do dia 14 (252 ofertas). Por isso o piloto começa pelo baseline, e o modelo só entra depois de superá-lo em teste temporal com dados do próprio hospital.

![Modelo contra baseline conforme o histórico acumulado (simulação)](resultados/fig-robustez-curva.svg)
![Concentração das ofertas por política de ordem (simulação)](resultados/fig-concentracao-politicas.svg)
- **Concentração** ([experimento](resultados/metricas-concentracao.md)): sete políticas nas mesmas 392 vagas, em ordem de publicação. O **rodízio entre médicos de chance parecida** (até 10 pontos da melhor, quem apareceu menos na semana vai primeiro) leva os 10% mais expostos de 50,7% para 28,5% dos lugares do top-5 e de 82,1% para 35,7% das ofertas (estimativa superior), com 1,8 ponto a menos de chance de sucesso e 2 min a mais por vaga. Limitar as aparições por semana corta menos e custa mais. **A exclusão por zona quase não muda.**
- **Desempenho da API** (KVM 1, 1 vCPU, 04/11): o fluxo completo (publicar, recomendar, aprovar e responder) chega a 31,9 chamadas por segundo com 10 simultâneas, com 95% das respostas em até 518 ms e o servidor em 54%; nas rotas com login, a CPU limita em cerca de 270 por segundo. Achado: a chave nova do Supabase travava em 50 por segundo e a antiga passou de 900, sem causa identificada. Na demonstração guiada, só uma pessoa usa o sistema, bem abaixo desse limite.

### 2.5 Limitações

- **Circularidade:** o modelo aprende o simulador que gerou os dados. O que vale é a comparação com o baseline nas mesmas condições, nunca o valor absoluto.
- **Sem dado real:** composição e comportamento são premissas. Contra o estudo público *Demografia Médica no Brasil 2025*, o simulador acerta a especialidade e erra o gênero na pediatria (46,1% contra 76,8%) e a faixa de 55 anos ou mais (14,0% contra 26,8%); a base fica como está, com o cenário calibrado ao lado. Para o comportamento, a busca de fontes publicadas ([premissas](resultados/premissas-comportamento.md)) achou poucos números: o único acadêmico, de hospitais públicos ingleses, mostra 11,3% de turnos de substitutos sem cobertura, contra 5,4% no processo manual simulado. Distância e ofertas até o aceite seguem sem fonte, e não houve entrevistas.
- **A concentração cai com o rodízio**, mas a distância continua como proxy da zona de residência (seção 5).
- **Não feito:** comparação com LightGBM, previsão de vagas descobertas (a meta de recall 0,7 da Entrega 1 segue sem medição), teste com usuários e o rodízio dentro da API.

## 3. Resultado para o negócio

### 3.1 Problema, benefício e indicador

<!-- keep -->
| Quem | Problema (Entrega 1) | Benefício esperado | KPI |
| --- | --- | --- | --- |
| Coordenador de escala | Vaga descoberta percebida tarde; chama quem não pode ir | Menos chamadas por vaga e menos vagas sem cobertura | C1, C2, C3 |
| Hospital (gestão e financeiro) | Custo de intermediação e risco regulatório | Cobertura mais barata e trilha de auditoria para a Comissão de IA | C3, C10, C9 |
| Médico plantonista | Oferta sem motivo; jornada sem controle | Ofertas que cabem na rotina, com motivo e contestação | C4, C5, C8 |
| Paciente | Lacunas em plantões essenciais | Menos lacunas e menos fadiga | C3, C4 |

### 3.2 Como medir o ROI

O ROI é visto **pelo hospital**: quanto ele ganha por ano, menos quanto custa operar a plataforma. O preço da assinatura ainda não existe (será definido depois do piloto); o custo abaixo é o piso para ele.

**Benefício anual = (vagas descobertas evitadas × V) + (horas de coordenação poupadas × custo por hora)**, em que V é o custo, para o hospital, de uma vaga que ninguém cobriu (agência, hora extra ou atendimento reduzido). **Nenhum dos dois valores é conhecido**: vêm do financeiro do hospital, no piloto. As contas abaixo usam premissas explícitas, marcadas como tal.

<!-- keep -->
| Item | Valor | Origem |
| --- | ---: | --- |
| Vagas por hospital por ano | 816 | Simulação (2.448 vagas em 3 hospitais) |
| Vagas sem cobertura por ano hoje | 44 (5,4%) | Simulação, processo manual |
| Ofertas evitadas por ano | 1.624 (3,31 para 1,32 por vaga) | Simulação |
| Horas poupadas na coordenação | 135 h por ano | Premissa: 5 min por oferta evitada |
| Valor das horas | R$ 8,1 mil por ano | Premissa: R$ 60 por hora |
| Infraestrutura | R$ 2,6 mil por ano | US$ 40 por mês (servidor US$ 15, banco US$ 25), a reconferir na contratação; câmbio de R$ 5,50 (premissa) |
| Gemini | R$ 45 por ano | Menos de US$ 1 por 200 chamadas, com 2 chamadas por vaga (preço lido em outubro) |
| Operação e suporte | R$ 31,2 mil por ano | Premissa: 4 h por semana a R$ 150 por hora |
| **Custo total** | **R$ 34 mil por ano** | Soma; **não inclui** parecer jurídico nem implantação, ainda não cotados |

ROI do hospital = (benefício − custo) ÷ custo, **sem** contar as horas de coordenação, que somam só R$ 8,1 mil e não sustentam o projeto sozinhas:

<!-- keep -->
| Vagas descobertas evitadas por ano | V = R$ 1.000 | V = R$ 2.000 |
| --- | ---: | ---: |
| 11 (um quarto das 44 de hoje) | −68% | −35% |
| 22 (metade) | −35% | +29% |
| 44 (todas, como na simulação) | +29% | +159% |

V = R$ 1.000 e R$ 2.000 são ordens de grandeza: o plantão de 12 h tem referência pública de R$ 1.500 (Fhemig, 2024), e a mediana simulada é R$ 1.907. **Não** são o custo real de uma vaga descoberta. A leitura: o projeto se paga se evitar **17 vagas por ano com V de R$ 2.000** ou **34 com V de R$ 1.000**; se o coordenador real já cobre bem, o ganho encolhe e o caso de negócio some em parte dos cenários. No sentido oposto, com a taxa de turnos descobertos da única referência acadêmica encontrada (11,3%, hospitais públicos ingleses), seriam cerca de 92 vagas descobertas por ano, e evitar metade delas já pagaria o custo com V de R$ 1.000 (+35%). Por isso **o piloto em paralelo vem antes de cobrar** e o C10 só se declara com os dois números reais.

**Como medir no piloto.** Vagas evitadas = (taxa de vagas sem cobertura da linha de base − a do período) × vagas do período; V vem do financeiro; horas poupadas vêm do registro de ofertas por vaga (C2). Os mesmos dados do C1 a C3 alimentam o ROI, e o teto de custo é o da tabela acima.

### 3.3 Modelo de negócio e posicionamento

<!-- keep -->
| Pergunta | Resposta (hipótese a validar) |
| --- | --- |
| Quem paga | O hospital, por **assinatura fixa**; nada é cobrado do médico nem por contratação, o que também sustenta a neutralidade exigida pela Res. CFM 2.460 |
| O que o hospital compra | Menos tempo e menos chamadas por vaga, menos vagas descobertas, jornada sob controle e trilha de auditoria para a Comissão de IA |
| Como se compara | Grupos de mensagem e planilhas: manuais e opacos. Apps de vagas e escalas (LinkEscala, MEDSHIFT, Pega Plantão, Stargrid): vagas e alertas, sem IA explicável. Revoluna: declara recomendação e previsão de picos, sem explicação por recomendação nem contestação. Flexzo (Reino Unido e EUA): match por IA e rede verificada, sem as regras brasileiras |
| Diferencial | **Ter IA não é diferencial.** O diferencial é ser explicável, contestável, auditável e desenhada para as resoluções do CFM, e aceitar medir o próprio resultado contra um baseline |
| Quando cobrar | Depois do piloto em paralelo: o preço parte do custo da seção 3.2 e do ROI medido, e não antes |

## 4. Experiência

### 4.1 Usuários e jornada

<!-- keep -->
| Passo | Coordenador de escala | Médico plantonista | Medida de experiência |
| --- | --- | --- | --- |
| 1 | Descreve a vaga em texto livre e confere os campos extraídos | Cadastra especialidade, disponibilidade e raio | Tempo para publicar a vaga: 2 min ou menos (meta do grupo) |
| 2 | Vê o top 5 com motivo, alertas de jornada e os excluídos com a regra | Recebe só ofertas relevantes, com o motivo | 4 de 5 entendem o motivo sem ajuda (C8) |
| 3 | Aprova; a oferta segue em cascata (sem aprovação, nada sai) | Aceita ou recusa; se não responder, a oferta expira e passa ao próximo | Recomendações aceitas: 60% ou mais (C7) |
| 4 | Acompanha o aceite e a trilha de auditoria | Contesta uma recomendação e vê a resposta | Contestações respondidas no prazo: 100% (C8) |

**Decisões de desenho:** o coordenador **confere** o que a IA extraiu antes de seguir; texto suspeito é sinalizado; o motivo é legível por quem não é técnico; o médico enxerga por que foi chamado e como contestar; erro do Gemini cai nas regras, com aviso discreto, e a vaga nunca fica parada.

### 4.2 Protótipo e interface

![Tela 1 (real): o pedido em texto livre e os campos lidos, para conferir](design/capturas/nova-vaga-1440.png)
![Tela 2 (real): a ordem sugerida, com o motivo de cada médico e quem ficou de fora](design/capturas/sugestoes-1440.png)

![Tela 3 (real): a decisão do coordenador, que fecha o tracejado da IA](design/capturas/decisao-dialogo-1440.png)
![Tela 4 (wireframe): oferta ao médico, com motivo e contestação](wireframes/04-medico-oferta-e-contestacao.svg)

As três primeiras imagens são da versão funcional, no ar em [handson-plantaoseg.vercel.app](https://handson-plantaoseg.vercel.app), em modo de demonstração (dados e relógio simulados, no navegador): página inicial, ajuda, entrada por persona e a tela completa do coordenador, do pedido à decisão. A sugestão da IA aparece em traço tracejado, e a decisão humana, em traço contínuo com selo. A tela do médico ainda é wireframe: ela, a ligação com a API e a cascata na tela estão em construção para a apresentação de 17/11, uma **demonstração guiada** pelo Victor. As telas **ainda não foram testadas com usuários**.

### 4.3 Como medir a experiência

- **Teste de usabilidade** com 5 pessoas (de preferência coordenadores de escala; se não for possível até a entrega, colegas, e o resultado será dito assim). Roteiro completo em [`docs/ux/teste-de-usabilidade.md`](ux/teste-de-usabilidade.md); hoje só as tarefas do coordenador podem ser aplicadas:

<!-- keep -->
| Tarefa | O que mede | Critério de aceite |
| --- | --- | --- |
| Descrever uma vaga com as próprias palavras (tela 1) | Quantas vezes corrige os campos extraídos | Até 1 correção por vaga |
| Dizer por que o primeiro candidato foi recomendado (tela 2) | Se o motivo é compreendido | 4 de 5 sem ajuda |
| Dizer por que um médico não apareceu (tela 2, quem ficou de fora) | Se a regra e a evidência bastam | 4 de 5 sem ajuda |
| Aprovar a lista e acompanhar a oferta (tela 3) | Tempo e erros | Concluir sem ajuda |
| Como médico, explicar a oferta recebida e contestar (tela 4) | Se contestar é descoberto sem ajuda | 4 de 5 sem ajuda |
- **Indicadores:** tarefas concluídas sem ajuda, tempo por tarefa, correções nos campos extraídos e pontuação na escala SUS (meta de 68 ou mais, a média usual da escala). Aceite sugerido: 4 em 5 entendem o motivo e a regra.
- **Retroalimentação:** cada recomendação traz "o motivo não faz sentido" e cada oferta, "contestar"; ambos entram na trilha, e a lista de contestações é revisada todo mês junto com o C5 e o C6.
- **Status:** o teste ainda não foi executado, e esta seção não traz resultado dele. Se não acontecer, a tela do coordenador será avaliada pelas diretrizes de interação humano-IA, o que não substitui usuários.

## 5. Segurança e ética

O projeto trata dados pessoais, ranqueia pessoas e afeta renda e segurança do paciente. O STRIDE completo está em [`docs/seguranca-ameacas.md`](seguranca-ameacas.md); aqui ficam os riscos que mais pesam, com o que foi medido.

### 5.1 Matriz de riscos

<!-- keep -->
| Risco | Prob. | Impacto | Mitigação | Residual |
| --- | --- | --- | --- | --- |
| **Concentração das ofertas:** os 10% mais recomendados ocupam 50,7% do top-5 (manual: 31,1%) e 47% dos elegíveis nunca aparecem | Alta | Alta | Rodízio entre médicos de chance parecida: 50,7% para 28,5% do top-5, com 1,8 ponto a menos de chance (simulação); meta C5 | Medida, **ainda não na API**: é condição do piloto |
| **Exclusão por zona:** a distância age como proxy; leste e oeste têm razão de participação de 0,01 | Alta | Alta | Revisão humana da lista; monitoramento por grupo; limite ao peso da distância | Existe; o rodízio não a resolve (0,01 para 0,07) |
| Vazamento de dado pessoal | Média | Alta | Nada pessoal ao LLM; RLS; aviso e filtro no texto livre; só texto sintético na camada gratuita e, em produção, camada paga com acordo de tratamento de dados | Texto digitado pode conter dado pessoal |
| Injeção de prompt | Média | Média | LLM sem ferramentas nem segredos; saída em esquema fechado; 10 ataques testados | No Gemini real, nenhum dos 10 foi obedecido; o residual é ataque novo |
| Confiança excessiva na lista | Média | Alta | Aprovação explícita, motivos e alertas visíveis, trilha | Treinamento e cultura |
| Pagamento influenciar o ranking (Res. CFM 2.460) | Baixa | Alta | Lista fechada de variáveis e teste na CI | Depende de a lista continuar sob revisão |
| Modelo piorar no mundo real | Média | Média | Começa pelo baseline; portão em teste temporal; monitoramento semanal; volta ao baseline | Viés de seleção do modo sombra |
| Falha ao vivo (rede, serviço externo) | Média | Média | Fallback em regras, modo de demonstração na web e vídeo | Errar um passo conduzindo sozinho: roteiro escrito e ensaio |
| Interpretação jurídica errada | Média | Alta | Todas as afirmações legais citam a fonte e dizem "validar com jurídico" | **Pendente**: nenhum parecer foi obtido |

### 5.2 Privacidade e segurança

- **Hoje não há dado pessoal real:** nome, CRM e telefone são fictícios e marcados como simulação. Em produção, valem a LGPD (base legal, minimização e relatório de impacto, a validar com jurídico) e o aviso de que o texto vai a um provedor de LLM que pode processar fora do Brasil.
- **Acesso:** o médico vê o que é seu e o coordenador, só os elegíveis da própria vaga (RLS, 100 testes de banco); a tabela de valor não tem acesso público.
- **Trilha:** `audit_log` só de inserção, com hash encadeado e versão do modelo em cada decisão; recusa campos de nome, CRM e telefone.
- **Servidor:** login só por chave, firewall (22, 80 e 443), HTTPS, limite de 30 requisições por segundo por IP e de 70 KB por corpo, rotas internas fora da internet, editor do n8n com login e limite de tentativas, segredos fora do Git (varredura na CI). Aceito para um servidor de poucas semanas: o Traefik lê o socket do Docker.

### 5.3 Vieses

![Taxa de aceite por faixa de distância (simulação)](analise/fig1-aceite-por-distancia.svg)
![Exposição das ofertas por zona de residência (simulação)](analise/fig4-exposicao-por-zona.svg)

O ranking **não usa** gênero, idade nem zona; eles ficam só na auditoria. Ainda assim, a participação no top-5 em relação aos elegíveis (1,00 seria proporcional) mostra: gênero F 1,20 e M 0,83; zona sul 1,82, norte 1,66, centro 0,87, leste e oeste 0,01. O padrão vem da distância (quem mora longe aceita menos: 39,9% até 5 km contra 17,4% a partir de 20 km) e é um critério operacional legítimo, mas **excluir zonas inteiras não é aceitável sem revisão humana**. O rodízio reduz a concentração em pessoas, mas não a exclusão por zona (leste e oeste vão de 0,01 a 0,07): quem mora longe quase nunca tem chance parecida com a do melhor, e isso pede revisão humana da lista e limite ao peso da distância. Como o simulador errou a composição por gênero e idade, **a linha de base de equidade precisa ser refeita com dados reais** no piloto.

### 5.4 Aspectos legais (todos a validar com jurídico)

<!-- keep -->
| Norma ou tema | O que importa para a plataforma | Situação no desenho |
| --- | --- | --- |
| Res. CFM 2.454/2026 (IA) | Avaliação de risco, mitigação de viés, explicabilidade, contestação e decisão humana | Risco **médio (preliminar)**, e não baixo como na Entrega 1: ranqueia pessoas. Ficha de risco, logs, explicação e contestação. A classificação formal é do hospital |
| Res. CFM 2.460/2026 | Veda vantagem econômica ligada à contratação ou ao favorecimento em escala, inclusive por plataformas | Assinatura fixa, nada cobrado do médico, pagamento fora do ranking, com teste |
| Res. CFM 2.462/2026 | Sanções a quem não paga médicos | Aviso de **suspensão judicial integral** no texto lido; o rastro de pagamento fica fora do núcleo |
| LGPD | Base legal, minimização, relatório de impacto, revisão de decisões automatizadas | Dados sintéticos; texto de LGPD ainda **não lido** pelo grupo |
| Pejotização (STF, Tema 1.389) | Tese pendente | Plataforma neutra quanto ao contrato; sem horários, metas nem punições impostos |
| Jornada | Sem limite federal único; CFM recomenda até 24 h; Cremesp veda mais de 24 h em SP | Política configurável (24 h e 11 h de descanso), exceção só com justificativa humana |

### 5.5 Responsabilidades

<!-- keep -->
| Quem | Responde por |
| --- | --- |
| Coordenador de escala | Aprovar ou recusar cada recomendação; é a decisão final e fica registrada |
| Hospital (controlador dos dados) | Base legal, política de jornada, classificação de risco e Comissão de IA |
| PlantãoSeguro (operador) | Motor, segurança, trilha, monitoramento de viés e aviso de falhas |
| Médico | Manter cadastro e disponibilidade corretos; pode contestar |
| Equipe do projeto | O que este documento afirma: números rotulados como simulação e pendências ditas |

## 6. Implantação

### 6.1 Arquitetura e infraestrutura

![Arquitetura de implantação](figuras/arquitetura-implantacao.svg)

<!-- keep -->
| Camada | Tecnologia | Onde | Custo hoje |
| --- | --- | --- | --- |
| Web | Next.js 16, Tailwind | Vercel, plano gratuito | 0 |
| Dados | Postgres, Auth e RLS | Supabase, São Paulo, plano gratuito | 0 |
| API | FastAPI (Python 3.12) | Servidor Hostinger KVM 1, atrás do Traefik 3.7 | Plano de 1 mês, só para a apresentação |
| Cascata | n8n 2.46 em modo fila, com Redis e Postgres | Mesmo servidor | Incluído |
| LLM | Gemini 3.1 Flash-Lite (lê o pedido) | Google, camada gratuita e sem faturamento, só com texto sintético; a chave só entra no ensaio e no dia | 0 |

O servidor e o protótipo existem **só até a apresentação de 17/11**: depois, o servidor é desligado, e nada existe só nele (Compose, workflows e regras estão no Git). Em produção, o desenho muda de escala, não de forma: mais um worker do n8n, servidor maior, banco em plano pago e o Gemini na camada paga, com acordo de tratamento de dados.

### 6.2 Integração

<!-- keep -->
| Dado | Origem | Entra como | Frequência |
| --- | --- | --- | --- |
| Hospital e unidades | Cadastro do hospital, conferido no CNES (API pública) | Cadastro na implantação | Mensal |
| Médico e CRM | Cadastro do médico; situação no serviço de consulta do CFM | Conferência por API ou lote | Diária |
| Disponibilidade | Médico, no celular | Janelas semanais e bloqueios | Quando mudar |
| Vagas | Coordenador, em texto livre | Conferido na tela | A cada vaga |
| Ofertas e respostas | A própria plataforma | Registro de cada oferta | Em tempo real |
| Comparecimento | Coordenador (depois, ponto ou check-in) | Confirmação em até 24 h | A cada plantão |
| Valor do plantão | Financeiro, se o hospital quiser | Tabela separada, fora do ranking | A cada plantão |

Quase tudo nasce **dentro da plataforma**; o dado real que substitui o sintético é o registro de ofertas e respostas. Regras de qualidade rodam na entrada, e o treino mensal usa só ofertas de plantão já terminado. O acesso ao CFM tem custo anual para empresa particular (cerca de R$ 948, lido em 03/11) e talvez precise de contrato do hospital: validar. Detalhe em [`docs/dados/dados-em-producao.md`](dados/dados-em-producao.md).

### 6.3 Roadmap, recursos e custos

<!-- keep -->
| Fase | Quando | O que acontece | Portão para avançar |
| --- | --- | --- | --- |
| 0. Demonstração | Até 17/11/2026 | Protótipo no ar, em demonstração guiada pelo Victor, com dados sintéticos | Ensaio completo e plano B pronto |
| Pré-requisitos | Antes do piloto | Rodízio contra a concentração na API (C5), Gemini na camada paga com acordo de tratamento de dados, parecer jurídico, contrato e base legal com o hospital | Os quatro itens fechados |
| 1. Piloto em paralelo | Meses 0 a 3 | Coordenador trabalha como sempre; o sistema calcula e não envia oferta; mede-se a linha de base real | C6 melhor que o baseline; C1 a C3 medidos |
| 2. Uso assistido | Meses 4 a 6 | Coordenador aprova ofertas na ferramenta, com cascata e trilha | Decisão do mês 6 (seção 1) |
| 3. Integração | Depois de 6 meses | API ou webhook com escala, ponto e financeiro | O C10 justifica o custo |

**Recursos:** equipe de 6 pessoas com dedicação parcial (produto, back-end e dados, front-end, segurança e conformidade, implantação e suporte); do lado do hospital, um coordenador defensor do projeto e a TI para o acesso. **Custos estimados:** os da seção 3 (R$ 34 mil por ano por hospital, dominados pela operação); **não estão estimados** o parecer jurídico, a implantação nem o treinamento, e serão cotados antes do piloto.

### 6.4 Gestão do projeto: partes interessadas, riscos e monitoramento

<!-- keep -->
| Parte interessada | Interesse | Como entra no projeto |
| --- | --- | --- |
| Coordenador de escala | Preencher vagas rápido e sem lacunas | Defensor do projeto no hospital; valida tela e linha de base |
| Médicos plantonistas | Ofertas que cabem na rotina e transparência | Entrevistas, teste de uso e canal de contestação |
| Diretoria e financeiro do hospital | Custo e risco regulatório | Fornece o custo de uma vaga descoberta (V) e aprova o piloto |
| Comissão de IA e jurídico | Conformidade com as resoluções e a LGPD | Classifica o risco, revisa a trilha e dá o parecer |
| TI do hospital | Acesso, segurança e integração | Autoriza as integrações e o acesso aos dados |
| Equipe do projeto | Entregar com honestidade e no prazo | Constrói, mede e documenta |

<!-- keep -->
| Risco do projeto | Resposta |
| --- | --- |
| Prazo curto até 17/11 para ligar a web à API e fazer a tela do médico | Ordem de corte: a contagem do sistema na equidade, a resposta da contestação e a área "Minha conta" do médico; a decisão humana, a cascata, a acessibilidade básica e o modo de demonstração nunca entram no corte |
| Sem entrevistas (decisão do grupo em 06/11) | Fonte pública para cada premissa que tiver uma, premissa declarada onde não tiver, análise de sensibilidade e o piloto em paralelo como validação |
| Hospital não aceitar o piloto em paralelo | Piloto retrospectivo, com histórico anonimizado e base legal, ou segundo hospital |
| Dependência de serviço externo (Gemini, Supabase gratuito) | Fallback em regras, modo de demonstração e vídeo; reconferir limites antes de 13/11 |

**Monitoramento depois da implantação.** Painel semanal com C1 a C5 e C7, comparado com a linha de base; revisão mensal das contestações, da distribuição das variáveis e do ranking por grupo; o modelo novo só entra se ganhar do baseline e do modelo em uso **sem piorar o C5 além do limite combinado**, e cada versão fica em `model_registry` e no `audit_log`. Se um indicador de parada for atingido, a recomendação volta ao baseline até a causa ser entendida.

### 6.5 Próximos passos

<!-- keep -->
| Quando | O que | Quem |
| --- | --- | --- |
| Até 13/11 | Ligar a web à API e ao banco; tela do médico com a cascata; contestação, auditoria e equidade; o rodízio na API; código congelado | Victor e equipe |
| Até 13/11 | Teste de usabilidade da tarefa do coordenador, se o grupo puder | Colegas |
| 17/11 | Apresentação final, com demonstração guiada pelo Victor; a plateia assiste | Todos |
| Depois | Parecer jurídico, desligamento do servidor, escolha do hospital do piloto e as entrevistas, com o kit pronto | Grupo |

## 7. Fechamento

**Afirmações e a base de cada uma.**

<!-- keep -->
| Afirmação | Base | Confiança |
| --- | --- | --- |
| O modelo supera o baseline | 17 cenários simulados, +2,1 a +6,4 pontos | Média: o modelo aprende o simulador |
| O fluxo reduz o tempo em pelo menos 50% | 14 de 17 cenários, contra um processo manual simulado | Baixa: depende do coordenador real |
| A jornada não é violada | Filtro em código, com testes | Alta |
| A concentração é um problema | 17 de 17 cenários | Alta, e é a mais incômoda |
| O rodízio reduz a concentração com custo pequeno | 7 políticas nas mesmas 392 vagas | Média: simulação, ainda fora da API |
| O projeto se paga | Premissas de custo e de valor da vaga | Baixa: faltam V e a linha de base real |

**Onde cada exigência da Aula 4 está.**

<!-- keep -->
| Exigência | Seção |
| --- | --- |
| Resultado técnico: o que foi desenvolvido, como funciona, resultados, métricas e limitações | 2.1 a 2.5 |
| Resultado para o negócio: problema, benefício, KPI e ROI | 3.1 a 3.3 |
| Experiência: uso, jornada, protótipo e interface | 4.1 a 4.3 |
| Segurança e ética: riscos, privacidade, segurança, vieses, aspectos legais e responsabilidades | 5.1 a 5.5 |
| Implantação: arquitetura, infraestrutura, integração, roadmap, recursos, custos e próximos passos | 6.1 a 6.5 |
| Critérios de sucesso e a pergunta dos 6 meses | 1 e a regra de decisão |
| Métricas numéricas, baseline e sem "achismos" | Todas as seções; o que é premissa está marcado |
| Disciplinas: negócios, projetos, UX, cibersegurança, direito e ética, ciência de dados | 3, 6, 4, 5, 5 e 2 |

**Uso de IA no desenvolvimento.** O trabalho foi feito pelo grupo **em conjunto** com o Claude Code: a sugestão dos dados sintéticos e o recorte do segmento partiram do grupo; o Claude Code escreveu código e rascunhos que o grupo revisou, e o que foi aceito ou corrigido está no diário de bordo ([`docs/diario-de-bordo.md`](diario-de-bordo.md)). O produto usa o Gemini, e o Claude Code é só ferramenta de desenvolvimento.

**Referências no repositório:** [`docs/03`](03-entrega-2-prova-de-conceito.md) (dados, análise e solução), [resultados](resultados/metricas-fluxo.md), [teste de premissas](resultados/metricas-robustez.md), [carga da API](resultados/metricas-carga-api.md), [concentração](resultados/metricas-concentracao.md), [premissas contra fontes públicas](resultados/premissas-comportamento.md), [roteiro até o MVP](roteiro-ate-o-mvp.md), [dados em produção](dados/dados-em-producao.md), [dicionário com exemplo](dados/dicionario-exemplo.md), [segurança](seguranca-ameacas.md), [kit de entrevistas, para o piloto](entrevistas/LEIAME.md) e [rastreabilidade das exigências do professor](rastreabilidade-professor.md).
