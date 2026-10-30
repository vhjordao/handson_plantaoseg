# ADR 0005: Portão G-P, PoC mínima executável e material de especificação

- **Status:** aceita pelo Victor em 30/10/2026 ("faça os dois, execute e documente tudo para postagem da etapa 2").
- **Origem:** o [ADR 0004](0004-prototipo-adiado.md) adiou o protótipo e deixou a forma da PoC para o portão G-P. O Victor escolheu **as duas opções** apresentadas: a PoC mínima executável (P1) e o conjunto de especificação que vale mesmo sem executável.

## Contexto

A entrega da Etapa 2 é no sábado 31/10/2026. O professor lista a PoC entre os 4 entregáveis. Nenhum dos portões G1 e G-P tinha decisão registrada.

## Decisão

1. **PoC mínima executável (P1)**, só com a biblioteca padrão do Python 3.12 (sem dependências, para rodar na CI e em qualquer máquina com Python):
   - gerador de dados sintéticos com semente, qualidade e manifesto;
   - filtro determinístico de elegibilidade e jornada, com a regra que barrou cada excluído;
   - as 9 variáveis do ranking no instante da oferta (sem vazamento do futuro);
   - ranking baseline heurístico e regressão logística, com validação temporal e avaliação contra o baseline;
   - explicação em template e reescrita opcional pelo Gemini com validação e fallback;
   - extração da vaga por regras e, opcionalmente, pelo Gemini, com guardrails e casos de injeção de prompt;
   - aprovação humana e `audit_log` encadeado por hash;
   - uso por linha de comando, sem tela.
2. **Material de especificação** (a "opção sem executável"), que cobre o que a P1 não mostra e vale sozinho: desenho da solução de IA, exemplo trabalhado gerado a partir da execução, wireframes das telas, modelagem de ameaças, plano de teste manual do Gemini e plano de verificação das normas.
3. **G1:** ao mandar executar, o Victor adotou os padrões recomendados da seção 11 do [dicionário de dados](../dados/dicionario-de-dados.md). Ajustes de implementação ficam registrados como v0.2 no próprio dicionário.

O ADR 0004 continua valendo para o resto: **não** se constrói interface web, fluxos do n8n, API HTTP, banco/RLS nem extensão do Compose.

## Consequências

- A P1 é o motor que a API e a interface vão usar depois (reaproveitamento para a apresentação de 17/11).
- Os números saem de **simulação**: o modelo reaprende o simulador, e as métricas são sempre ao lado do baseline.
- O Gemini **não foi testado contra o serviço real** (sem chave em 30/10). A integração fica atrás de uma interface, com cliente de teste, e os testes cobrem validação, fallback e injeção; não cobrem o comportamento do modelo.
- A evidência de testes é a CI do GitHub (pytest e ruff) e a execução local por `unittest`; o ambiente local do Victor continua sem Python completo.

## Ordem de corte dentro da P1

Do mais para o menos importante: dados e filtro, baseline e explicação em template, auditoria, modelo de regressão logística e avaliação, extração por regras, camada do Gemini, análise de disparidade. Segurança e regras inegociáveis não entram no corte.

## Alternativas descartadas

- **Só a especificação:** deixaria a PoC sem evidência executável.
- **Só a P1:** perderia o material que sustenta o documento mesmo se algo falhar.
- **API e interface (P3):** inviáveis até 31/10 e contra o ADR 0004.
