# ADR 0001: Segmento inicial da PoC

- **Status:** aceita pelo Victor em 28/10/2026 (G0); o grupo pode pedir revisão.
- **Origem:** feedback do professor sobre a Entrega 1 (FB-1) em [docs/rastreabilidade-professor.md](../rastreabilidade-professor.md).

## Contexto

A Entrega 1 cobre hospitais, várias especialidades, escalas, médicos e funções de gestão. O professor sugeriu começar por um tipo de hospital, uma especialidade ou um perfil de escala, para a primeira versão ser viável e fácil de medir.

## Decisão

A PoC atende um segmento só:

- **Tipo de unidade:** urgência e emergência (UPA e pronto-socorro), três unidades fictícias de uma mesma rede.
- **Perfil de escala:** plantão noturno de 12 h (19h às 7h) e plantão de fim de semana, que são os que mais ficam descobertos e mais pressionam a regra de jornada.
- **Especialidades:** duas, **clínica médica** e **pediatria** (a vaga de exemplo da demo é um pediatra na UPA Centro).
- **Volume sintético:** cerca de 300 médicos, distribuídos nas duas especialidades, com raio e disponibilidade.

Fora do segmento (evolução futura): outras especialidades, hospitais de grande porte com várias alas, escalas administrativas e ambulatório.

## Consequências

- O gerador sintético da Fase 1 e a vaga de exemplo seguem este recorte.
- Cada indicador é medido nesse segmento, o que dá a linha de base simulada comparável.
- Ampliar o segmento é um parâmetro do gerador e uma linha no `policy_config`, não uma reescrita.

## Alternativas descartadas

- **Uma única especialidade:** deixaria o ranking trivial e esconderia a regra de elegibilidade por especialidade.
- **Vários tipos de hospital:** dispersa a medição e o gerador, sem ganho para a PoC.
