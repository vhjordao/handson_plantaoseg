# ADR 0012: Editor do n8n aberto na web, com HTTPS, login e limite de tentativas

- **Status:** pedida pelo Victor em 04/11/2026 ("Abrir na web", e depois "me ajude a poder acessar o n8n na web via login"). Vale quando ele fizer o merge. Revê a decisão 4 do [ADR 0009](0009-servidor-so-para-a-apresentacao.md).
- **Origem:** o Victor tentou abrir o n8n pelo endereço do servidor, não conseguiu e perguntou o que houve.

## Contexto

O [ADR 0009](0009-servidor-so-para-a-apresentacao.md) deixou o editor do n8n só no túnel SSH: a plateia não usa o editor, e a API o alcança por dentro do servidor. A conferência de 04/11/2026 mostrou o n8n no ar e saudável, e o Traefik devolvendo `404 page not found` no endereço público, porque o Compose não tem rota para o editor. Não era uma queda: era a decisão 4, que o Victor não tinha presente. O custo dela apareceu no primeiro uso. Quem não tem a chave SSH na máquina não abre o editor, e o endereço público parece um servidor fora do ar. Entre manter o túnel e abrir na web, o Victor escolheu abrir.

O servidor continua na internet e vai guardar os workflows e as credenciais do n8n, entre elas o segredo que a API pede nas rotas internas ([ADR 0010](0010-api-de-matching.md)). Quem entrar no editor controla tudo isso.

## Decisão

1. **Rota pública para o editor, só em HTTPS.** O nome do servidor vem de `N8N_EDITOR_HOST`, no `.env` do servidor, e não vai para o Git, como a API faz com `API_HOST`. O certificado da Let's Encrypt desse nome já está no armazenamento do Traefik, e o HTTP continua redirecionando para HTTPS.
2. **Só o editor vai à internet.** A rota exclui `/webhook` (inclusive os de teste e de espera), `/form` e `/mcp`, as entradas que o n8n abre sem login, por desenho. A API segue chamando o n8n por dentro do servidor, e `WEBHOOK_URL` continua interna. Abrir uma delas é outra decisão, com o ok do Victor.
3. **Limite de tentativas no login.** O `POST /rest/login` tem rota própria, com prioridade sobre a geral: 5 por minuto por IP de origem, com rajada de 5. Acima disso, o Traefik responde `429`.
4. **O n8n sabe que está atrás de um proxy, em HTTPS.** `N8N_PROTOCOL=https`, `N8N_EDITOR_BASE_URL` com o nome público, `N8N_PROXY_HOPS=1` (o n8n lê o IP real de quem chamou) e o cookie de sessão seguro, que é o padrão do n8n: `N8N_SECURE_COOKIE` deixou de ser `false`. As variáveis foram conferidas dentro da imagem 2.46.5.
5. **O túnel SSH continua como reserva.** A porta segue em `127.0.0.1`, e o teste de contrato continua só aceitando 80, 443 e ela.
6. **A conta é a do administrador que já existe.** A tela de cadastro do dono não aparece (`showSetupOnFirstLoad: false`), então ninguém cria uma conta de administrador pela web. O n8n está sem e-mail (`smtpSetup: false`): senha esquecida só se refaz por comando no servidor. Senha longa e MFA do n8n são do Victor, na tela de configurações dele.

Um [teste de contrato](../../services/matching-api/tests/test_contrato_infra.py) barra a rota sem HTTPS, o nome do servidor escrito no arquivo, a saída de webhook, formulário ou MCP para a internet, o login sem limite e o cookie inseguro.

## Consequências

- **A tela de login do n8n passa a estar na internet.** Qualquer pessoa pode achar o nome, porque o certificado é público nos registros de transparência. O limite de tentativas e a senha longa seguram quem tenta adivinhar; **nada protege de uma falha do n8n antes do login**, além da versão fixa (2.46.5). Vale conferir os avisos de segurança do n8n antes de 17/11.
- O limite do login é por IP de origem: depois da rajada de 5, uma tentativa a cada 12 segundos. Só o Victor entra no editor, então o limite não atrapalha.
- Pelo túnel, o navegador pode recusar o cookie seguro em `http://localhost`. Se recusar, a web é o caminho, e o túnel só serve para abrir a tela de login.
- Voltar atrás é reaplicar o Compose do [ADR 0009](0009-servidor-so-para-a-apresentacao.md): as rotas somem, e nada mais muda.
- A API de matching e o n8n seguem em dois nomes diferentes, cada um com o seu limite.

## Alternativas descartadas

- **Manter só o túnel:** é o mais seguro, mas exige a chave SSH em cada máquina, e o Victor preferiu abrir.
- **Lista de IPs:** não serve em dia de apresentação, pela mesma razão do ADR 0009: o IP de quem apresenta não é conhecido.
- **Senha extra no Traefik (autenticação básica):** é um segundo cadeado de verdade, que cobre também uma falha do n8n antes do login. Fica de fora por simplicidade, porque pede uma segunda senha para guardar e repassar com segurança. É a primeira trava a ligar se o Victor quiser mais proteção.
- **VPN:** peso desproporcional para um servidor de poucos dias.
- **Abrir também os webhooks:** nada pede isso hoje, e é justamente a entrada que o n8n deixa sem login.
