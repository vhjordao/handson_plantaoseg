# ADR 0016: O modo real passa pela rota do site, e o modo vem da sessão

- **Status:** decidida pelo Claude Code em 06/11/2026, dentro da fase 3 que o Victor autorizou ("Pode seguir"); vale até ele pedir revisão.
- **Origem:** fase 3 do [roteiro até o MVP](../roteiro-ate-o-mvp.md): a web passa a usar a API e o banco, com os logins da demonstração (D1 do [ADR 0015](0015-decisoes-que-destravam-o-mvp.md)).

## Contexto

Até a fase 2, a web só tinha o modo de demonstração, que roda no navegador sem rede. A escolha do modo era fixa na publicação (`NEXT_PUBLIC_DATA_MODE`). Para a demonstração guiada, o Victor precisa entrar no sistema real com o login e, se o servidor cair no meio da fala, seguir no modo de demonstração sem publicar de novo (3.4).

Chamar a API direto do navegador poria o endereço do servidor no JavaScript público, e o projeto mantém o nome e o IP do servidor fora do que é público. Também exigiria liberar a origem da web no CORS da API.

## Decisão

1. **O modo vem da sessão.** O cookie de sessão ganha `modo` (`demo` ou `live`, padrão `demo`). Quem entra por persona usa a demonstração; quem entra com e-mail e senha usa o sistema real. O cookie só guia as rotas: quem confere o login, em toda leitura e escrita, são a API e a RLS.
2. **O navegador só fala com o próprio site.** A rota `/api/sistema/[...caminho]` repassa ao destino de verdade:
   - `api/...` vai à API de matching, só nas rotas da tela, e nunca em `/internal`;
   - `banco/<tabela>` vai ao PostgREST, só leitura e só nas tabelas da lista;
   - `auth/token` vai ao Supabase Auth, só para senha e renovação.
   Os endereços e a chave anônima ficam em variáveis só do servidor (`API_URL`, `SUPABASE_URL` e `SUPABASE_ANON_KEY`). A chave de serviço não existe na web.
3. **O login não usa biblioteca a mais.** O e-mail e a senha vão ao Supabase Auth pela rota. Os tokens ficam no `sessionStorage` da aba e somem quando ela fecha. O token é renovado antes de vencer e uma vez depois de um 401.
4. **O papel não vem do navegador.** Depois do login, uma ação de servidor pergunta à API quem é o dono do token (`/me`) e só então grava o cookie.
5. **Erros viram as classes da tela.** Os códigos da API viram as classes de `erros.ts`. Depois de um 429 a chamada espera e tenta de novo. Sem resposta ou com erro 5xx, a tela mostra o aviso que leva ao modo de demonstração com um clique.

## Consequências

- O endereço do servidor da API continua fora do que é público.
- O CORS da API não precisa mudar.
- A API passa a ver o IP da Vercel, e não o de quem está na tela. O limite de 30 chamadas por segundo por IP passa a valer para a web inteira; numa demonstração guiada, com uma pessoa só, é folga de sobra.
- Cada chamada ganha um salto pelo servidor da Vercel.
- Um XSS na web poderia ler o token da aba, como em qualquer cliente do Supabase. A web não renderiza HTML vindo de fora, e os cabeçalhos de segurança são o passo 8.1 do roteiro.
- O modo real só aparece onde a publicação tiver `NEXT_PUBLIC_SISTEMA_REAL=1` e as três variáveis do servidor. Sem elas, a web segue só com a demonstração, como antes.

## Alternativas descartadas

- **Chamar a API e o Supabase direto do navegador:** é mais simples, mas expõe o endereço do servidor e pede CORS.
- **`@supabase/supabase-js`:** cuidaria dos tokens, mas é mais uma dependência para três chamadas de autenticação e leituras simples.
- **Ações de servidor para cada método:** o login teria de ir num cookie do servidor, que é o desenho certo para produção. Seria uma mudança maior nas telas do que esta fase pede.
