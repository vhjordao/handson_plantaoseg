# ADR 0001: Segmento inicial da PoC

- **Status:** aceita pelo Victor em 28/10/2026 (G0); **atualizada pelo Victor em 30/10/2026**, de "UPA e pronto-socorro" para "pronto-socorro de hospitais privados". O grupo pode pedir revisão.
- **Origem:** feedback do professor sobre a Entrega 1 (FB-1) em [docs/rastreabilidade-professor.md](../rastreabilidade-professor.md).

## Contexto

A Entrega 1 cobre hospitais, várias especialidades, escalas, médicos e funções de gestão. O professor sugeriu começar por um tipo de hospital, uma especialidade ou um perfil de escala, para a primeira versão ser viável e fácil de medir.

## Decisão

A PoC atende um segmento só:

- **Tipo de unidade:** **pronto-socorro de hospitais privados**. Três hospitais privados fictícios de uma mesma rede, cada um com o seu pronto-socorro.
- **Perfil de escala:** plantão noturno de 12 h (19h às 7h) e plantão de fim de semana. É um recorte de projeto: supomos que sejam perfis de cobertura mais difícil e de maior pressão sobre a regra de jornada, **hipótese a validar nas entrevistas** (não há dado nacional que a comprove).
- **Especialidades:** duas, **clínica médica** e **pediatria** (a vaga de exemplo da demo é um pediatra no pronto-socorro do Hospital Modelo Centro).
- **Volume sintético:** cerca de 300 médicos, distribuídos nas duas especialidades, com raio e disponibilidade.

Fora do segmento (evolução futura): UPAs e unidades públicas, outras especialidades, outros setores do hospital (UTI, centro cirúrgico, ambulatório) e escalas administrativas.

## Consequências

- O gerador sintético e a vaga de exemplo seguem este recorte.
- Cada indicador é medido nesse segmento, o que dá a linha de base simulada comparável.
- Ampliar o segmento é um parâmetro do gerador e uma linha no `policy_config`, não uma reescrita.
- **Evidência:** o caso público citado na Entrega 1 (Canoas, RS, unidade municipal) não é do segmento privado. Para hospitais privados, a evidência disponível é a de mercado da Flexzo (alegação da própria empresa, não auditada) e as entrevistas planejadas, ainda por fazer. O `docs/03` deve dizer isso com clareza.
- **Comprador:** o cliente é o hospital privado (gestão e financeiro). O desenho não trata de licitação nem de vínculo com o setor público.
- **Contrato dos médicos:** a plataforma segue neutra quanto ao tipo de contrato (Tema 1.389 do STF pendente); como a forma de contratação em hospitais privados é ponto sensível, **validar com jurídico**.

## Alternativas descartadas

- **Uma única especialidade:** deixaria o ranking trivial e esconderia a regra de elegibilidade por especialidade.
- **Vários tipos de hospital:** dispersa a medição e o gerador, sem ganho para a PoC.
- **UPA e pronto-socorro (versão de 28/10):** substituída por decisão do Victor.

## Histórico

| Data | Mudança |
| --- | --- |
| 28/10/2026 | Proposta inicial: UPA e pronto-socorro, aceita no G0 |
| 30/10/2026 | Victor: pronto-socorro de hospitais privados; frase sobre cobertura passou de afirmação para hipótese |
