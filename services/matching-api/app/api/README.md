# Ficha do componente: API de matching

- **Responsável:** Victor Jordão · **Frente:** motor e infraestrutura · **Branch:** `f3/api-matching` · **Atualizado em:** 04/11/2026
- **Estado:** no ar no servidor, por HTTPS, desde 04/11/2026, com os dados sintéticos do projeto `plantaoseguro`. **Tudo é simulação.** A cascata no n8n e as telas ainda não usam a API.

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
| `POST /shifts/{id}/approve` | Coordenador | **O clique.** Grava a decisão e chama o primeiro aprovado | Trilha e primeira oferta |
| `POST /shifts/{id}/reject` | Coordenador | Recusa a lista e cancela a vaga | Vaga e trilha |
| `POST /offers/{id}/respond` | O médico da oferta | Tela 4: aceita, ou recusa e chama o próximo | Oferta, vaga e trilha |
| `POST /internal/cascade/{id}/advance` | n8n, por dentro do servidor | Se o prazo venceu, expira e chama o próximo aprovado | Oferta, vaga e trilha |
| `POST /internal/reload` | Quem está no servidor | Relê os dados depois de mudança feita por fora | Nada |

Na resposta, a API só usa IDs pseudônimos: a web lê nome e CRM sob RLS, e só de quem o coordenador pode ver. As horas vão em hora local de São Paulo, sem fuso. Os erros têm a forma `{"erro": "codigo", "mensagem": "..."}`, para a tela tratar pelo código.

**Onde há IA:** o LLM só extrai campos e reescreve a explicação. Sem a chave do Gemini, como hoje, tudo sai pela reserva em regras e pelo texto fixo. Filtro, ranking, cascata e aprovação são código, e o n8n só pede para avançar.

## 3. Como foi feito

1. Li o motor e medi: cerca de 5 ms por recomendação, com 300 médicos, na máquina local. Isso decidiu rodar em memória.
2. Migração com as ações de oferta na trilha e, em `pipeline.recommend`, um parâmetro para a trilha usar o ID da vaga publicada.
3. `rest.py` e `repository.py`: o cliente recusa `select=*` e a tabela do valor do plantão, e as listas de colunas são o contrato do que a API lê.
4. `auth.py`, `service.py`, `routes.py` e `main.py`, reaproveitando `pipeline.recommend`, `pipeline.approve`, `evaluate_candidate`, `extract` e a mesma interface de `AuditLog`.
5. Testes com um banco falso que recusa coluna inexistente nas migrações e aplica as restrições de que o fluxo depende.
6. Abrimos 22 falhas de propósito (ver a seção 7).
7. Antes de escrever no banco real, comparamos a leitura real com os CSVs, só lendo.
8. Compose, imagem e implantação. Depois, o fluxo inteiro no servidor e a medição de carga.

## 4. Código-chave

| Arquivo | O que faz | Trecho a entender |
| --- | --- | --- |
| `service.py` | Os casos de uso e a cascata | `_advance`: sem a aprovação na trilha, para. `_send_next`: refaz as regras antes de chamar |
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
| Python (imagem) | 3.12.14-slim | Base da imagem | A mesma linha da CI, com versão fixa | 0 |

As decisões e as alternativas estão no [ADR 0010](../../../../docs/adr/0010-api-de-matching.md).

## 6. Como rodar e testar

```
cd services/matching-api
pip install -r requirements-dev.txt
python -m pytest -q
python -m ruff check .
```

Sem Docker: os testes usam o banco falso. Para subir localmente, com `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `N8N_WEBHOOK_SECRET` no ambiente, use `make api`. A implantação e a medição de carga estão na [ficha do servidor](../../../../infra/README.md).

**Para trocar o modelo:** `python -m app.cli evaluate`, depois `python -m app.cli freeze-model`, nova linha ativa em `model_registry` e nova imagem.

**Para conferir no servidor,** com os logins de teste criados pelo Victor em `scripts/usuarios-de-teste.py`:

```
python scripts/conferir-api.py verificar --url <url da api> --env-teste <.env.teste> --ssh "<comando ssh>"
python scripts/conferir-api.py medir --url <url da api> --env-teste <.env.teste> --saida <arquivo.json>
```

## 7. Testes e resultados

@@TESTES@@

## 8. Dados e segurança

- **Dados:** só sintéticos. A API nem carrega nome, CRM, telefone, gênero, faixa etária, zona, valor do plantão, rótulos e gabarito. Da residência, usa só as coordenadas, para calcular o raio, e elas não saem na resposta.
- **Segredos:** a chave de serviço e `N8N_WEBHOOK_SECRET` ficam só no `.env` do servidor, com permissão 600. Só a API recebe a chave de serviço. Os erros não trazem detalhe do banco, e o 422 não devolve o que foi enviado.
- **Ameaças consideradas:** token forjado (`alg: none`, troca de algoritmo, outra audiência, outro emissor), token inventado em massa, oferta sem aprovação, hospital agindo em vaga de outro, médico respondendo por outro, injeção pelo texto ou pelo corpo da chamada, pagamento no ranking, chamada às rotas internas pela internet e abuso da plateia.
- **Limites:** requisições por IP e tamanho do corpo no Traefik, memória de 512 MB, sistema de arquivos só de leitura, sem privilégios extras e sem porta publicada. O login só vale com perfil.
- **LGPD e resoluções do CFM:** desenho a validar com jurídico.

## 9. Limitações e honestidade

@@LIMITES@@

## 10. Uso de IA no desenvolvimento

O Victor aprovou o plano, com as decisões e os riscos, antes de começar, e criou os logins de teste com um comando preparado, porque o Claude Code não cria contas. O Claude Code escreveu o código, os testes e os documentos e fez a implantação. Correções que o próprio processo encontrou: o log do `httpx` registrava cada chamada ao banco com a URL inteira; o antivírus da máquina intercepta o HTTPS e quebrava o `httpx` local; uma vaga sem elegíveis duplicaria as exclusões ao repetir o clique; a organização sem política virava erro 500; e o teste que abria um buraco para o HS256 mostrou que a biblioteca já recusava, então o teste passou a fixar a lista de algoritmos.

## 11. Próximos passos

Com o ok do Victor:

1. `f3/cascata-n8n`: o workflow que espera o prazo e chama `POST /internal/cascade/{id}/advance`. Falta decidir como o n8n fica sabendo que uma oferta saiu.
2. `f3/web-coordenador` e `f3/web-medico`: as telas chamam esta API e leem o resto sob RLS.
3. Gemini real: instalar o SDK na imagem, pôr a chave no `.env` do servidor e rodar o [teste manual](../../../../docs/teste-manual-gemini.md).
4. Repetir a medição antes de 13/11, já com as telas, e reiniciar o servidor.
