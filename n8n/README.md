# Ficha do componente: workflow da cascata no n8n

- **Responsável:** Victor Jordão · **Frente:** motor e infraestrutura · **Branch:** `f3/cascata-n8n` · **Atualizado em:** 04/11/2026
- **Estado:** no ar no servidor desde 04/11/2026, com a API avisando e o fluxo conferido de ponta a ponta. **Tudo é simulação.** As decisões estão no [ADR 0013](../docs/adr/0013-aviso-da-api-inicia-a-cascata.md).

## 1. O que é e qual dor resolve

É o que faz a vaga andar sozinha quando o médico não responde: espera o prazo da oferta e pede para a API chamar o próximo aprovado (**apoio**, [ADR 0002](../docs/adr/0002-escopo-da-poc.md)). Ataca a **vaga descoberta**, porque ninguém precisa ficar olhando o relógio. Não escolhe ninguém: filtro, ranking, regras e aprovação ficam na [API](../services/matching-api/app/api/README.md).

## 2. Como funciona

| Nó | O que faz |
| --- | --- |
| Aviso da API | Recebe o ID da vaga, uma vez por vaga, logo depois do clique do coordenador. Pede o segredo no cabeçalho `X-Internal-Secret` |
| Vaga | Guarda só o ID da vaga |
| Pedir para avançar | `POST http://matching-api:8000/internal/cascade/{id}/advance`, com 3 tentativas |
| O que a API decidiu | `aguardar` ou `oferta_enviada`: esperar. `sem_candidatos` ou `nada_a_fazer`: terminar. Outra coisa: erro |
| Esperar o prazo | Dorme até o `expires_at` que a API devolveu, mais 2 segundos, e volta a pedir |
| Fim da cascata | Encerra a execução |
| Ação desconhecida | Faz a execução falhar, à vista no editor |

Recusa e aceite no meio do prazo não precisam de aviso: ao acordar, o n8n recebe o novo prazo ou `nada_a_fazer`. Não há IA neste workflow. Tudo passa por dentro do servidor, e `/webhook` não existe na internet ([ADR 0012](../docs/adr/0012-editor-do-n8n-na-web.md)).

## 3. Como foi feito

1. Li o contrato do `advance` e vi que a resposta já traz o prazo. Por isso o laço só precisa de um aviso para começar.
2. Consultei no próprio n8n do servidor as versões dos nós e as opções do CLI, porque não há n8n local.
3. Escrevi o workflow em JSON, com IDs fixos, e [`publicar.sh`](publicar.sh), que cria a credencial, importa, publica e reinicia o n8n.
4. Publiquei e testei a entrada, e depois o laço, primeiro com um aviso manual e só depois com a API nova.
5. O aviso na API, os testes e o [teste de contrato](../services/matching-api/tests/test_contrato_n8n.py), que amarra o workflow às ações da API e ao Compose.

## 4. Código-chave

| Arquivo | O que faz | Trecho a entender |
| --- | --- | --- |
| `workflows/cascata-de-ofertas.json` | O workflow | `amount` do nó de espera: converte o prazo no fuso de São Paulo, porque a API manda hora local sem fuso |
| `publicar.sh` | Publica no servidor | O segredo vai do `.env` para dentro do contêiner pelo stdin, e o `trap` apaga o arquivo temporário mesmo com erro |
| `../services/matching-api/app/api/notifier.py` | O aviso da API | `cascade_started`: nenhuma falha sobe para quem clicou |
| `../services/matching-api/tests/test_contrato_n8n.py` | Barra o workflow de decidir | `TIPOS_PERMITIDOS` e `test_toda_acao_da_api_tem_destino` |
| `../scripts/conferir-api.py` | Conferência de ponta a ponta | `cascade`: ninguém chama `advance`, e a vaga precisa andar |

## 5. Ferramentas e versões

| Ferramenta | Versão | Para quê | Por que esta e não outra | Custo |
| --- | --- | --- | --- | --- |
| n8n | 2.46.5 | Esperar e chamar a API | Decisão do projeto; a espera persiste no banco e não ocupa o worker | 0 |
| CLI do n8n | 2.46.5 | Importar e publicar | Dispensa a chave da API, que daria controle total | 0 |

## 6. Como rodar e testar

**Para publicar,** com o ok do Victor. Pode repetir: a credencial e o workflow têm ID fixo. O n8n reinicia por cerca de 15 s:

```
git -c core.autocrlf=false archive HEAD n8n | ssh -i ~/.ssh/<chave> root@<ip do servidor> "rm -rf /tmp/n8n-pub && mkdir /tmp/n8n-pub && tar -x -C /tmp/n8n-pub && bash /tmp/n8n-pub/n8n/publicar.sh; status=\$?; rm -rf /tmp/n8n-pub; exit \$status"
```

**Para conferir de ponta a ponta,** o prazo de teste precisa ser curto. O Victor roda o primeiro comando, e a API precisa reler os dados com `POST /internal/reload`, de dentro do servidor:

```
py -3.12 scripts/usuarios-de-teste.py prazo --minutos 2 --env <.env>
python scripts/conferir-api.py cascata --url <url da api> --env-teste <.env.teste> --ssh "<comando ssh>" --dias <dias>
py -3.12 scripts/usuarios-de-teste.py prazo --minutos 60 --env <.env>
```

Cada rodada aceita um plantão no dia `--dias` + 1, então use outro número na seguinte.

**Se o aviso se perdeu,** de dentro do servidor. Repetir é seguro:

```
cd /docker/n8n && S=$(grep '^N8N_WEBHOOK_SECRET=' .env | cut -d= -f2-) && printf 'X-Internal-Secret: %s\n' "$S" | curl -s -X POST -H @- -H 'Content-Type: application/json' -d '{"shift_id":"<id da vaga>"}' http://127.0.0.1:5678/webhook/cascata-ofertas
```

**Para ver o que aconteceu,** abra as execuções do workflow no editor. O log da API mostra as vagas cujo aviso falhou: `docker compose logs matching-api`, em `/docker/n8n`.

## 7. Testes e resultados

**Na máquina local e na CI:** o contrato do workflow em `test_contrato_n8n.py` e o aviso em `test_api_aviso_n8n.py`. Eles não sobem o n8n: o comportamento dele só se confere no servidor.

**No servidor real, em 04/11/2026 (simulação), com a organização de teste:**

- **Entrada:** de fora, `/webhook/cascata-ofertas` devolve o `404` do Traefik. Por dentro, sem segredo ou com o segredo errado, `403`.
- **Rede e credencial:** com o segredo certo e uma vaga inexistente, o n8n chamou a API, recebeu `vaga_nao_encontrada` e a execução terminou em erro depois das 3 tentativas. Nada foi gravado.
- **O começo do laço (9 de 9), com aviso manual e prazo de 60 min:** o n8n dormiu até 2 s depois do prazo que a API deu, no fuso certo. Uma hora depois, ele acordou sozinho, recebeu `nada_a_fazer` e a execução terminou bem.
- **De ponta a ponta (19 de 19), com a API nova avisando e prazo de 2 min:**
  - **Ninguém responde:** sem ninguém chamar `advance`, a oferta passou ao segundo médico 3 s depois do prazo. A primeira ficou vencida, a segunda venceu também, e a vaga ficou descoberta. A trilha conta `offer_sent`, `offer_expired`, `offer_sent`, `offer_expired` e `shift_uncovered`, na ordem.
  - **Recusa e aceite no meio do prazo:** o próximo foi chamado na hora e a vaga fechou. Ao acordar, o n8n encerrou o laço sem nova oferta.
  - **Reinício:** o n8n e o worker foram reiniciados no meio da espera, voltaram em 12 s, e as duas execuções seguiram sem perder o horário.
- **Falhas do aviso:** nenhuma no log da API nessas rodadas.

## 8. Dados e segurança

- **Dados:** só o ID pseudônimo da vaga e a resposta do `advance`, que traz IDs pseudônimos e horários. Nome, CRM e telefone não passam por aqui. As execuções ficam no Postgres do n8n, e não no Supabase.
- **Segredo:** a credencial guarda `N8N_WEBHOOK_SECRET`, cifrada pelo n8n. Ela nasce do `.env` do servidor, e nunca fica no Git. O workflow só cita o ID dela.
- **Ameaças consideradas:** disparar a cascata de fora (o webhook não existe na internet e pede o segredo), e entrar no editor e usar o segredo. Nesse caso, sem o clique do coordenador, `advance` responde `409` e nenhuma oferta nasce. O segredo também não aprova, e um teste cobre isso.
- **Sem chave da API do n8n:** nenhuma foi criada, e `/api` não existe na internet ([ADR 0012](../docs/adr/0012-editor-do-n8n-na-web.md)).

## 9. Limitações e honestidade

- **Se o n8n estiver fora na hora do clique, a vaga não anda sozinha.** O aviso tenta 3 vezes em cerca de 4 s e desiste, e o reinício do n8n leva 12 s. A saída é repetir o aviso, como na seção 6. Esse caminho não foi provocado no servidor: só os testes automáticos cobrem a falha do aviso. Quem já está dormindo não é afetado por um reinício.
- **Poucas vagas ao mesmo tempo.** O teste rodou com 2 execuções dormindo. Muitas vagas juntas não foram medidas; a demonstração guiada usa uma vaga por vez.
- **Sem alerta:** uma execução com erro só aparece no editor, e um aviso perdido, só no log da API.
- **O prazo da rede simulada é de 60 min.** Com esse valor, a cascata não anda durante a apresentação. Na demonstração, o prazo será de 2 minutos ([ADR 0015](../docs/adr/0015-decisoes-que-destravam-o-mvp.md), D6), em `policy_config`.
- **Mudança no editor some na próxima publicação.** O arquivo no Git é a fonte.
- O n8n avisa no log que `WEBHOOK_URL` e `N8N_RUNNERS_ENABLED` estão obsoletas. As duas ainda funcionam na 2.46.5, que está fixa.

## 10. Uso de IA no desenvolvimento

O Victor decidiu que a API avisa o n8n, entre as duas opções que o Claude Code apresentou, e pediu o workflow. O Claude Code leu o contrato, escreveu o workflow, os scripts, os testes e os documentos e publicou no servidor. A proposta de construir sem a chave da API do n8n partiu de uma pergunta do Victor sobre ela.

## 11. Próximos passos

Com o ok do Victor:

1. Pôr o prazo de 2 minutos na organização da demonstração (decidido em 06/11, passo 2.7 do [roteiro](../docs/roteiro-ate-o-mvp.md)).
2. As telas do coordenador e do médico, que disparam o clique e mostram a oferta.
