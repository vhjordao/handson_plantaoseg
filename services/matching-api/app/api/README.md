# Ficha do componente: API de matching

- **Responsável:** Victor Jordão · **Frente:** motor e infraestrutura · **Branch:** `f3/api-matching` · **Atualizado em:** 04/11/2026
- **Estado:** no ar no servidor, por HTTPS, desde 04/11/2026, com os dados sintéticos do projeto `plantaoseguro`. **Tudo é simulação.** A [cascata no n8n](../../../../n8n/README.md) pergunta a ela quanto esperar. As telas ainda não usam a API.

## 1. O que é e qual dor resolve

É a porta HTTP do motor: a web e o n8n chamam a API, e ela roda o filtro, o ranking e a explicação que já existiam na linha de comando (**núcleo**, [ADR 0002](../../../../docs/adr/0002-escopo-da-poc.md)). Ataca a **vaga descoberta** (candidatos em segundos), a **seleção opaca** (motivo e regra gravados) e a **fadiga sem controle** (jornada refeita antes de cada oferta). E é o que garante, em código, que **sem o clique do coordenador não sai oferta**, porque toda escrita passa por aqui ([ADR 0008](../../../../docs/adr/0008-banco-no-supabase.md)).

## 2. Como funciona

| Rota | Quem chama | O que faz | Grava |
| --- | --- | --- | --- |
| `GET /health` | Qualquer um | Diz que está no ar e a versão do modelo | Nada |
| `GET /me` | Quem tem login | Devolve o papel e a organização, lidos de `profiles` | Nada |
| `POST /shifts/extract` | Coordenador | Tela 1: texto vira campos, com os sinais de texto suspeito | Nada |
| `POST /shifts` | Coordenador | Publica a vaga com os campos conferidos | Pedido, vaga e trilha |
| `POST /shifts/{id}/recommendations` | Coordenador | Telas 2 e 3: top 5 com motivo e excluídos com a regra | Recomendações, explicações, exclusões e trilha. **Nenhuma oferta** |
| `POST /shifts/{id}/approve` | Coordenador | **O clique.** Grava a decisão, chama o primeiro aprovado e, depois da resposta, avisa o n8n ([ADR 0013](../../../../docs/adr/0013-aviso-da-api-inicia-a-cascata.md)) | Trilha e primeira oferta |
| `POST /shifts/{id}/reject` | Coordenador | Recusa a lista e cancela a vaga | Vaga e trilha |
| `POST /offers/{id}/respond` | O médico da oferta | Tela 4: aceita, ou recusa e chama o próximo | Oferta, vaga e trilha |
| `POST /internal/cascade/{id}/advance` | n8n, por dentro do servidor | Se o prazo venceu, expira e chama o próximo aprovado | Oferta, vaga e trilha |
| `POST /internal/reload` | Quem está no servidor | Relê os dados depois de mudança feita por fora | Nada |

Na resposta, a API só usa IDs pseudônimos: a web lê nome e CRM sob RLS, e só de quem o coordenador pode ver. As horas vão em hora local de São Paulo, sem fuso. Os erros têm a forma `{"erro": "codigo", "mensagem": "..."}`, para a tela tratar pelo código.

**Onde há IA:** o LLM só extrai campos e reescreve a explicação. Sem a chave do Gemini, tudo sai pela reserva em regras e pelo texto fixo. Com a chave, o Gemini lê o pedido; os motivos continuam no texto fixo, salvo `LLM_REESCREVER_MOTIVOS=1`. Se ele falhar ou passar de 6 s, a leitura sai pelas regras, e as próximas chamadas não tentam por 60 s. Filtro, ranking, cascata e aprovação são código, e o n8n só pede para avançar.

## 3. Como foi feito

1. Li o motor e medi: cerca de 5 ms por recomendação, com 300 médicos, na máquina local. Isso decidiu rodar em memória.
2. Migração com as ações de oferta na trilha e, em `pipeline.recommend`, um parâmetro para a trilha usar o ID da vaga publicada.
3. `rest.py` e `repository.py`: o cliente recusa `select=*` e a tabela do valor do plantão, e as listas de colunas são o contrato do que a API lê.
4. `auth.py`, `service.py`, `routes.py` e `main.py`, reaproveitando `pipeline.recommend`, `pipeline.approve`, `evaluate_candidate`, `extract` e a mesma interface de `AuditLog`.
5. Testes com um banco falso que recusa coluna inexistente nas migrações e aplica as restrições de que o fluxo depende.
6. Abrimos 22 falhas de propósito (ver a seção 7).
7. Antes de escrever no banco real, comparamos a leitura real com os CSVs, só lendo.
8. Compose, imagem e implantação. Depois, o fluxo inteiro no servidor e a medição de carga.
9. A primeira medição travou em 50 chamadas por segundo com a CPU folgada. Testamos o Supabase direto, achamos o teto na chave `sb_secret`, trocamos pela `service_role` e medimos de novo: cerca de 270 por segundo, agora limitadas pela CPU.

## 4. Código-chave

| Arquivo | O que faz | Trecho a entender |
| --- | --- | --- |
| `service.py` | Os casos de uso e a cascata | `_advance`: sem a aprovação na trilha, para. `_send_next`: refaz as regras antes de chamar |
| `notifier.py` | Avisa o n8n de que a cascata começou | `cascade_started`: 3 tentativas, e nenhuma falha sobe para quem clicou |
| `routes.py` | Autenticação, papel e formato | `current_profile`: o JWT prova quem é, e o papel vem do banco |
| `repository.py` | Lê e grava no Supabase | `READ_COLUMNS`: o contrato do que a API lê. `doctor_from_row`: os campos pessoais ficam vazios |
| `rest.py` | Cliente da API REST | `column_list` e `guard_table`: as duas travas antes de a chamada sair da máquina |
| `auth.py` | Valida o JWT | `ALGORITHMS` e `JwksKeys.key_for`: só ES256, e no máximo 1 releitura de chaves por minuto |
| `world.py` | Os dados do motor em memória | `engine`: a política da organização, com as variáveis recalculadas se algo mudou |
| `model_store.py` | Pesos do modelo | `check_against_registry`: a API não sobe se o arquivo e o banco divergirem |
| `schemas.py` | Contrato em Pydantic | `extra="forbid"`: campo a mais é recusado |
| `../ranking/modelo_ativo.json` | Os pesos, versionados | Gerado por `python -m app.cli freeze-model` |

## 5. Ferramentas e versões

| Ferramenta | Versão | Para quê | Por que esta e não outra | Custo |
| --- | --- | --- | --- | --- |
| FastAPI e Starlette | 0.156.3 e 1.9.0 | Rotas | Decisão do `docs/02`; Pydantic e dependências prontas. Versão publicada há pelo menos 2 semanas | 0 |
| Pydantic | 2.14.1 | Contrato da entrada e da saída | Campo a mais recusado sem código extra | 0 |
| uvicorn | 0.54.0 | Servidor HTTP | O padrão do FastAPI. Um processo só, com 1 vCPU | 0 |
| httpx | 0.28.1 | Chamadas ao Supabase | Conexões reaproveitadas e transporte falso nos testes | 0 |
| PyJWT e cryptography | 2.15.1 e 50.0.2 | Validar o JWT em ES256 | Lista fechada de algoritmos. O SDK do Supabase traria muito mais do que isso | 0 |
| `google-genai` | 2.32.0 | Chamar o Gemini | SDK oficial; a chamada `generateContent` fica por não guardar o texto no servidor ([ADR 0003](../../../../docs/adr/0003-llm-do-produto-gemini.md)). Importado só quando há chave | 0: camada gratuita, sem faturamento |
| Python (imagem) | 3.12.14-slim | Base da imagem | A mesma linha da CI, com versão fixa | 0 |

As decisões e as alternativas estão no [ADR 0010](../../../../docs/adr/0010-api-de-matching.md).

## 6. Como rodar e testar

```
cd services/matching-api
pip install -r requirements-dev.txt
python -m pytest -q
python -m ruff check .
```

Sem Docker: os testes usam o banco falso. Para subir localmente, com `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `N8N_WEBHOOK_SECRET` no ambiente, use `make api`. Sem `N8N_CASCADE_URL`, a API sobe e só não avisa o n8n. A implantação e a medição de carga estão na [ficha do servidor](../../../../infra/README.md).

**Para trocar o modelo:** `python -m app.cli evaluate`, depois `python -m app.cli freeze-model`, nova linha ativa em `model_registry` e nova imagem.

**Para conferir no servidor,** com os logins de teste criados pelo Victor em `scripts/usuarios-de-teste.py`:

```
python scripts/conferir-api.py verificar --url <url da api> --env-teste <.env.teste> --ssh "<comando ssh>"
python scripts/conferir-api.py medir --url <url da api> --env-teste <.env.teste> --saida <arquivo.json>
```

## 7. Testes e resultados

**Na máquina local e na CI:**

- **458 testes** no total, contra 267 antes da API. Cobrem rotas e papéis, JWT forjado, cliente REST, paridade com os CSVs, cascata, aviso ao n8n, injeção de prompt pela API (os 10 tipos de ataque), neutralidade econômica no caminho da API e o contrato do Compose, da imagem e do workflow.
- **Sem aprovação não há oferta:** a cascata recusa vaga publicada, recomendada e rejeitada. O segredo do n8n, o médico e o coordenador de outro hospital não aprovam, e não se aprova quem não foi recomendado.
- **Os testes acusam mesmo?** Abrimos 22 falhas de propósito, como oferta sem aprovação, leitura da tabela do valor do plantão, `select=*` liberado e rota interna na internet. Os testes acusaram 21 de primeira. A outra era aceitar HS256, que não abria falha real, porque a biblioteca já recusa esse token com chave EC. Criamos um teste que fixa a lista de algoritmos, e agora as 22 são acusadas.
- **O limite dos testes:** eles usam um banco falso. O PostgREST real e o login real só foram exercitados no projeto, com os passos abaixo.

**No projeto real, em 04/11/2026 (simulação):**

- **Paridade:** montando o `Dataset` pelo repositório, a partir do banco real, comparamos 60 vagas com os CSVs de datas deslocadas. Top 5, scores e exclusões iguais nas 60.
- **De fora, sem login:** 401 em `/me` e 404 em `/docs`, `/openapi.json` e nas rotas internas. HTTP vira HTTPS, o certificado é da Let's Encrypt e a porta 8000 está fechada.
- **Fluxo inteiro, com login (`conferir-api.py verificar`):** 33 de 33 conferências, inclusive a cascata recusando sem aprovação, o isolamento entre organizações, a trilha contando a história na ordem e, pela RLS, o médico vendo só a própria oferta. Repetido com o aviso ao n8n no ar: de novo, 33 de 33.
- **Cascata sem ninguém pedir (`conferir-api.py cascata`):** 19 de 19, com a API avisando o n8n e prazo de teste de 2 min ([ficha do workflow](../../../../n8n/README.md)).
- **Carga com 1 vCPU ([resultado completo](../../../../docs/resultados/metricas-carga-api.md)):**

| Cenário | Vazão | 95% em até | CPU do servidor |
| --- | --- | --- | --- |
| Login e perfil, 10 simultâneas | 290 por segundo | 50 ms | 54% |
| Login e perfil, 40 simultâneas | 275 por segundo | 206 ms | 99% |
| Fluxo completo gravando, 10 simultâneas | 31,9 por segundo (cerca de 6,4 ciclos) | 518 ms | 54% |
| Leitura direta do navegador, 40 simultâneas | 431,5 por segundo | 139 ms | 4% (nem passa pelo servidor) |

Nenhuma chamada falhou na medição, e a memória da API chegou a 79 MB de 512 MB.

## 8. Dados e segurança

- **Dados:** só sintéticos. A API nem carrega nome, CRM, telefone, gênero, faixa etária, zona, valor do plantão, rótulos e gabarito. Da residência, usa só as coordenadas, para calcular o raio, e elas não saem na resposta.
- **Segredos:** a chave de serviço e `N8N_WEBHOOK_SECRET` ficam só no `.env` do servidor, com permissão 600. Só a API recebe a chave de serviço. Os erros não trazem detalhe do banco, e o 422 não devolve o que foi enviado.
- **Ameaças consideradas:** token forjado (`alg: none`, troca de algoritmo, outra audiência, outro emissor), token inventado em massa, oferta sem aprovação, hospital agindo em vaga de outro, médico respondendo por outro, injeção pelo texto ou pelo corpo da chamada, pagamento no ranking, chamada às rotas internas pela internet e abuso da plateia.
- **Limites:** requisições por IP e tamanho do corpo no Traefik, memória de 512 MB, sistema de arquivos só de leitura, sem privilégios extras e sem porta publicada. O login só vale com perfil.
- **LGPD e resoluções do CFM:** desenho a validar com jurídico.

## 9. Limitações e honestidade

- **Sem transação entre as escritas:** se a rede cair no meio de uma aprovação, parte do registro fica gravada, e a vaga pode ficar parada até alguém olhar. A API REST do Supabase não agrupa chamadas ([ADR 0010](../../../../docs/adr/0010-api-de-matching.md)).
- **Um processo só:** as travas por vaga e a cópia dos dados em memória não servem para mais de um processo. Basta para a apresentação, e não para uma operação real.
- **O banco dos testes é falso:** a CI não exercita o PostgREST real nem o login real. Isso foi conferido no projeto, à mão, com `conferir-api.py`.
- **A chave `service_role` é marcada como `legacy`** pelo Supabase. Se ela for desligada antes de 17/11, a saída é trocar pela `sb_secret`, com o teto de cerca de 50 chamadas por segundo que medimos. Não sabemos a causa desse teto.
- **Se o aviso ao n8n se perder, oferta vencida fica pendente** até alguém chamar `advance` ou repetir o aviso, e o médico recebe `oferta_expirada` ao responder. A falha fica só no log ([ficha do workflow](../../../../n8n/README.md)).
- **Gemini instável e em camada gratuita:** na única rodada real, em 05/11, 9 de 16 chamadas ficaram sem resposta, e a demora mediana foi de 8 s ([registro](../../../../docs/teste-manual-gemini.md)). A qualidade e a demora em condições normais não foram medidas. Só texto sintético pode ir ao modelo, e a cota é limitada: passando dela, a leitura cai nas regras. A API com a chave ainda não foi publicada no servidor.
- **O limite de requisições é por IP:** a plateia no mesmo Wi-Fi divide as 30 chamadas por segundo. As telas precisam tentar de novo depois de um `429`.
- **A carga é uma primeira medição,** de uma máquina só e com poucas conexões. Os limites estão no [resultado](../../../../docs/resultados/metricas-carga-api.md).
- **A organização de teste:** os registros dela ficam para sempre na trilha, que é só de inserção, e ela fica no banco por causa disso. Até o `remover`, os 2 médicos de teste aparecem como excluídos por raio nas recomendações da rede simulada.
- **Aviso de biblioteca:** o `TestClient` do Starlette avisa que o uso do `httpx` será substituído. Só afeta os testes, e a versão está fixa.
- A conformidade com a LGPD e as resoluções do CFM é um desenho a validar com jurídico.

## 10. Uso de IA no desenvolvimento

O Victor aprovou o plano, com as decisões e os riscos, antes de começar, e criou os logins de teste com um comando preparado, porque o Claude Code não cria contas. O Claude Code escreveu o código, os testes e os documentos e fez a implantação. Correções que o próprio processo encontrou: o log do `httpx` registrava cada chamada ao banco com a URL inteira; o antivírus da máquina intercepta o HTTPS e quebrava o `httpx` local; uma vaga sem elegíveis duplicaria as exclusões ao repetir o clique; a organização sem política virava erro 500; e o teste que abria um buraco para o HS256 mostrou que a biblioteca já recusava, então o teste passou a fixar a lista de algoritmos. A hipótese do Claude Code para o teto de 50 por segundo, de que a culpa era do ES256, estava errada: a medição mostrou o token de usuário, também em ES256, sem esse teto.

## 11. Próximos passos

Com o ok do Victor:

1. `f3/web-coordenador` e `f3/web-medico`: as telas chamam esta API e leem o resto sob RLS.
2. Gemini: pôr a chave no `.env` do servidor, publicar a imagem 0.2.0, conferir a memória com `docker stats` (o limite é de 512 MB) e repetir o [teste](../../../../docs/teste-manual-gemini.md) em outro horário.
3. Repetir a medição antes de 13/11, já com as telas, e reiniciar o servidor.
