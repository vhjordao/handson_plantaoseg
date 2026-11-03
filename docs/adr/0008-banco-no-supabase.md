# ADR 0008: Banco no Supabase: o navegador só lê e as regras ficam em Python

- **Status:** proposta no PR `f3/banco-supabase`; passa a valer com o merge do Victor. Substitui, para o banco, o [ADR 0004](0004-prototipo-adiado.md).
- **Origem:** o [plano da Etapa 3](../plano-etapa-3.md), item M0, e o ok do Victor para começar o banco em 03/11/2026.

## Contexto

O motor da PoC roda sobre CSVs. O protótipo precisa de um banco que isole os hospitais e mostre a cada pessoa só o que é dela. O [`docs/02`](../02-arquitetura-e-ferramentas.md) previa regras em funções SQL e papel e organização vindos do JWT.

Desde 30/10/2026 o Supabase não expõe mais tabelas novas automaticamente ([aviso oficial](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically)). Cada permissão precisa ser explícita, o que combina com o princípio de conceder só o necessário.

## Decisão

1. **O navegador só lê.** Toda escrita passa pela API, com a chave de serviço, que fica só no servidor. Assim, sem o clique do coordenador na API, não existe oferta.
2. **As regras ficam em Python.** O filtro de elegibilidade e de jornada continua em `app/rules.py`, que já tem testes de casos de borda, em vez de ser reescrito em SQL. O banco garante integridade, e não decide quem é elegível.
3. **Papel e organização vêm de `profiles`, não do JWT.** Uma mudança de papel vale na hora, sem esperar a renovação do token e sem configurar um gancho de autenticação. Quem não tem perfil não enxerga nada, inclusive um login anônimo antes de receber a persona.
4. **Colunas restritas ficam sem permissão.** Dado pessoal, atributo protegido, gabarito e rótulo do modelo seguem nas tabelas do [dicionário](../dados/dicionario-de-dados.md), mas o navegador não pode lê-los. `shift_compensation` não tem nenhuma permissão nem política.
5. **Uma política de leitura por tabela.** As políticas se apoiam em funções do schema `private`, que a API não expõe. Elas rodam com os privilégios do dono para evitar recursão entre políticas, e cada uma só devolve o que pertence ao usuário da sessão.
6. **A trilha é só de inserção, em duas camadas.** A chave de serviço não tem permissão de alterar a tabela, e um gatilho barra `UPDATE`, `DELETE` e `TRUNCATE` até para o dono. Outro gatilho define sequência, data e hash, e recusa dado pessoal em `details`.
7. **`accepted` e `y_success` são derivados da resposta.** Não há como ficarem incoerentes. A resposta ganhou o valor `pending`, para a cascata ao vivo.
8. **Listas fechadas também no banco.** `recommendations.features` e `model_registry.features` só aceitam as sete variáveis do ranking, o que barra pagamento e atributo protegido também aqui. `model_registry.label` só aceita `simulacao`.
9. **O gabarito fica de fora.** `doctors_latent` não vai para o banco.
10. **Medidas em `double precision`.** O motor lê do banco os mesmos números que lê do CSV. Só o valor do plantão usa `numeric`.

A CLI fica fixada na versão 3.0.0, e o banco é testado na CI com o Postgres do Supabase. A máquina local não precisa de Docker.

## Consequências

- A web precisa listar as colunas em cada consulta: `select=*` falha nas tabelas com coluna restrita. É de propósito.
- O médico também não lê a própria residência, o telefone e os atributos de auditoria pelo navegador, porque a permissão de coluna vale para o papel inteiro. Se uma tela precisar disso, a API entrega.
- O coordenador não abre o cadastro de quem foi excluído pelas regras: vê o ID, a regra e o texto, como na tela 3 dos [wireframes](../wireframes/README.md).
- Um novo valor de domínio pede uma migração. É um custo pequeno, e o domínio fica documentado no próprio banco.
- A trilha aceita uma inserção por vez, com uma trava da transação. Basta para o volume da demonstração.
- Apagar os últimos registros da trilha não quebra a cadeia, como já acontece no arquivo da PoC. Falta a cópia externa prevista em [`docs/seguranca-ameacas.md`](../seguranca-ameacas.md).
- O papel `anon` não lê nada. O login anônimo da plateia usa o papel `authenticated`, e o que ele vê depende do perfil criado pela API.

## Alternativas descartadas

- **Regras em funções SQL:** duplicariam o que já está em Python e testado, e criariam duas fontes da verdade.
- **Papel e organização em claims do JWT:** ficam velhos até a renovação do token e exigem um gancho de autenticação.
- **Tabela separada para colunas restritas:** mudaria o contrato do dicionário e o código do motor. A permissão por coluna dá o mesmo resultado sem isso.
- **Permitir escrita do navegador sob RLS:** espalharia regra de negócio em políticas e abriria caminho para criar oferta sem passar pela API.
- **Rodar os testes de banco na máquina local:** exigiria Docker, e o disco está apertado.
