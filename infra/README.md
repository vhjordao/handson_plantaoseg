# Ficha do componente: servidor na Hostinger

- **Responsável:** Victor Jordão · **Frente:** infraestrutura · **Branches:** `f3/servidor-hostinger` e `f3/api-matching` · **Atualizado em:** 04/11/2026
- **Estado:** no ar desde 04/11/2026, com o n8n pronto e **sem nenhum workflow**, e com a [API de matching](../services/matching-api/app/api/README.md) respondendo por HTTPS. **O servidor serve só para a apresentação de 17/11/2026** ([ADR 0009](../docs/adr/0009-servidor-so-para-a-apresentacao.md)).

## 1. O que é e qual dor resolve

É o computador que mantém ligados o n8n e a API, para a plateia usar o sistema pelo celular (**apoio**, [ADR 0002](../docs/adr/0002-escopo-da-poc.md)). Não ataca sozinho nenhuma dor: é onde a cascata de ofertas vai rodar sem depender da máquina de ninguém.

## 2. Como funciona

| Serviço | O que faz | Quem alcança | Memória parada |
| --- | --- | --- | --- |
| Traefik | Recebe o HTTPS e encaminha. A única rota pública é a da API, com limite de requisições e de tamanho do corpo, e sem `/internal` | A internet, nas portas 80 e 443 | 20 MB |
| API de matching | Filtro, ranking, explicação e cascata ([ficha](../services/matching-api/app/api/README.md)) | A internet, só pelo Traefik; as rotas internas, só de dentro | 56 MB |
| n8n | Editor e entrada dos webhooks | Só o próprio servidor; o editor abre por túnel SSH | 329 MB |
| n8n-worker | Executa os workflows que chegam pela fila | Só o próprio servidor | 296 MB |
| Redis | A fila entre o n8n e o worker | Só o próprio servidor | 5 MB |
| Postgres | Banco do n8n, separado do Supabase | Só o próprio servidor | 44 MB |

Valores medidos em 04/11/2026, sem carga. O n8n só orquestra e não decide: o filtro e o ranking ficam na API, e a oferta só sai com o clique do coordenador.

## 3. Como foi feito

1. O Victor criou o servidor no painel da Hostinger, com o modelo "n8n (queue mode)", e cadastrou a chave SSH.
2. Inspecionamos tudo sem mudar nada, com os segredos mascarados, antes de propor qualquer alteração.
3. O arquivo do modelo virou [`docker-compose.yml`](docker-compose.yml): segredos para o `.env`, versões fixas, fuso de São Paulo, 1 worker, nenhuma rota pública para o editor e sem a API insegura do Traefik.
4. Depois da troca, o n8n avisou que não suporta o Postgres 15. Levamos o banco para o 17, com as contagens conferidas antes e depois.
5. Testamos a fila com um workflow temporário, apagado em seguida.
6. O Victor rodou [`preparar-servidor.sh`](preparar-servidor.sh), que fecha o login por senha, liga o firewall e cria a swap, e conferimos o resultado de fora.
7. A API entrou como serviço novo, com a imagem construída aqui, sem porta publicada, e a [carga foi medida](../docs/resultados/metricas-carga-api.md).

## 4. Código-chave

| Arquivo | O que faz | Trecho a entender |
| --- | --- | --- |
| `docker-compose.yml` | Descreve os seis serviços | `name: n8n`: é o que liga o arquivo aos volumes criados pelo modelo |
| `../services/matching-api/Dockerfile` | A imagem da API | `USER` e `--workers 1`: sem root e com um processo só |
| `preparar-servidor.sh` | Protege o sistema | O teste da chave no início: sem ela, fechar a senha deixaria o servidor sem acesso |
| `../services/matching-api/tests/test_contrato_infra.py` | Barra porta nova, versão solta e segredo no arquivo | Roda sem Docker, junto com o `pytest` |

## 5. Ferramentas e versões

| Ferramenta | Versão | Para quê | Por que esta e não outra | Custo |
| --- | --- | --- | --- | --- |
| Hostinger KVM 1 | 1 vCPU, 3,8 GB, 48 GB | Servidor | Escolha do Victor; basta para a apresentação, se o teste de carga confirmar | R$ 52,99 por 1 mês, no carrinho de 04/11/2026 |
| Ubuntu | 24.04.5 | Sistema | Veio com o modelo | Incluso |
| Docker e Compose | 29.9.2 e 5.6.1 | Rodar os serviços | Vieram com o modelo; os mesmos arquivos valem na CI | 0 |
| n8n | 2.46.5 | Orquestração | Decisão do projeto; fixada na versão que veio | 0 |
| Traefik | 3.7.17 | HTTPS | Veio com o modelo; renova o certificado sozinho | 0 |
| Postgres | 17.11 | Banco do n8n | O n8n pede o 17 ou mais novo; o modelo trazia o 15 | 0 |
| Redis | 6.2.24 | Fila | Veio com o modelo; fica só na rede interna | 0 |

## 6. Como rodar e testar

**Para abrir o editor do n8n,** deixe este comando rodando em um terminal e abra `http://localhost:5678`:

```
ssh -N -L 5678:127.0.0.1:5678 -i ~/.ssh/<chave> root@<ip do servidor>
```

**Para publicar uma mudança no Compose,** com o ok do Victor:

```
scp -i ~/.ssh/<chave> infra/docker-compose.yml root@<ip do servidor>:/docker/n8n/
ssh -i ~/.ssh/<chave> root@<ip do servidor> "cd /docker/n8n && docker compose up -d --remove-orphans"
```

**Para publicar a API,** com o ok do Victor. A cópia precisa ser com `core.autocrlf=false`, porque um `Dockerfile` com fim de linha do Windows não constrói. O Compose acha a pasta em `../services/matching-api`, ou seja, em `/docker/services`:

```
git -c core.autocrlf=false archive HEAD services/matching-api | ssh -i ~/.ssh/<chave> root@<ip do servidor> "rm -rf /docker/services/matching-api && tar -x -m -C /docker"
ssh -i ~/.ssh/<chave> root@<ip do servidor> "cd /docker/n8n && docker compose build matching-api && docker compose up -d --no-deps matching-api"
```

Depois de mudar o banco por fora, a API precisa reler os dados: reinicie o serviço ou chame `POST /internal/reload` de dentro do servidor.

O IP, a chave e o `.env` do servidor ficam fora do Git. O `.env` segue os blocos de n8n e da API do [`.env.example`](../.env.example). Para conferir o que está rodando, entre no servidor e use `docker compose ps` e `docker compose logs` em `/docker/n8n`.

**Para voltar atrás:** a cópia do que veio com o modelo está em `/root/backup-modelo-n8n`, no servidor, e o volume do Postgres 15, `n8n_pgdata`, continua lá.

**Depois de 17/11, antes de desligar,** confirme se o professor ainda precisa do sistema no ar. Depois: renovação desligada na Hostinger (Cobrança, Assinaturas), tokens de Supabase e Vercel e chave do Gemini revogados, projeto do Supabase pausado ou apagado e a decisão sobre a página na Vercel. O repositório e as entregas ficam.

## 7. Testes e resultados

Em 04/11/2026, no servidor real:

- **A fila funciona:** um webhook temporário respondeu em 0,14 s, e o log do worker mostra que foi ele quem executou. O workflow e a execução foram apagados, e o banco voltou a ter só a conta de administrador.
- **A conta sobreviveu:** o n8n continua sem pedir a criação do administrador depois da troca do Compose e da migração.
- **Migração:** as contagens de usuários, workflows, execuções, credenciais, projetos, migrações e configurações ficaram iguais, e o aviso de Postgres sumiu.
- **De fora:** das portas 22, 80, 443, 5432, 5678, 6379 e 8080, só 22, 80 e 443 respondem. O endereço público do n8n devolve 404.
- **Túnel:** a tela de login do n8n abriu em `http://localhost:5678`. O login em si é do Victor e não foi testado.
- **Memória:** de 2,3 a 2,6 GB disponíveis de 3,8 GB, parado, conforme a medição. Com 3 workers eram 2,0 GB.
- **Contrato:** os testes de `test_contrato_infra.py` cobrem também a API e a imagem, e a CI valida o Compose e constrói a imagem a cada PR.

Depois de o Victor rodar o script de proteção, no mesmo dia:

- **Login:** sem a chave, o servidor responde `Permission denied (publickey)`, e a senha nem é oferecida. Com a chave, entra.
- **Firewall:** ligado, por IPv4 e IPv6. De 10 portas testadas de fora, só 22, 80 e 443 respondem nos dois.
- **Serviços:** continuam no ar, o worker alcança a internet e HTTP vira HTTPS. Uma chamada na porta 80 falhou, mas as 6 seguintes passaram, e o firewall não registrou bloqueio nessa porta.
- **Swap:** 2 GB, sem uso até agora.

Com a API no ar, no mesmo dia:

- **De fora:** a API responde por HTTPS, com certificado da Let's Encrypt. As rotas internas e a documentação devolvem 404, e a porta 8000 está fechada.
- **Fluxo inteiro:** 33 de 33 conferências, com login real, em `scripts/conferir-api.py`.
- **Carga:** nenhuma chamada falhou. A memória da API chegou a 79 MB de 512 MB, e sobraram pelo menos 2,5 GB livres no servidor, sem uso da swap ([resultado](../docs/resultados/metricas-carga-api.md)).
- **Limite:** com 1.018 chamadas por segundo de um único IP, o Traefik aceitou 33,5 por segundo e recusou as outras com `429`. Um corpo de 70 KB recebe `413`.

## 8. Dados e segurança

- **Dados:** os dados sintéticos do motor ficam só na memória da API, sem nome, CRM, telefone nem valor do plantão. O único dado real é o e-mail do Victor, na conta de administrador do n8n e no certificado HTTPS.
- **Ameaças consideradas:** adivinhar a senha do root, invadir pelo editor do n8n, abrir porta sem querer e publicar um segredo no repositório público.
- **Segredos:** senha do banco, chave de criptografia do n8n, e-mail, **chave de serviço do Supabase** e segredo do n8n ficam no `.env` do servidor, só legível pelo root. A cópia do modelo também. Só a API recebe a chave de serviço, que ignora a RLS: quem controla este servidor lê e grava tudo no banco.
- **Firewall:** o Docker publica portas por fora do `ufw`. Por isso o teste de contrato só aceita 80, 443 e o que estiver em `127.0.0.1`.

## 9. Limitações e honestidade

- **Carga, primeira medição.** Nas rotas com login, a CPU limita em cerca de 270 chamadas por segundo. No fluxo que grava, chegamos a 31,9 por segundo com o servidor em 54%. Foi de uma máquina só, sem pausa e sem o n8n trabalhando ([resultado](../docs/resultados/metricas-carga-api.md)). Repetir antes de 13/11, com as telas e os celulares.
- **Limite por IP.** A plateia no mesmo Wi-Fi pode sair por um único IP e dividir as 30 chamadas por segundo. O valor se ajusta por `API_RATE_AVERAGE` e `API_RATE_BURST`, no `.env`, seguidos de `docker compose up -d --no-deps matching-api`.
- **Chave do Supabase.** O `.env` usa a `service_role`, que o Supabase marca como `legacy`, porque a `sb_secret` ficou em cerca de 50 chamadas por segundo ([ADR 0010](../docs/adr/0010-api-de-matching.md)).
- O servidor ainda não foi reiniciado com esta configuração. O teste fica para antes de 13/11, junto com o de carga.
- O Traefik lê o socket do Docker, como no modelo. Uma falha nele alcançaria o servidor inteiro. Aceito para um servidor de poucos dias.
- Entramos como root. Quem tiver a chave privada controla tudo.
- O Redis segue na versão 6, a que veio com o modelo, porque não fica exposto.
- O worker registra que falta o Python para executar código em Python. Não usamos esse recurso.
- Não há backup além do semanal da Hostinger, que não testamos. O que importa está no Git e no Supabase.
- O local do servidor não foi conferido no painel: a conexão leva de 12 a 17 ms, o que combina com o datacenter do Brasil.

## 10. Uso de IA no desenvolvimento

O Victor decidiu usar a Hostinger, escolheu a KVM 1 e criou o servidor. O Claude Code inspecionou, escreveu os arquivos e esta ficha, aplicou o Compose com o ok dele e preparou o script que ele mesmo roda. A recomendação do Claude Code mudou no caminho, da KVM 2 para aceitar a KVM 1 e do modo fila para o n8n simples, e voltou ao modo fila ao ver o que o servidor já tinha. A migração para o Postgres 17 saiu de um aviso do n8n visto depois da troca, e não estava no plano aprovado.

## 11. Próximos passos

Com o ok do Victor:

1. Criar o workflow da cascata e versioná-lo em `n8n/workflows`.
2. Repetir o teste de carga com as telas e reiniciar o servidor antes de 13/11.
