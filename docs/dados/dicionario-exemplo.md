# Dicionário de dados: exemplo concreto

> **Simulação.** Os dados são sintéticos. Este arquivo é gerado por `make dicionario`: a última coluna sai dos dados, e um teste acusa se ela ficar desatualizada. O contrato completo, com todas as colunas, está no [dicionário de dados](dicionario-de-dados.md).

**Papel:** `feature` entra no ranking; `rótulo` é o resultado observado; `atributo` descreve o médico ou a vaga e só entra no ranking se virar `feature`; `auditoria` e `restrito-econômico` nunca entram.

| Variável | Onde está | Tipo | Papel | Descrição | Valores possíveis | Nos dados gerados |
| --- | --- | --- | --- | --- | --- | --- |
| `crm_status` | doctors | enum | atributo | Situação do CRM simulado; só `active` é elegível | `active`, `suspended`, `expired` | `active`: 285; `suspended`: 11; `expired`: 4 |
| `specialty` | doctors | enum | atributo | Especialidade principal do médico | `clinica_medica`, `pediatria` | `pediatria`: 152; `clinica_medica`: 148 |
| `max_radius_km` | doctors | numeric | atributo | Raio máximo que o médico aceita se deslocar, em km | Maior que zero; o simulador usa 10, 15, 20 e 30 | `15`: 111; `20`: 91; `10`: 56; `30`: 42 |
| `preferred_period` | doctors | enum | atributo | Período que o médico prefere | `night`, `day`, `weekend`, `any` | `night`: 130; `any`: 67; `weekend`: 59; `day`: 44 |
| `gender` | doctors | enum | auditoria | Só para auditar viés; nunca entra no ranking nem vai ao LLM | `F`, `M` (categorias simplificadas da simulação) | `M`: 156; `F`: 144 |
| `period` | shifts | enum | atributo | Período da vaga, derivado do início | `night` (19h às 7h), `day` (7h às 19h) | `night`: 1.943; `day`: 505 |
| `urgency` | shifts | enum | atributo | Urgência informada para a vaga | `low`, `medium`, `high` | `medium`: 1.137; `high`: 707; `low`: 604 |
| `status` | shifts | enum | atributo | Situação da vaga; o histórico simulado só tem vagas encerradas | `open`, `offered`, `filled`, `uncovered`, `cancelled` | `filled`: 2.330; `uncovered`: 118 |
| `response` | offers | enum | rótulo | Como o médico respondeu à oferta | `accepted`, `declined`, `expired` | `declined`: 3.706; `accepted`: 2.330; `expired`: 1.519 |
| `decline_reason` | offers | enum | atributo | Motivo da recusa; fica vazio quando não houve recusa | `distance`, `fatigue`, `schedule`, `other` | `schedule`: 2.717; `other`: 587; `distance`: 336; `fatigue`: 66 |
| `y_success` | offers | bool | rótulo | **O que o modelo aprende a prever:** aceitou e compareceu | Verdadeiro ou falso | `falso`: 5.318; `verdadeiro`: 2.237 |
| `specialty_match` | variável do ranking | numeric | feature | 1 se a vaga é da especialidade principal; 0,5 se só da secundária | 0,5 ou 1 | `1`: 7.196; `0,5`: 359 |
| `distance_km` | variável do ranking | numeric | feature | Distância em linha reta entre a casa do médico e o hospital, em km | Zero ou mais | De 0,24 a 30,58; mediana 8,82 |
| `availability_overlap_hours` | variável do ranking | numeric | feature | Horas da vaga cobertas pela disponibilidade do médico | De zero à duração da vaga | De 0,00 a 12,00; mediana 6,00 |
| `acceptance_rate_90d` | variável do ranking | numeric | feature | (aceites + 1) / (ofertas com resultado conhecido + 2), nos 90 dias anteriores | De 0 a 1; 0,5 para quem não tem histórico | De 0,05 a 0,86; mediana 0,36 |
| `attendance_rate_90d` | variável do ranking | numeric | feature | (comparecimentos + 1) / (aceites com plantão encerrado + 2), nos 90 dias anteriores | De 0 a 1; 0,5 para quem não tem histórico | De 0,25 a 0,96; mediana 0,75 |
| `hours_since_last_shift` | variável do ranking | numeric | feature | Horas entre o fim do último plantão conhecido e o início da vaga | De 0 a 168 (limite de 7 dias) | De 0 a 168; mediana 168 |
| `night_shift_preference_match` | variável do ranking | numeric | feature | 1 se o período da vaga coincide com a preferência do médico | 0 ou 1 | `1`: 4.988; `0`: 2.567 |
| `amount_brl_sim` | shift_compensation | numeric | restrito-econômico | Valor simulado do plantão, em tabela separada; nunca entra no ranking nem vai ao LLM | Valor em reais | De 1.200 a 2.599; mediana 1.907 |
