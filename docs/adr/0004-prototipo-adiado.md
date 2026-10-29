# ADR 0004: Protótipo adiado, a Etapa 2 começa por Dados, Análise e Solução de IA

- **Status:** aceita por decisão do Victor em 28/10/2026; a decisão sobre **quando e como** construir a PoC fica no portão G-P (ver [plano da Etapa 2](../plano-etapa-2.md)).
- **Origem:** o Victor pediu para **não construir o protótipo ainda**.

## Contexto

O professor pede 4 entregáveis na Etapa 2: **Dados, Análise, Solução de IA e PoC ou protótipo**, em documento de 5 a 8 páginas, com entrega em **31/10/2026** (sábado). O plano anterior misturava tudo e já previa banco, API, interface e n8n.

## Decisão

Até o portão **G-P** ser aprovado, **não se constrói**: `apps/web`, fluxos do n8n, rotas da API, migrações SQL executáveis, políticas de RLS em código nem extensões do Compose. Continua valendo o que já está no PR #1 (CI, Compose base, contrato de neutralidade econômica do ranking).

O que se faz agora:

1. **Dados:** gerador sintético reprodutível, dicionário de dados e relatório de qualidade.
2. **Análise:** análise exploratória dos dados sintéticos, com figuras e a análise textual das vagas em texto livre.
3. **Solução de IA, no papel:** entrada, processamento de IA, saída e usuário; por que IA e onde não; desenho do ranking (baseline e modelo) e protocolo de avaliação; desenho do uso do Gemini (prompts, esquema de saída, guardrails, 10 casos de injeção especificados, fallback).
4. **Segurança, ética e conformidade:** modelagem de ameaças, leitura dos textos oficiais das normas, ficha de risco e viés.
5. **Metas com linha de base e o `docs/03`.**

O que o G-P decide, até quinta 29/10 à noite, com base no andamento: a forma da PoC. As opções, da menor para a maior:

| Opção | O que é | Esforço estimado | Risco |
| --- | --- | --- | --- |
| P1 PoC mínima executável | Notebook ou script que roda o núcleo (filtro, ranking e explicação com fallback) sobre os dados sintéticos e mostra top 5, motivos e excluídos | Cerca de 1 dia de 2 pessoas | Baixo; é o menor artefato que o professor reconhece como PoC (sistema de recomendação, notebook) |
| P2 API sem interface | P1 mais uma API pequena, que o notebook e uma interface futura consomem | 1,5 dia | Médio |
| P3 API e interface do coordenador | Fluxo completo do plano anterior | Mais de 2 dias | Alto para o prazo de 31/10 |

**Recomendação:** decidir pela P1 no G-P, mantendo P2 e P3 para a Etapa 3 e a apresentação de 17/11.

## Consequências

- O professor lista a PoC como um dos 4 entregáveis. **Sem nenhum artefato executável até 31/10, esse entregável fica descoberto** e a nota da Etapa 2 sofre. Por isso o G-P tem data limite.
- As frentes de banco/RLS, interface e n8n (F1, F5 e F6 do plano anterior) ficam em espera; a base já feita não é desperdiçada.
- A divisão núcleo, apoio e evolução futura da [ADR 0002](0002-escopo-da-poc.md) continua valendo para o que for construído depois.
- Cada documento da Etapa 2 deve dizer com clareza o que é projeto (desenho) e o que está executando.

## Alternativas descartadas

- **Construir o protótipo completo agora:** contraria o pedido do Victor.
- **Descartar a PoC da Etapa 2:** descoberto pelo professor; rejeitado, mas a forma mínima fica em aberto no G-P.
