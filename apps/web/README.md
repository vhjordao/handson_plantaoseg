# Ficha do componente: interface web

- **Responsável:** Victor Jordão · **Frente:** interface · **Branch:** `f3/web-base` · **Atualizado em:** 03/11/2026
- **Estado:** página provisória, sem dados, login nem chaves. Novas telas esperam o ok do Victor ([ADR 0007](../../docs/adr/0007-web-sai-do-adiamento.md)).

## 1. O que é e qual dor resolve

É a primeira página pública do PlantãoSeguro. Ainda não resolve nenhuma dor da Entrega 1: é a base das telas do coordenador e do médico (**apoio**, [ADR 0002](../../docs/adr/0002-escopo-da-poc.md)) e avisa a quem abrir o endereço que o protótipo está em construção e que tudo é simulação.

## 2. Como funciona

O Next.js gera o HTML na build, e a Vercel entrega esse arquivo pronto. Não há IA, dados, login, formulário, chaves nem chamada a outro serviço.

O visual imita a parede de um corredor de hospital: verde-claro em cima e barra escura embaixo, com o nome do projeto como uma placa. A fita de obra entre as duas partes é o único enfeite e sai quando o protótipo ficar pronto. No tema escuro, é o mesmo corredor à noite.

## 3. Como foi feito

1. Base gerada com `npx create-next-app@16.4.4 apps/web --ts --tailwind --eslint --app --use-npm --disable-git --no-agents-md --no-agent-feedback --yes`.
2. Saíram os arquivos de exemplo e as opções `cacheComponents` e `partialPrefetching` do modelo, porque ainda não há dados para decidir sobre cache.
3. Foram escritas a página, as cores e o ícone, e a versão do Node ficou fixa em `engines`.
4. O projeto da Vercel passou a apontar para esta pasta ([ADR 0007](../../docs/adr/0007-web-sai-do-adiamento.md)).
5. A CI ganhou o job `web`, com lint, tipos e build.

## 4. Código-chave

| Arquivo | O que faz | Trecho a entender |
| --- | --- | --- |
| `app/page.tsx` | A página | As duas frases principais: "Protótipo em construção" e "Tudo aqui é simulação" |
| `app/globals.css` | Cores dos temas claro e escuro e a fita de obra | Variáveis em `:root`, ligadas ao Tailwind em `@theme inline` |
| `app/layout.tsx` | Idioma, título, fonte e `noindex` | `robots`: uma simulação não deve aparecer em buscas como serviço real |
| `next.config.ts` | Tailwind no Turbopack e sem o cabeçalho `X-Powered-By` | `turbopack.rules`: vem do modelo do Next.js 16.4 |
| `vercel.json` | Região das funções | `gru1`: São Paulo, perto do Supabase |

## 5. Ferramentas e versões

| Ferramenta | Versão | Para quê | Por que esta e não outra | Custo |
| --- | --- | --- | --- | --- |
| Next.js | 16.4.4 | Framework da interface | Escolha do plano; [`docs/02`](../../docs/02-arquitetura-e-ferramentas.md) registra Vite com React como alternativa | 0 |
| React | 19.3.0 | Componentes | Vem com o Next.js | 0 |
| Tailwind CSS | 4.3.4 | Estilos | Previsto no plano; o shadcn/ui só entra com as telas | 0 |
| TypeScript | 5.9.3 | Tipos | Padrão do modelo; encontra erros antes da build | 0 |
| ESLint e `eslint-config-next` | 9.39.5 e 16.4.4 | Lint | Vêm com o modelo do Next.js | 0 |
| Node.js | 26.x | Execução | A mesma versão na máquina, na CI e na Vercel | 0 |
| Atkinson Hyperlegible Next | `next/font` | Única fonte | Criada pelo Braille Institute para facilitar a leitura, o que ajuda quem lê cansado, depois de um plantão. Fica hospedada com o site: o navegador não chama o Google | 0 |
| Vercel | plano gratuito | Publicação e prévia por PR | Previsto no plano; integração direta com o GitHub | 0 |

## 6. Como rodar e testar

Da raiz do repositório, em um clone fora do OneDrive e com Node 26:

```
make web-install  # instala as dependências
make web          # abre em http://localhost:3000
make web-check    # lint, tipos e build
```

A página não precisa de `.env`. O `.env` da raiz guarda só os tokens de acesso às contas, e o Next.js não o lê.

## 7. Testes e resultados

Na máquina local, em 03/11/2026, com instalação limpa (`npm ci`):

- **Lint, tipos e build:** passaram, e a página foi gerada como estática.
- **Conferência visual no navegador:** em desenvolvimento, tema claro em 320, 375 e 1440 px e tema escuro em 800 px. Na build de produção (`next start`), tema claro em 1280 px e tema escuro em 375 px. Sem rolagem horizontal, com foco de teclado visível e a página sem erro no console.
- **Build de produção:** sem o cabeçalho `X-Powered-By` e com `noindex`.
- **Rede:** todas as requisições foram para o próprio site, inclusive a fonte.
- **Contraste calculado (WCAG):** texto de 7,5:1 a 14,1:1; contorno de foco de 4,3:1 a 8,8:1.

Na CI e na Vercel, no primeiro commit desta branch:

- **CI:** o job da web passou em 1m10s, junto com os outros jobs.
- **Prévia na Vercel:** o build terminou em `READY`, na região `gru1`, com `success` no GitHub. Sem login, o endereço da prévia redireciona (HTTP 302). Por isso o Claude Code não abriu a prévia e conferiu a mesma build localmente.

Não há teste automático de tela, porque a página não tem comportamento. O Playwright entra com a jornada do protótipo, como prevê o [plano](../../docs/plano-etapa-3.md). A CI repete lint, tipos e build a cada PR.

## 8. Dados e segurança

- **Dados:** nenhum. A página não tem formulário e não usa variável de ambiente.
- **Publicação:** o endereço de produção é público, e as prévias de PR pedem login na Vercel.
- **Dependências:** `npm audit --omit=dev` não aponta vulnerabilidades no que vai para produção. Há 16 alertas moderados em ferramentas de desenvolvimento, todos na cadeia do ESLint. O conserto automático sugerido voltaria o ESLint para versões muito antigas, então não foi aplicado.
- **Ainda não feito:** cabeçalhos próprios de segurança, como CSP. Entram antes de haver dados ou login.

## 9. Limitações e honestidade

- Esta página não é o protótipo: não mostra recomendação, vaga nem médico.
- Foi conferida em navegador com tamanho de tela emulado, não em celular real.
- A região `gru1` só vale para funções, e a página estática ainda não usa nenhuma.
- O ESLint 9 aparece como descontinuado na instalação; ficou a versão do modelo do Next.js.
- O Next.js não tem as medidas desta fonte para ajustar a reserva, então o texto pode dar um pequeno salto ao carregar.

## 10. Uso de IA no desenvolvimento

O Victor pediu para arrumar a Vercel e criar a primeira página. O Claude Code gerou a base, propôs o texto e o visual, ajustou o projeto da Vercel e conferiu tudo. Uma animação da fita saiu depois da conferência no navegador, porque podia aparecer pela metade. O texto e o visual aguardam a revisão do Victor no PR.

## 11. Próximos passos

Com o ok do Victor: telas 1 a 3 dos [wireframes](../../docs/wireframes/README.md) em `f3/web-coordenador`, com shadcn/ui e o aviso "não digite dados reais". Antes de ligar o Supabase, entram os cabeçalhos de segurança.
