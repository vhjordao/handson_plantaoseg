# Guia de postagem da Entrega 2

O que postar no Moodle e como conferir antes. Prazo: **sábado, 31/10/2026**. Esta é a **versão 2** do documento (revisada em 31/10 depois de conferir o feedback da Entrega 1 e os slides da Etapa 2); a versão 1 está na tag `etapa-2`.

## O que postar

| Arquivo | Para quê |
| --- | --- |
| [Entrega2-PlantaoSeguro.pdf](Entrega2-PlantaoSeguro.pdf) | **O documento da entrega**, com 7 páginas (a faixa pedida é de 5 a 8) |
| Link do repositório | https://github.com/vhjordao/handson_plantaoseg (código, dados sintéticos, testes e documentos) |
| Link da versão entregue | https://github.com/vhjordao/handson_plantaoseg/tree/etapa-2-rev1 (tag `etapa-2-rev1`, versão 2) |

Se o Moodle aceitar só um arquivo, poste o PDF e escreva os links no campo de texto. Se aceitar vários, anexe também [`docs/exemplo-trabalhado.md`](../exemplo-trabalhado.md) e [`docs/analise/README.md`](../analise/README.md).

## Antes de postar (conferência de 5 minutos)

1. Abra o PDF e confira a primeira página (nomes do grupo, data e os quatro cartões de resultado), o rodapé "Página X de 7" e as cinco figuras.
2. Confirme que a tag `etapa-2-rev1` existe e que o PR da versão 2 foi mergeado: os links relativos do PDF viram `https://github.com/vhjordao/handson_plantaoseg/blob/main/...` e só funcionam depois do merge.
3. Rode `make poc` e `make test` (ou veja a CI verde na aba Actions) para a evidência estar fresca.
4. Se algo mudar depois da postagem, não mova a tag: crie outra, por exemplo `etapa-2-rev2`.

## Como regerar o PDF

```
make entrega        # gera o HTML imprimível e o PDF (precisa de Edge ou Chrome)
```

Equivale a `python -m app.cli build-doc` seguido de `sh scripts/gerar-pdf.sh`. O PDF sai do [`docs/03-entrega-2-prova-de-conceito.md`](../03-entrega-2-prova-de-conceito.md); **edite o Markdown e regere**, não o PDF. Os números do documento vêm de `docs/resultados` (`make evaluate` e `make flow`) e um teste (`tests/test_docs_sync.py`) falha se divergirem. Dois marcadores do Markdown só afetam o PDF e passam despercebidos no GitHub: `<!-- kpis -->` (tabela vira cartões) e `<!-- keep -->` (tabela não quebra entre páginas).

## O que o documento diz com todas as letras

- Os dados e os resultados são **simulação**; não provam desempenho no mundo real, e o ganho de tempo depende das premissas do simulador (72% dele vem do filtro de regras).
- A **concentração das ofertas piora** frente ao processo manual simulado (31,1% para 50,7% nos lugares do top-5): é o principal risco, com mitigações para a Etapa 3.
- O **Gemini não foi exercitado** contra o serviço real; há plano de teste manual em [`docs/teste-manual-gemini.md`](../teste-manual-gemini.md).
- A interface, a API e o n8n foram **adiados** por decisão do grupo (ADR 0004); a PoC roda por linha de comando.
- A Res. CFM 2.462 traz aviso de **suspensão judicial** no PDF oficial; a classificação de risco foi reavaliada para médio; a LGPD, o Tema 1.389 e as normas de jornada **não foram lidos**; tudo isso **depende de validação jurídica**.
- O trabalho foi feito **em conjunto** entre o Victor e o Claude Code; a sugestão dos dados partiu do Victor.

## Pendências conhecidas

- O vídeo da aula de 27/10 não foi transcrito (A3-13 na rastreabilidade).
- As entrevistas planejadas na Entrega 1 (3 a 5 com coordenadores e 3 a 5 com plantonistas) ainda não aconteceram, então a linha de base real do tempo e da antecedência não existe.
- O teste do Gemini com chave e a validação jurídica ficam para a Etapa 3.
