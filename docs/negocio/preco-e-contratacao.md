# Preço e contratação (hipóteses a validar)

Resposta ao feedback da Entrega 3: *"mostrar como será estabelecido o preço da solução e como o hospital contratará o serviço após o piloto"*. Os números vêm da [calculadora de custo e preço](../resultados/metricas-custos.md), que mistura preços de tabela conferidos em 11/11/2026 com premissas nossas. **Nada aqui é parecer jurídico, contábil nem proposta comercial**: cada ponto marcado "validar" depende de jurídico, financeiro e do hospital do piloto.

## 1. Princípios do preço

1. **Assinatura fixa, paga pelo hospital.** Nada é cobrado do médico, e nada é cobrado por vaga preenchida, por contratação ou por quem é chamado. A Res. CFM 2.460/2026 veda vantagem econômica ligada à contratação e ao favorecimento em escala, inclusive por plataformas digitais; uma cobrança por colocação pareceria comissão ([conformidade](../conformidade/README.md), seção 3). *Validar com jurídico.*
2. **O preço não entra no ranking.** O valor do plantão e o pagamento ficam fora das variáveis do modelo, com teste na CI.
3. **Previsível.** O hospital sabe quanto paga por ano antes de usar, e o valor não sobe porque o sistema funcionou bem.
4. **Sem preço antes da evidência.** O piloto mede o custo de uma vaga descoberta (V) e a linha de base, e só depois o preço é fechado.

## 2. Como o preço é estabelecido

Três passos, na ordem, todos calculados em [`metricas-custos.md`](../resultados/metricas-custos.md):

1. **Piso: o que custa entregar.** O custo recorrente por hospital (infraestrutura, suporte, manutenção do modelo, revisão jurídica anual) mais a implantação, o treinamento e o parecer diluídos em 3 anos, dividido por 1 menos o imposto e a margem. No cenário base, um hospital sozinho tem custo recorrente de cerca de R$ 69 mil por ano e R$ 159 mil no primeiro ano; a tecnologia (banco, servidor, hospedagem, Gemini) é só cerca de R$ 4 mil por ano. O custo é de gente e de conformidade.
2. **Teto: o que vale para o hospital.** Uma parcela (30%, premissa) do benefício anual dele: as vagas descobertas evitadas vezes V, mais as horas de coordenação poupadas. V é desconhecido; a referência pública do plantão de 12 h (R$ 1.500, Fhemig 2024) é só uma âncora.
3. **Preço: o meio da faixa, quando ela existe.** Se o piso passa do teto, o preço não fecha, e o relatório diz isso.

**Faixas, no cenário base** (preço sugerido por mês, onde fecha):

| Porte | Sozinho | Com 3 hospitais na plataforma | Com 10 |
| --- | ---: | ---: | ---: |
| Pequeno (cerca de 800 vagas por ano) | não fecha | não fecha | não fecha |
| Médio (cerca de 7 vagas por dia) | não fecha | não fecha | não fecha |
| Grande (40 vagas por dia) | R$ 16 mil | R$ 13 mil | R$ 12 mil |

**O que isso quer dizer comercialmente:**

- O custo quase não depende do porte; o benefício sim. O preço só fecha onde há **muitos plantões por dia**: cerca de 30 vagas por dia para um hospital sozinho, 17 com três hospitais dividindo a plataforma e 13 com dez (cenário base).
- Por isso a venda tende a ser para **hospitais grandes, redes e grupos**, e não para hospitais pequenos isolados. Para esses, só um plano compartilhado, sem suporte dedicado e sem implantação sob medida, e esse plano ainda não foi calculado.
- Como referência de mercado, uma ferramenta de escala de plantões aparece com "preço inicial" de R$ 5,7 mil por mês num comparador de terceiros (não confirmado com o fornecedor). O preço sugerido para o hospital grande é de duas a três vezes isso, o que só se sustenta pelo que o produto faz de diferente (explicação, contestação, trilha) e pelo benefício medido no piloto.

## 3. Como o hospital contrata depois do piloto

O caminho segue as fases da [Entrega 3](../04-entrega-3-validacao.md) (seção 6.3), com um portão financeiro e jurídico entre elas.

| Etapa | O que acontece | Preço | Portão para a seguinte |
| --- | --- | --- | --- |
| **0. Antes do piloto** | Carta de intenção, acordo de tratamento de dados (o hospital é o controlador; a plataforma, a operadora), base legal definida, parecer jurídico e avaliação de risco pela Comissão de IA do hospital | Sem cobrança | Os quatro itens fechados |
| **1. Piloto em paralelo** (meses 0 a 3) | O coordenador trabalha como sempre; o sistema calcula e não envia oferta; mede-se a linha de base e o V, com o financeiro | Sem licença. A implantação e o treinamento são absorvidos ou cobrados a preço de custo (a decidir) | C6 melhor que o baseline; C1 a C3 medidos; V informado pelo financeiro |
| **2. Uso assistido** (meses 4 a 6) | O coordenador aprova ofertas na ferramenta, com cascata e trilha | Assinatura mensal na faixa do porte, com contrato curto, renovável | Decisão do mês 6: critérios de continuar ou parar da seção 1 da Entrega 3 |
| **3. Contrato anual** | Renovação por 12 meses (ou 3 anos, com desconto, pela diluição da implantação) | Assinatura fixa fechada com o V medido | Reavaliação anual contra os mesmos critérios |

**Cláusulas que o contrato precisa ter** (a validar com jurídico):

- **Saída sem multa** se um indicador de parada for atingido (por exemplo, a concentração das ofertas acima do limite combinado ou o modelo perdendo para o baseline), e **exportação dos dados**, incluindo a trilha de auditoria (que já exporta em CSV).
- **Papéis da LGPD:** hospital como controlador e plataforma como operadora, com a lista de subprocessadores (banco, hospedagem e Gemini, na camada paga, em que o conteúdo não é usado para melhorar os produtos) e a transferência internacional tratada.
- **Disponibilidade e plano B:** meta de disponibilidade e o processo manual como contingência, dito no contrato.
- **Neutralidade:** o preço não depende de quem é chamado nem de quantas ofertas são aceitas, e a plataforma não cobra do médico.
- **Reajuste** por índice de preços a combinar, sem relação com o desempenho do sistema.

**Quem assina:** no hospital privado e terceirizado (o segmento inicial, ADR 0001), a diretoria e o financeiro, com o parecer do jurídico e da Comissão de IA. Hospital público contrata por licitação ou dispensa e fica fora do primeiro ciclo.

## 4. O que ainda falta

- **V e a linha de base reais**, que só o financeiro de um hospital informa. Sem eles, o ROI continua uma faixa de cenários.
- **Cotação real** do parecer jurídico, do teste de segurança e do suporte; hoje são premissas em faixa.
- **Parecer** sobre o modelo de cobrança frente às Res. CFM 2.460 (arts. 2º, 4º e 6º) e sobre o enquadramento da plataforma.
- **O plano para hospitais pequenos**, se houver interesse em atendê-los.
- **Tributos e forma societária**, com contador.
