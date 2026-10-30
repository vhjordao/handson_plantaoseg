# Guia de postagem da Entrega 2

O que postar no Moodle e como conferir antes. Prazo: **sábado, 31/10/2026**.

## O que postar

| Arquivo | Para quê |
| --- | --- |
| [Entrega2-PlantaoSeguro.pdf](Entrega2-PlantaoSeguro.pdf) | **O documento da entrega**, com 6 páginas (a faixa pedida é de 5 a 8) |
| Link do repositório | https://github.com/vhjordao/handson_plantaoseg (código, dados sintéticos, testes e documentos) |
| Link da versão entregue | https://github.com/vhjordao/handson_plantaoseg/tree/etapa-2 (tag `etapa-2`; o PR de origem é o [#3](https://github.com/vhjordao/handson_plantaoseg/pull/3), mergeado em 30/10/2026) |

Se o Moodle aceitar só um arquivo, poste o PDF e escreva os links no campo de texto. Se aceitar vários, anexe também [`docs/exemplo-trabalhado.md`](../exemplo-trabalhado.md) e [`docs/analise/README.md`](../analise/README.md).

## Antes de postar (conferência de 5 minutos)

1. Abra o PDF e confira a primeira página (nomes do grupo e data) e as três figuras.
2. Os PRs #1 a #3 já foram mergeados (30/10/2026), então os links do PDF apontam para a `main`: os links relativos viram `https://github.com/vhjordao/handson_plantaoseg/blob/main/...`.
3. Rode `make poc` e `make test` (ou veja a CI verde na aba Actions) para a evidência estar fresca.
4. A tag `etapa-2` já existe (commit de merge `9bfb67a`). Se algo mudar depois da postagem, não mova a tag: crie outra, por exemplo `etapa-2-rev1`.

## Como regerar o PDF

```
make entrega        # gera o HTML imprimível e o PDF (precisa de Edge ou Chrome)
```

Equivale a `python -m app.cli build-doc` seguido de `sh scripts/gerar-pdf.sh`. O PDF sai do [`docs/03-entrega-2-prova-de-conceito.md`](../03-entrega-2-prova-de-conceito.md); **edite o Markdown e regere**, não o PDF. Os números do documento vêm de `docs/resultados` e um teste (`tests/test_docs_sync.py`) falha se divergirem.

## O que o documento diz com todas as letras

- Os dados e os resultados são **simulação**; não provam desempenho no mundo real.
- O **Gemini não foi exercitado** contra o serviço real; há plano de teste manual em [`docs/teste-manual-gemini.md`](../teste-manual-gemini.md).
- A interface, a API e o n8n foram **adiados** por decisão do grupo (ADR 0004); a PoC roda por linha de comando.
- A Res. CFM 2.462 traz aviso de **suspensão judicial** no PDF oficial; a classificação de risco foi reavaliada para médio; tudo isso **depende de validação jurídica**.

## Pendências conhecidas

- O vídeo da aula de 27/10 não foi transcrito (A3-13 na rastreabilidade).
- As entrevistas planejadas na Entrega 1 ainda não aconteceram, então a linha de base real do tempo de preenchimento não existe.
- O teste do Gemini com chave e a validação jurídica ficam para a Etapa 3.
