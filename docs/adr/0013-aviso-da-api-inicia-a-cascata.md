# ADR 0013: A API avisa o n8n uma vez por vaga, e o n8n pergunta à API quanto esperar

- **Status:** escolhida pelo Victor em 04/11/2026 ("API avisa o n8n"). Na `main` e no servidor desde o PR #18.
- **Atualização de 06/11/2026:** na demonstração, o prazo de cada oferta será de 2 minutos ([ADR 0015](0015-decisoes-que-destravam-o-mvp.md), D6).
- **Origem:** item `f3/cascata-n8n` do [plano da Etapa 3](../plano-etapa-3.md). A [ficha da API](../../services/matching-api/app/api/README.md) deixou em aberto como o n8n fica sabendo que uma oferta saiu.

## Contexto

A API já tem a regra da cascata: `POST /internal/cascade/{id}/advance` expira a oferta vencida e chama o próximo aprovado, ou responde `aguardar`, com o prazo da oferta em curso. Falta quem chame essa rota quando o prazo acaba. O plano põe isso no n8n, que "só espera e chama a API; não decide". Sem ele, a oferta vencida fica pendente até alguém pedir.

O n8n precisa saber quando começar, e só a API sabe disso. A rota `/webhook` do n8n fica fora da internet ([ADR 0012](0012-editor-do-n8n-na-web.md)), e a chave de serviço do banco fica só na API ([ADR 0010](0010-api-de-matching.md)).

## Decisão

1. **Um aviso por vaga, no clique do coordenador.** Se a aprovação gerou uma oferta, a API manda só o ID da vaga para `http://n8n:5678/webhook/cascata-ofertas`, por dentro do servidor, com o segredo `N8N_WEBHOOK_SECRET` no cabeçalho `X-Internal-Secret`. O mesmo segredo vale nas duas direções, como o `.env.example` já previa. Publicar, recomendar, rejeitar, responder e avançar não avisam.
2. **O aviso não atrapalha o clique.** Ele sai depois da resposta, com 3 tentativas e 3 s de limite em cada uma. A aprovação já está gravada nessa hora, então uma falha fica no log e nunca volta para o coordenador.
3. **O laço fica no n8n, e a verdade fica na API.** O workflow pede para avançar, espera até o `expires_at` que a API devolveu, mais 2 segundos, e repete até `sem_candidatos` ou `nada_a_fazer`. Ele não guarda quem foi chamado nem quanto falta. Recusa e aceite no meio do prazo se resolvem sozinhos: ao acordar, o n8n recebe o novo prazo ou `nada_a_fazer`.
4. **O n8n não decide.** O workflow só tem nós de receber, esperar, perguntar e encaminhar. Um [teste de contrato](../../services/matching-api/tests/test_contrato_n8n.py) barra nó de código, de LLM ou de banco, chamada a outro endereço e ação da API sem destino no workflow.
5. **Construção sem chave da API do n8n.** O workflow é um arquivo JSON em `n8n/workflows/`, no Git. [`n8n/publicar.sh`](../../n8n/publicar.sh) roda no servidor, importa e publica pelo CLI do n8n, e cria a credencial lendo o segredo do `.env` de lá, sem que ele passe pelo chat, pela linha de comando ou pelo Git. Uma chave da API daria controle total do n8n a quem a tivesse, e nada aqui precisa dela.
6. **O Git manda.** Mudança feita no editor some na próxima publicação. Para mudar o workflow, muda-se o arquivo, com PR.

## Consequências

- **Se o n8n estiver fora na hora do clique, aquela vaga não anda sozinha.** O médico ainda pode responder, e a recusa chama o próximo, mas o prazo vencido não avança. A [ficha](../../n8n/README.md) tem o comando que repete o aviso.
- Cada vaga em cascata é uma execução dormindo no banco do n8n, que não ocupa o worker e sobrevive a um reinício, como vimos no servidor em 04/11/2026. Para a apresentação, são poucas.
- Repetir o aviso é seguro. Duas execuções da mesma vaga só fariam duas perguntas à API, e a trava por vaga dela garante uma oferta só por prazo vencido.
- Quem entrar no editor pode usar o segredo interno. Mesmo assim, ele não aprova: sem o clique do coordenador, `advance` responde `409` e nenhuma oferta nasce, e um teste cobre isso.
- O prazo vem de `offer_ttl_minutes`, que é de 60 minutos na rede simulada. Para a plateia ver a cascata andar, é preciso decidir um prazo curto no ensaio.
- O workflow precisa estar publicado. Sem ele, o webhook responde `404`, o aviso conta como falha e o log da API mostra a vaga.

## Alternativas descartadas

- **O n8n consultar a API de tempos em tempos:** recupera sozinho depois de uma queda do n8n, o que é uma vantagem real. Mas pede uma rota nova, gera uma execução a cada ciclo em um servidor de 1 vCPU, e o atraso passa a ser o intervalo da consulta. Se o n8n cair com frequência no ensaio, é a primeira coisa a rever.
- **Um aviso a cada oferta:** deixaria o laço mais curto, mas a API teria de avisar também na recusa e no vencimento, e um aviso perdido pararia a vaga no meio.
- **Gatilho do banco (Database Webhook do Supabase):** o chamador fica na nuvem, e seria preciso abrir `/webhook` na internet, o que o ADR 0012 evita.
- **Agendador dentro da API:** dispensaria o n8n, mas o plano aprovado e o fluxo automatizado da entrega estão nele, e a API roda com um processo só, sem nada que sobreviva a um reinício.
- **Chave da API do n8n:** seria mais rápido para iterar, mas é controle total em mais um segredo, e o CLI resolve.
