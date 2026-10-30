# Relatório de qualidade dos dados sintéticos

> Dados **sintéticos**, gerados por `python -m app.cli seed`. Tudo é simulação: nada descreve hospitais ou médicos reais.

Semente: `20261030` · período: 2025-10-01 a 2026-09-30 · teste temporal a partir de 2026-08-01.

## Volume por tabela

| Tabela | Linhas |
| --- | ---: |
| `organizations` | 1 |
| `units` | 3 |
| `doctors` | 300 |
| `doctor_availability` | 3.391 |
| `shifts` | 2.448 |
| `shift_requests` | 400 |
| `offers` | 7.555 |
| `policy_config` | 1 |
| `shift_compensation` | 2.448 |
| `doctors_latent` | 300 |

## Regras de qualidade

| Regra | Resultado | Detalhe |
| --- | --- | --- |
| Integridade referencial: toda chave estrangeira aponta para registro existente | passou | 0 violações |
| Domínios: todo valor enumerado está na lista | passou | 0 violações |
| Datas: fim depois do início, resposta depois do envio, preenchimento depois da vaga | passou | 0 violações |
| Unicidade: crm_sim e pares (vaga, médico) em ofertas | passou | 0 duplicatas |
| Coerência: aceite, comparecimento e rótulo y_success | passou | 0 violações |
| Sobreposição: nenhum médico atende dois plantões ao mesmo tempo | passou | 0 violações |
| Sem dado real: CRM com prefixo SIM, telefone fictício, nomes de lista | passou | 0 achados |
| Cobertura do segmento: duas especialidades e todos os hospitais com vagas | passou | 0 violações |

## Resumo da simulação

| Indicador | Valor |
| --- | ---: |
| Ofertas por vaga | 3,09 |
| Taxa de aceite das ofertas | 30,8% |
| Taxa de sucesso (aceitou e compareceu) | 29,6% |
| Vagas sem cobertura | 4,8% |
| Aceites que violam a jornada (processo manual) | 1,3% |
| Pedidos em texto livre adversariais | 15,0% |
| Mediana de minutos até preencher a vaga (simulado) | 83 |

## Células vazias (esperadas, por desenho)

| Tabela | Coluna | Vazias |
| --- | --- | ---: |
| `doctors` | `secondary_specialty` | 256 |
| `doctor_availability` | `weekday` | 1964 |
| `doctor_availability` | `on_date` | 1427 |
| `doctor_availability` | `valid_to` | 3391 |
| `shifts` | `source_request_id` | 2048 |
| `shifts` | `filled_at` | 118 |
| `shift_requests` | `attack_type` | 340 |
| `offers` | `responded_at` | 1519 |
| `offers` | `decline_reason` | 3849 |
| `offers` | `attended` | 5225 |

## Limites

- Os valores acima descrevem o **simulador**, que reflete premissas do projeto (dicionário de dados, seção 6) e não dados de mercado.
- O tempo até preencher a vaga é simulado e **não** serve de linha de base real.
- A reprodutibilidade (mesma semente, mesmos arquivos) é testada em `tests/test_synthetic.py`.
