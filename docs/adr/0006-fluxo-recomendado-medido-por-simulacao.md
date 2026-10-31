# ADR 0006: Metas de tempo medidas por simulação do fluxo recomendado

- **Status:** proposta de 31/10/2026, no PR da versão 2 do documento da Entrega 2; o merge do PR é o "ok" do Victor.
- **Origem:** feedback do professor sobre a Entrega 1 (FB-3), "justificar as metas com uma linha de base e ajustá-las aos dados disponíveis", em [docs/rastreabilidade-professor.md](../rastreabilidade-professor.md).

## Contexto

A versão 1 do documento da Entrega 2 declarava a meta de reduzir 50% o tempo de preenchimento como "não mensurável em dados sintéticos" e o recall de 0,7 como "reformulado", sem dizer para quê. Duas das seis metas da Entrega 1 (antecedência e aceitação pelo coordenador) nem apareciam. Mas os dados sintéticos já têm o necessário para uma linha de base: o processo manual simulado registra a publicação, cada oferta, cada resposta e o preenchimento da vaga.

## Decisão

1. A **linha de base** das metas de tempo, de ofertas e de antecedência é o **processo manual simulado**, lido direto de `shifts` e `offers`, sem nenhuma suposição extra.
2. O **fluxo recomendado** é simulado nas mesmas vagas do período de teste: chama os elegíveis na ordem de cada método (modelo, baseline heurístico, sorteio entre elegíveis e oráculo) até alguém aceitar, com a chance verdadeira de aceite do simulador e as **mesmas premissas de tempo do gerador** (constantes nomeadas em `app/synthetic/generator.py`, usadas pelas duas pontas).
3. A comparação inclui o **sorteio entre elegíveis**, para separar o que vem do filtro de regras do que vem do ranking.
4. A **concentração das ofertas** é medida de três formas (ofertas do processo manual, lugares do top-5 e ofertas efetivas se a cascata seguir a ordem) e o resultado é publicado mesmo sendo desfavorável.
5. Tudo sai de um comando (`make flow`), com semente fixa, em `docs/resultados/metricas-fluxo.{md,json}`; o documento da entrega cita esses valores e `tests/test_docs_sync.py` falha se divergirem.

## Consequências

- A meta de -50% no tempo passa a ter um resultado em simulação (110 para 47 min, 57% a menos), com a ressalva de que **72% do ganho vem do filtro de regras** e de que o processo manual simulado é premissa do grupo; a linha de base real continua dependendo das entrevistas (Etapa 3).
- A meta de +20 pontos de antecedência fica demonstrada como inalcançável só com a recomendação (teto de 76,0% das vagas já publicadas com 24 h ou mais): depende da previsão de vagas, que é evolução futura.
- A concentração aparece como **risco medido**: o fluxo recomendado concentra mais que o processo manual (31,1% para 50,7% nos lugares do top-5), o que vira prioridade de mitigação na Etapa 3.
- O recall de 0,7 e a aceitação pelo coordenador continuam sem resultado, e o documento diz por quê (módulo de previsão adiado; não há coordenador simulado).

## Alternativas descartadas

- **Manter "não mensurável":** deixava o ponto 3 do feedback respondido pela metade.
- **Medir o tempo só no baseline heurístico:** esconderia o ganho real (o filtro de regras) e a comparação que importa, que é contra o processo manual.
- **Simulação dinâmica, com agenda atualizada a cada escalação:** daria uma concentração menos superestimada, mas exige reescrever o armazém de variáveis; fica como evolução, e o relatório avisa que a estimativa atual é superior.

## Limites

- As premissas de tempo (resposta média de 20 min, 70% de recusa e 30% de expiração em 60 min, 1 a 10 min entre ofertas) são do grupo, sem fonte externa.
- A chance de aceite dos elegíveis é a verdadeira do simulador; no mundo real ela é desconhecida.
- Vagas sem cobertura próximas de zero no fluxo recomendado dependem dessa premissa e não devem ser lidas como promessa.
