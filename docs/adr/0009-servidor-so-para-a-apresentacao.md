# ADR 0009: Servidor só para a apresentação: KVM 1 e n8n em modo fila com 1 worker

- **Status:** aceita pelo Victor em 04/11/2026, com o servidor no ar. Ajusta para o protótipo o desenho de infraestrutura do [`docs/02`](../02-arquitetura-e-ferramentas.md), e tira o n8n do adiamento do [ADR 0004](0004-prototipo-adiado.md). A API e os workflows continuam esperando o ok dele.
- **Origem:** dois pedidos do Victor em 04/11/2026: "já quero usar a hostinger e tirar tudo da local" e "vou usar só para apresentar o protótipo. Depois vou parar tudo".

## Contexto

O `docs/02` previa uma KVM 2 sem data para acabar e o editor do n8n protegido por VPN ou lista de IPs. Agora o servidor só precisa durar até a apresentação de 17/11/2026, sem operação real depois. Isso muda a conta: vale o mais simples que aguente a demonstração, sem abrir mão da segurança, porque o servidor fica na internet e vai guardar a chave de serviço do banco.

O Victor criou o servidor com o modelo "n8n (queue mode)" da Hostinger. Antes de mudar qualquer coisa, inspecionamos o que ele instala: n8n, 3 workers, Redis, Postgres 15 e Traefik, com senha e chave escritas no arquivo do Compose, fuso de Berlim, firewall desligado e editor aberto na internet.

## Decisão

1. **KVM 1 no Brasil, por 1 mês.** Escolha do Victor: 1 vCPU, 3,8 GB de memória e 48 GB de disco úteis, por R$ 52,99 no carrinho de 04/11/2026. A KVM 2 sairia R$ 70,99. Com a renovação desligada, a Hostinger cancela e apaga o servidor no fim do ciclo, por volta de 04/12.
2. **Modo fila com 1 worker.** O modelo já veio em modo fila, como o `docs/02` pede, e reinstalar não traz ganho: parado, cada worker gasta cerca de 0,1% de CPU. Com 1 worker, sobram de 2,3 a 2,6 GB de memória.
3. **Postgres 17, não o 15 do modelo.** O próprio n8n avisa que o 15 não é suportado e pede o 17 ou mais novo ([tabela oficial](https://docs.n8n.io/hosting/configuration/supported-databases-settings/)). Migramos enquanto o banco só tinha a conta de administrador.
4. **Editor só por túnel SSH.** Nenhuma rota pública leva ao n8n. A plateia não usa o editor, e a API o alcança por dentro do servidor. O túnel dispensa VPN e não depende do IP de quem acessa, o que uma lista de IPs não resolveria em dia de apresentação.
5. **O Compose vai para o repositório, sem segredos e sem IP.** Senha e chaves ficam no `.env` do servidor, só legível pelo root, e as imagens têm versão fixa. Um [teste de contrato](../../services/matching-api/tests/test_contrato_infra.py) barra porta nova, versão solta e segredo escrito no arquivo.
6. **O Victor roda a proteção do sistema.** Login só por chave, firewall com 22, 80 e 443 e 2 GB de swap estão em [`infra/preparar-servidor.sh`](../../infra/preparar-servidor.sh). O Claude Code não altera configurações de segurança do sistema: prepara o script, o Victor executa, e o Claude Code confere de fora.
7. **Fica de fora por simplicidade.** Usuário próprio no lugar do root, porque quem controla o Docker já equivale a root. Fail2ban, porque sem login por senha não há senha a adivinhar. Backups pagos, porque o que importa está no Git e no Supabase.

O `make up` local saiu: a máquina não tem Docker, e o Compose agora descreve o servidor.

## Consequências

- O desenho do `docs/02` (KVM 2, mais workers, VPN ou lista de IPs) continua valendo como roteiro para uma operação real, e não descreve o protótipo.
- Tudo o que está no servidor precisa estar também no Git, porque ele se apaga sozinho.
- O limite real é 1 vCPU com a plateia chamando a API ao mesmo tempo. A [primeira medição](../resultados/metricas-carga-api.md), de 04/11/2026, chegou a cerca de 270 chamadas por segundo nas rotas com login. Ela se repete antes de 13/11, com as telas e os celulares, e decide. Se faltar, a [Hostinger permite subir de plano](https://www.hostinger.com/support/1583229-how-to-upgrade-a-vps-server-at-hostinger/) mantendo arquivos e configurações.
- Abrir o editor exige a chave SSH. Se ela se perder, dá para cadastrar outra no painel da Hostinger.
- Depois de 17/11, quem desliga tudo precisa também revogar os tokens e as chaves. A lista está na [ficha](../../infra/README.md).
