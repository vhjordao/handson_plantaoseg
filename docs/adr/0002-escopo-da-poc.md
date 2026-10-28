# ADR 0002: Escopo da PoC, funcionalidades centrais e complementares

- **Status:** proposta (28/10/2026); aguarda confirmação do grupo.
- **Origem:** feedback do professor sobre a Entrega 1 (FB-2) em [docs/rastreabilidade-professor.md](../rastreabilidade-professor.md).

## Contexto

O professor recomenda priorizar na PoC duas funcionalidades centrais, a **recomendação de profissionais elegíveis** e a **explicação das recomendações**, e tratar os demais módulos como evolução futura. O roteiro de demo do kickoff tem sete passos, e a apresentação de 17/11 pede a plateia usando o sistema. Pela ordem de autoridade do projeto, o professor vem primeiro.

## Decisão

| Camada | O que entra | Como é tratado |
| --- | --- | --- |
| **Núcleo (medido e documentado a fundo)** | Extração da vaga, filtro de elegibilidade e jornada, ranking (baseline e modelo), explicação com fallback em template | Testes, avaliação contra baseline, análise dos dados, seção principal do documento |
| **Apoio mínimo (necessário para a demo ao vivo)** | Aprovação humana do coordenador, `audit_log`, tela do médico, oferta em cascata no n8n | Entra só depois de o núcleo fechar; documentado como apoio, sem metas próprias |
| **Evolução futura (descrita, não construída ou apenas esboçada)** | Check-in e pagamento, contestação completa, telão com Realtime, Telegram, previsão de vagas descobertas, relatório de equidade, kit para a Comissão de IA | Aparece em "próximos passos" e no roadmap; entra se sobrar tempo, nesta ordem de corte (de baixo para cima) |

Segurança e as regras inegociáveis não entram no corte: aprovação humana, `audit_log`, dados só sintéticos, neutralidade econômica e RLS valem para todo o apoio construído.

## Consequências

- O documento da Etapa 2 e as métricas se concentram no núcleo (qualidade da recomendação e da explicação).
- Se o prazo apertar, corta-se o apoio de baixo para cima, nunca o núcleo nem a segurança.
- O roteiro de demo do kickoff continua como alvo para 17/11, mas com a ressalva acima.

## Alternativas descartadas

- **Construir os sete passos com a mesma profundidade:** dilui o núcleo e arrisca não terminar nada bem em três dias.
- **Só o núcleo, sem cascata nem tela do médico:** não permitiria a plateia usar o sistema na apresentação final.
