# ADR 0017: O ranking da API usa o rodízio entre equivalentes

- **Status:** decidida em 06/11/2026. O experimento recomendou a política, e o Victor pediu para levá-la à API ("Sim, fazer a 7.2"). Vale até ele pedir revisão.
- **Origem:** passo 7.2 do [roteiro até o MVP](../roteiro-ate-o-mvp.md), com o [experimento da concentração](../resultados/metricas-concentracao.md) (7.1).

## Contexto

O ranking só pelo modelo põe os 10% de médicos mais recomendados em 50,7% dos lugares do top-5 e, numa estimativa superior, em 82,1% das ofertas. No processo manual simulado, esse grupo recebe 31,1% das ofertas. É o maior risco ético que o projeto mediu.

O experimento testou sete políticas nas mesmas 392 vagas de teste, em simulação. Pelo critério do grupo, vence a que mais reduz a concentração perdendo até 2 pontos de chance de sucesso: o **rodízio com margem de 10 pontos**. Com ele, os 10% mais expostos passam a 35,7% das ofertas e a 28,5% do top-5, com 1,8 ponto a menos de chance de sucesso.

## Decisão

1. **A regra.** A ordem continua sendo a do modelo. Entre os elegíveis com chance prevista a até 10 pontos da melhor ainda disponível, vai primeiro quem apareceu menos no top-5 nos últimos 7 dias. No empate, vence o modelo. Ninguém passa à frente de alguém mais de 10 pontos melhor, e ninguém sai da lista.
2. **Um código só.** A regra mora em `app/ranking/rotation.py`. O experimento e a API usam a mesma função, e um teste confere que a API roda a política medida.
3. **A exposição vem do banco.** A API conta as recomendações gravadas com posição até 5 nos últimos 7 dias. Não usa valor do plantão, pagamento nem dado pessoal.
4. **Transparência.** A trilha registra a política, a margem, a janela e quem mudou de lugar (posição final, posição só pelo modelo e exposição). A resposta da API traz a posição só pelo modelo e a exposição de cada nome, e `GET /policy` traz a margem e a janela. Na tela do coordenador, um nome que mudou de lugar diz por quê.
5. **Onde não vale.** Sem a contagem, a ordem é só a do modelo. É o caso da PoC na linha de comando e do modo de demonstração da web, que não têm histórico de indicações. Os dados exportados para a demonstração não mudam.

## Consequências

- A concentração deve cair como no experimento, mas a medida que vale é a das ofertas reais, no piloto. A equidade da fase 6 mostra a contagem do sistema ao lado da simulação.
- A chance de sucesso do top-5 cai cerca de 1,8 ponto, e o tempo médio até preencher sobe cerca de 2 minutos, em simulação.
- A posição mostrada deixa de ser só a ordem dos scores. A nota na tela e a trilha explicam cada troca.
- **A demonstração depende do banco limpo.** Recomendações de ensaios na mesma semana contam como exposição e podem mudar a ordem da vaga do roteiro. Antes do dia, o `limpar-demonstracao` apaga as recomendações do login da demonstração, e a contagem recomeça.
- O rodízio não resolve a exclusão por zona: quem mora longe raramente fica a 10 pontos do melhor. Essa medida continua aberta (revisão humana da lista e limite ao peso da distância).

## Alternativas descartadas

- **Limite de exposição** (2 ou 4 aparições por semana): corta a concentração, mas tira do topo quem tem chance muito maior, e a chance de sucesso cai mais. Somado ao rodízio, acrescenta pouco.
- **Margem de 5 pontos:** reduz menos a concentração. É a margem que a tela usa para dizer "chances parecidas".
- **Margem de 15 pontos:** passa do limite de 2 pontos de perda de chance que o grupo definiu.
- **Contar pela trilha em vez da tabela de recomendações:** daria o mesmo número com mais leitura. A tabela já tem a posição e a data.
