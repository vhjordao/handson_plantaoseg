# Entrevistas da Etapa 3

Material para os integrantes conversarem com coordenadores de escala e plantonistas até 06/11. Responde ao ponto do feedback da Etapa 2 sobre a falta de dados reais ([FB2-1](../rastreabilidade-professor.md)).

| Arquivo | Para quê |
| --- | --- |
| [Kit-do-entrevistador.pdf](Kit-do-entrevistador.pdf) | **Comece aqui:** regras, termo, roteiros, ficha e telas. Fonte: [kit-do-entrevistador.md](kit-do-entrevistador.md) |
| [Casos-revisao-cega.pdf](Casos-revisao-cega.pdf) | Folha mostrada aos coordenadores. Fonte: [revisao-cega-casos.md](revisao-cega-casos.md) |
| [revisao-cega-gabarito.md](revisao-cega-gabarito.md) | **Não abra antes de terminar todas as entrevistas.** Diz de onde veio cada lista e como calcular |

Os casos e o gabarito são gerados a partir dos dados sintéticos, com semente fixa, pelo módulo `app/blind_review.py`. Para refazer tudo, inclusive os PDFs (precisa de Edge ou Chrome):

```bash
make PYTHON="py -3.12" kit-entrevistas
```

Fichas preenchidas não entram no Git: a pasta `docs/entrevistas/fichas/` fica de fora, para quem quiser guardá-las aqui. No repositório só entram resultados agregados, sem identificar ninguém.
