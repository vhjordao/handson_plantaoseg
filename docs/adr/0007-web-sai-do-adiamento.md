# ADR 0007: A interface web sai do adiamento, com uma página provisória na Vercel

- **Status:** aceita pelo Victor em 03/11/2026. Para API, banco, RLS e n8n continua valendo o [ADR 0004](0004-prototipo-adiado.md).
- **Origem:** o Victor criou as contas novas de Supabase e Vercel, pediu para arrumar a Vercel "para ele funcionar" e aprovou criar a primeira página.

## Contexto

O [plano da Etapa 3](../plano-etapa-3.md) coloca a web na Vercel e a API e o n8n em uma VPS. Ao importar o repositório, a Vercel escolheu sozinha o framework Python e a pasta `services/matching-api`. Essa pasta não tem servidor web, então as implantações falharam com "No python entrypoint found", e cada push passou a marcar `Vercel: failure` no GitHub, inclusive na `main`, em um repositório público.

Esse status não vinha do código: os jobs do GitHub Actions continuavam verdes. O motivo era a configuração da Vercel e o fato de `apps/web` ainda estar vazia.

## Decisão

1. **A interface web sai do adiamento** apenas com uma página provisória em `apps/web` ([ficha](../../apps/web/README.md)): diz que o protótipo está em construção e que tudo é simulação, sem dados, login, formulário nem chaves.
2. **O projeto `handson-plantaoseg` da Vercel fica assim:**

   | Item | Valor | Onde está |
   | --- | --- | --- |
   | Framework | Next.js | Configurações do projeto |
   | Pasta raiz | `apps/web` | Configurações do projeto |
   | Ignored Build Step | `git diff HEAD^ HEAD --quiet -- .` | Configurações do projeto |
   | Região das funções | `gru1` (São Paulo), perto do Supabase | `apps/web/vercel.json` |
   | Node | 26 | `engines` em `apps/web/package.json` e CI |
   | Endereço de produção | https://handson-plantaoseg.vercel.app | Publica a `main` |

3. **O acesso às contas é por tokens** com escopo e validade, em um `.env` local, ignorado pelo Git e em um clone fora do OneDrive. Cada comando carrega o arquivo só para si, e os valores nunca vão para o chat. Contas de outros projetos não são usadas.
4. **O resto continua esperando o ok do Victor:** novas telas, API, banco, RLS e n8n, cada um no seu PR. A decisão de manter as regras em Python em vez de funções SQL fica para o ADR do banco.

## Consequências

- Commits que não mexem em `apps/web` deixam de construir, e o GitHub mostra `success` com a mensagem "Canceled by Ignored Build Step". Conferido em 03/11 nos commits `6bb61e6` e `d3c8ff6`, que tinham falhado.
- O comando compara só o último commit com o anterior. Se o último commit de uma branch não mexer em `apps/web`, ela não ganha prévia nova. No merge, a comparação é com a `main`, então a produção é construída. Se a web passar a depender de outra pasta, o comando precisa mudar.
- Cada build ignorado ainda conta na cota de implantações da Vercel. É pouco no ritmo deste projeto, mas vale rever se a cota apertar.
- As prévias de PR pedem login na Vercel, e o endereço de produção é público (proteção padrão). Colegas sem acesso ao time veem a produção, não as prévias.
- A página fica fora dos buscadores (`noindex`), para não parecer um serviço real.

## Alternativas descartadas

- **Pausar todos os builds (Don't build anything):** foi a primeira recomendação, mas só esconderia o erro, e a Vercel continuaria sem publicar nada.
- **Pulo automático de monorepo da Vercel:** exige workspaces de npm, yarn, pnpm ou Bun. Este repositório não tem, e mudanças fora de um workspace contam como globais.
- **`git.deploymentEnabled: false` no `vercel.json`:** desliga a publicação automática, que é justamente o que se quer ter funcionando.
- **Desconectar o GitHub:** perde as prévias por PR, e religar depende do painel.
- **Colocar a API Python na Vercel:** o plano aprovado deixa a API em um servidor ligado o tempo todo, junto do n8n.

Fontes lidas em 03/11/2026: [monorepos](https://vercel.com/docs/monorepos), [Ignored Build Step](https://vercel.com/kb/guide/how-do-i-use-the-ignored-build-step-field-on-vercel), [proteção de implantações](https://vercel.com/docs/deployment-protection) e [regiões](https://vercel.com/docs/functions/configuring-functions/region).
