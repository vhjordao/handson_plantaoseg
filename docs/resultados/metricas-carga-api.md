# Carga da API de matching com 1 vCPU (primeira medição)

**Simulação:** dados sintéticos e chamadas sem pausa, a partir de uma única máquina. É o pior caso para um usuário e não representa uma plateia real. Medido em 04/11/2026, no servidor da apresentação (KVM 1: 1 vCPU e 3,8 GB), com o n8n, o worker, o Redis e o Postgres ligados e parados, sem nenhum workflow. Números em [`metricas-carga-api.json`](metricas-carga-api.json), e como repetir está na [ficha da API](../../services/matching-api/app/api/README.md).

## O que a medição mudou

**A primeira rodada travou em cerca de 50 chamadas por segundo com a CPU folgada, e o motivo não estava no nosso código.** Testando o Supabase direto, sem a API no caminho, o teto apareceu de novo, mas só com a chave nova (`sb_secret`). Com a chave antiga (`service_role`), o mesmo teste passou de 900 por segundo. Trocamos a chave no servidor e medimos tudo de novo.

| Simultâneas, direto no Supabase | 1 | 5 | 20 | 40 |
| --- | --- | --- | --- | --- |
| Chave `sb_secret` | 20,5/s | 51,2/s | 48,9/s | 51,5/s |
| Chave `service_role` | 39,6/s | 204,1/s | 752,4/s | 922,7/s |

| Cenário | Com `sb_secret` | Com `service_role` |
| --- | --- | --- |
| Login e perfil, com 10 simultâneas | 50,1 por segundo, 95% em até 295 ms | 290,0 por segundo, 95% em até 50 ms |
| Extrair, com 10 simultâneas | 50,4 por segundo, 95% em até 294 ms | 253,6 por segundo, 95% em até 56 ms |
| Fluxo completo, com 10 simultâneas | 6,4 por segundo, 95% em até 2165 ms | 31,9 por segundo, 95% em até 518 ms |

Não sabemos a causa do teto da chave nova. Suspeitamos da verificação em ES256, mas o token de usuário, que também é ES256, chegou a 431 por segundo, o que derruba essa explicação.

## Resultado com a chave `service_role`

Foram 126.803 chamadas, e nenhuma falhou. A memória da API chegou a 79 MB de 512 MB, sobraram pelo menos 2.547 MB livres no servidor e a swap não foi usada.

**Sem login e sem banco (`GET /health`).** Mostra o custo do Traefik e da API, e serve de referência:

| Simultâneas | Chamadas por segundo | Mediana | 95% em até | CPU do servidor | CPU da API | Memória da API |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 108,3 | 9 ms | 10 ms | 13% | 7% | 56 MB |
| 5 | 420,8 | 11 ms | 15 ms | 28% | 18% | 59 MB |
| 10 | 611,9 | 14 ms | 21 ms | 38% | 25% | 56 MB |
| 20 | 970,1 | 19 ms | 31 ms | 61% | 42% | 57 MB |
| 40 | 865,1 | 39 ms | 67 ms | 54% | 36% | 58 MB |

**Login e perfil (`GET /me`).** Valida o JWT e lê `profiles` no Supabase, como toda rota com login:

| Simultâneas | Chamadas por segundo | Mediana | 95% em até | CPU do servidor | CPU da API | Memória da API |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 29,5 | 30 ms | 48 ms | 12% | 7% | 58 MB |
| 5 | 144,5 | 31 ms | 50 ms | 31% | 24% | 59 MB |
| 10 | 290,0 | 32 ms | 50 ms | 54% | 39% | 69 MB |
| 20 | 273,3 | 70 ms | 103 ms | 94% | 76% | 74 MB |
| 40 | 274,9 | 139 ms | 206 ms | 99% | 79% | 79 MB |

**Extrair os campos (`POST /shifts/extract`).** Login, perfil e extração por regras, sem gravar:

| Simultâneas | Chamadas por segundo | Mediana | 95% em até | CPU do servidor | CPU da API | Memória da API |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 28,8 | 33 ms | 42 ms | 12% | 8% | 69 MB |
| 5 | 140,0 | 33 ms | 49 ms | 34% | 26% | 78 MB |
| 10 | 253,6 | 36 ms | 56 ms | 54% | 44% | 65 MB |
| 20 | 267,4 | 72 ms | 106 ms | 90% | 72% | 66 MB |
| 40 | 269,7 | 141 ms | 209 ms | 98% | 73% | 69 MB |

**Fluxo completo, gravando na organização de teste.** Cada ciclo publica uma vaga, recomenda, aprova e recebe duas recusas, ou seja, 5 chamadas:

| Simultâneas | Chamadas por segundo | Mediana | 95% em até | CPU do servidor | CPU da API | Memória da API |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 4,3 | 230 ms | 298 ms | 14% | 11% | 65 MB |
| 3 | 12,8 | 242 ms | 311 ms | 26% | 22% | 65 MB |
| 5 | 19,2 | 258 ms | 373 ms | 40% | 35% | 66 MB |
| 10 | 31,9 | 291 ms | 518 ms | 54% | 50% | 69 MB |

Mediana por etapa:

| Etapa | 1 simultâneas | 3 simultâneas | 5 simultâneas | 10 simultâneas |
| --- | --- | --- | --- | --- |
| Publicar | 104 ms | 116 ms | 120 ms | 140 ms |
| Recomendar | 276 ms | 269 ms | 309 ms | 453 ms |
| Aprovar | 189 ms | 214 ms | 232 ms | 259 ms |
| Responder | 247 ms | 262 ms | 277 ms | 302 ms |

**Leitura direta do navegador.** A web lê do Supabase sob RLS, sem passar pela API nem pelo servidor. A CPU do servidor nem se mexe:

| Simultâneas | Chamadas por segundo | Mediana | 95% em até | CPU do servidor | CPU da API | Memória da API |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 33,4 | 26 ms | 43 ms | 4% | 1% | 69 MB |
| 5 | 167,4 | 27 ms | 40 ms | 4% | 1% | 66 MB |
| 10 | 309,2 | 30 ms | 45 ms | 5% | 2% | 66 MB |
| 20 | 385,0 | 47 ms | 80 ms | 4% | 1% | 65 MB |
| 40 | 431,5 | 86 ms | 139 ms | 4% | 1% | 74 MB |

## Como ler

- **Com as rotas de login, a CPU é o limite, em cerca de 270 chamadas por segundo.** Com 20 ou mais simultâneas, o servidor fica entre 90% e 99%, e o tempo de resposta sobe, sem erro.
- **No fluxo completo, o limite não foi atingido:** com 10 simultâneas, são 31,9 chamadas por segundo, ou cerca de 6,4 ciclos por segundo, com o servidor em 54%. Acima disso, não medimos.
- **A leitura do navegador é a menos preocupante:** 431,5 chamadas por segundo com 40 simultâneas, sem platô. Foi só uma consulta, com um usuário, e no plano gratuito do Supabase.
- **Premissa nossa, sem medição:** se 100 pessoas fizerem uma chamada à API a cada 10 segundos, são 10 por segundo. Isso cabe nas medições acima, com folga. É uma conta, e não um teste com pessoas.

## Limite de requisições

O Traefik limita a 30 chamadas por segundo por IP, com rajada de 60. Com 20 chamadas simultâneas por 15 segundos, em um total de 1.018,1 por segundo, ele aceitou 33,5 por segundo (503 respostas `200`) e recusou 14.786 com `429`. Um corpo de 70 KB recebe `413`.

**Risco:** a plateia no mesmo Wi-Fi pode sair toda por um único IP e dividir as 30 por segundo. Com 100 pessoas, seria 0,3 chamada por segundo para cada uma. Isso cobre o uso normal, mas todo mundo entrando ao mesmo tempo pode receber `429` por alguns segundos, e a tela precisa tentar de novo. O valor se ajusta por `API_RATE_AVERAGE` e `API_RATE_BURST`, no `.env` do servidor.

## O que esta medição não cobre

- **Uma máquina só, com poucas conexões:** cada chamada simultânea mantém a sua conexão. Celulares de verdade abrem conexões novas, e isso custa CPU no Traefik.
- **O gerador tem limites:** o antivírus da máquina inspeciona o HTTPS. Isso pesa nos números mais altos, como os de `/health`. O platô de 270 por segundo não vem daí, porque nele quem está no limite é o servidor.
- **A recomendação medida é a mais leve:** a organização de teste só tem 2 médicos elegíveis, então grava 2 recomendações. A rede simulada grava 5, com mais escritas. O motor avalia os 302 médicos nos dois casos.
- **Sem o n8n trabalhando:** o workflow da cascata ainda não existe, e ele divide a mesma CPU.
- **Sem o Gemini:** não há chave, então nada aqui inclui a demora do LLM. Com ele, a extração e a explicação levam mais tempo.
- **O Supabase é o plano gratuito,** e o resultado pode variar com a hora.

Por isso, a medição precisa ser repetida antes de 13/11, com as telas e os celulares. Por ora, ela não indica necessidade de subir de plano.
