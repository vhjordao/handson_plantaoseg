# Fixtures e adaptador do modo `demo`

Tudo aqui é **simulação com dados sintéticos**: nada tem validade médica ou legal. O modo `demo` roda no navegador, sem rede, com o relógio fixo em **quinta, 01/10/2026, 9h**.

## De onde vêm os dados

`mundo.json` e `grade.json` são gerados por [`scripts/exportar_fixtures_web.py`](../../../../scripts/exportar_fixtures_web.py), que roda o **pipeline real** de `services/matching-api` sobre os CSV de `data/synthetic/out`: extração, filtro de regras, ranking (regressão logística `logreg-v1`, treinada na hora), explicação e `AuditLog`. Não há LLM: as explicações são o texto que o backend monta por regra. Sem aleatoriedade fora das sementes do projeto, então a saída é idêntica a cada execução.

| Arquivo | Tamanho | O que tem |
| --- | --- | --- |
| `mundo.json` | cerca de 107 KB, entra no pacote | unidades e política; ficha do modelo (pesos reais, o que não é usado, métricas e limites); 2 coordenadores e 12 médicos fictícios; 5 textos de exemplo; as 6 vagas de demonstração (todos os estados) com recomendação, decisões e `reservas` da cascata; a trilha de auditoria real (43 registros, hashes do Python); casos de paridade da extração |
| `grade.json` | cerca de 311 KB, baixado só quando alguém publica uma vaga | a recomendação de cada unidade x especialidade x janela de 12 h (90 entradas) |

Os esquemas (Zod) estão em `schema.ts`; `mundo.ts` valida e carrega os dois arquivos. O adaptador está em [`lib/api/demo`](../api/demo/index.ts); os erros de domínio que ele lança (`ForaDaGradeError` e companhia) são do contrato e ficam em [`lib/api/erros.ts`](../api/erros.ts).

## Como regenerar e conferir

```
make seed                                           # só se data/synthetic/out não existir
py -3.12 scripts/exportar_fixtures_web.py           # grava mundo.json e grade.json
py -3.12 scripts/exportar_fixtures_web.py --check   # regenera em memória e compara; sai com 1 se diferir
```

Regenere sempre que mudar `services/matching-api`, os dados sintéticos, `docs/resultados/metricas-*.json` ou a seção 8 de `docs/solucao-ia.md`. Se o `--check` acusar diferença só no último dígito de um número depois de trocar de sistema operacional, a causa é a biblioteca matemática: regenere.

## A grade

É a recomendação pré-calculada, no mesmo "agora", para toda combinação de **3 unidades x 2 especialidades x janelas de 12 h (7h às 19h e 19h às 7h)**, do dia 01/10 às 19h até 08/10. A chave é `"{unidadeId}|{especialidade}|{início, AAAA-MM-DDTHH:MM:SS}"`. `confirmarVaga` busca por essa chave; fora dela lança `ForaDaGradeError`. As vagas de exemplo coincidem com a entrada correspondente da grade (o script confere).

- A grade completa teria 681 KB. Passando de 600 KB, o script tira `exemplosExcluidos` das entradas da grade e mantém as contagens por regra. As vagas de exemplo do `mundo.json` mantêm os exemplos (até 4 por regra, no máximo 12).
- 30 das 90 entradas não têm **nenhum elegível**: o plantão diurno de segunda a sexta (7h às 19h). O conjunto sintético só tem disponibilidade diurna em fim de semana (ADR 0001). Publicar uma delas cria uma vaga `sem_cobertura`, que não pode ser decidida.

## O que a demonstração faz e não faz

- Faz: ler a vaga (porte fiel da extração por regras e dos guardrails do backend, com `origem` `achei`, `deduzi` ou `nao_achei` por campo), publicar, sugerir, decidir (com justificativa obrigatória para quem tem alerta de jornada; repetir a mesma aprovação devolve a decisão já tomada, sem novo registro), pular e registrar tudo numa trilha encadeada por hash (SHA-256) que se verifica no navegador.
- Não faz: usar o Gemini (a demonstração não chama a API; o Gemini foi testado à parte em 05/11); cascata, ofertas e contestações (`NaoImplementadoError`, fases 4 e 6 do [roteiro](../../../../docs/roteiro-ate-o-mvp.md)); sugestões fora da grade; treinar com o feedback (só registra, fora da trilha); medir a aceitação das sugestões fora da sessão (`pctSugestoesAceitas` conta só o que a pessoa decidiu nesta sessão e é nulo antes disso).
- Pular e desfazer: um nome pulado volta marcado ao recarregar (`obterEstadoDaDecisao`) e não pode ser aprovado. `desfazerPulo` o libera enquanto a vaga espera a decisão e grava `recommendation_restored`, sem apagar o `recommendation_rejected` de antes.
- Rascunho: publicar com `rascunhoId` tira o rascunho da lista (`rascunhosConcluidos`). A vaga continua no estado da sessão, porque é do mundo, e a sessão guardada só é aceita de volta com todas as vagas do mundo presentes.
- A trilha da sessão vive na memória e no `sessionStorage` (`plantao-demo-v1`); não é um registro imutável de verdade. O hash **detecta** uma linha alterada sem que o resto da cadeia seja refeito, mas **não impede forja**: o SHA-256 não tem chave, e quem controla o navegador pode refazer a cadeia inteira. A verificação é local, feita no próprio navegador; imutabilidade de verdade exigiria guardar a cadeia fora dele (o plano do modo `live`).
- Os campos estruturados da trilha só levam pseudônimos: uma chave de dado pessoal (nome, CRM, telefone, e-mail) em `detalhes` é recusada. Os textos livres (justificativa, motivo de pular, comentário do feedback) passam, antes de serem gravados, por um filtro de melhor esforço que tira os nomes da demonstração, CRM, telefone, e-mail e números longos. Ele reduz o risco, não o elimina: o aviso "Não digite dados reais" continua valendo na tela. Esses textos têm no máximo 1.000 caracteres, e o pedido de plantão, 2.000.

## Decisões que valem saber

- **Vaga 4.** O pedido original ("pediatra diurno amanhã") cai numa sexta de dia, janela sem nenhum elegível. O texto virou "à noite", e o "amanhã" ficou.
- **Vaga 5 (rascunho).** O texto não cita hospital; a vaga fica no hospital de quem a escreveu (Hospital Modelo Centro). A leitura marca a unidade como "não achei".
- **Trilha.** O `entity_id` dos registros é o **id da vaga na interface**, não o `shift_key` do pipeline (um hash). A cadeia continua válida porque o hash é calculado com o id novo. O `shift_key` segue em `Recomendacao.chave`.
- **Quem decide.** O contrato não passa a persona nas chamadas. Sem configuração, decide o coordenador da unidade da vaga (Sul não tem; vale a primeira). A interface pode chamar `api.definirCoordenador(personaId)`.
- **`reservas`.** Os candidatos 6 a 8 das vagas 1 e 2 dão um "Por que você" real aos médicos persona fora da lista de 5.

## Uso

```ts
import { criarApiDemo } from "@/lib/api/demo";

const api = criarApiDemo({ storage: window.sessionStorage, latenciaMs: 0 });
const leitura = await api.lerVaga("Preciso de um pediatra para o plantão noturno de sexta, 19h às 7h, Hospital Modelo Centro, urgência alta");
```

`criarApiDemo` devolve `PlantaoApi` mais `reiniciar()`, `avancarRelogio(minutos)` e `definirCoordenador(id)`, para quem conduz a apresentação. Toda resposta é uma cópia.
