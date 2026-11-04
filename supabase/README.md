# Ficha do componente: banco no Supabase

- **Responsável:** Victor Jordão · **Frente:** banco e segurança · **Branch:** `f3/banco-supabase` · **Atualizado em:** 03/11/2026
- **Estado:** migrações aplicadas no projeto `plantaoseguro` em 03/11/2026. As tabelas ainda estão vazias: a carga dos dados sintéticos é o próximo passo. **Tudo é simulação.**

## 1. O que é e qual dor resolve

É a fonte da verdade do protótipo (**apoio**, [ADR 0002](../docs/adr/0002-escopo-da-poc.md)). Ataca a **seleção opaca**, porque guarda cada recomendação com o motivo e a versão do modelo numa trilha que não pode ser alterada, e isola o que cada hospital e cada médico enxerga.

## 2. Como funciona

O navegador só lê, sob RLS. A API escreve, com a chave de serviço. As decisões estão no [ADR 0008](../docs/adr/0008-banco-no-supabase.md).

| Quem | O que enxerga |
| --- | --- |
| Coordenador | Vagas, pedidos, ofertas, recomendações, exclusões, explicações e trilha da própria organização, e o cadastro só de quem foi recomendado ou chamado para essas vagas |
| Administrador | O mesmo do coordenador, mais a política de jornada da organização e o registro de modelos |
| Médico | O próprio cadastro, a própria disponibilidade e as próprias ofertas, com a vaga, o hospital e o motivo. Só vê a recomendação depois de receber a oferta |
| Login sem perfil | Nada |
| Sem login | Nada |
| Chave de serviço | Tudo, por isso fica só no servidor. Mesmo assim, não altera a trilha |

**Ninguém no navegador lê:** o valor do plantão, telefone, residência, gênero, faixa etária, zona de residência, o gabarito do simulador e o rótulo do modelo.

## 3. Como foi feito

1. Base gerada com a CLI: `npx supabase@3.0.0 init` e `migration new`.
2. As tabelas saíram do [dicionário de dados](../docs/dados/dicionario-de-dados.md), e as regras de qualidade da seção 7 viraram restrições.
3. Antes de criar cada restrição, medimos nos CSVs se ela valia. Só o limite de 500 caracteres no texto da vaga caiu: o ataque `oversize` chega a 3.314, então o limite ficou em 5.000.
4. Trilha de auditoria com os mesmos princípios de `app/audit.py`.
5. Permissões e políticas, depois de ler o aviso do Supabase de que tabelas novas não são mais expostas automaticamente.
6. Testes em pgTAP, um teste de contrato em Python e um job na CI.
7. Aplicação no projeto real, seguida de uma conferência de fora. Os alertas do Supabase apontaram uma função criada pelo painel, e a quarta migração fechou a permissão dela.
8. Carga dos dados sintéticos: `python -m app.cli seed-db` gera um arquivo SQL a partir dos mesmos CSVs da PoC, e a CI o carrega pelo mesmo caminho do projeto real.

## 4. Código-chave

| Arquivo | O que faz | Trecho a entender |
| --- | --- | --- |
| `migrations/*_tabelas_base.sql` | Tipos, tabelas, restrições e índices | `offers`: `accepted` e `y_success` são derivados da resposta |
| `migrations/*_trilha_de_auditoria.sql` | `audit_log`, gatilhos e `verify_audit_chain` | `audit_log_chain`: a trava evita que a cadeia bifurque |
| `migrations/*_acesso_e_rls.sql` | Permissões por coluna, funções de apoio e políticas | `organization_candidate_ids`: define de quem o coordenador abre o cadastro |
| `migrations/*_fecha_funcao_rls_auto_enable.sql` | Fecha a execução de uma função criada pelo painel | Só existe no projeto real: a CI não a vê, daí a condição |
| `tests/*.sql` | Testes em pgTAP | `02_rls_test.sql` descreve o cenário com dois hospitais e quatro médicos |
| `../scripts/carregar-amostra-banco.sql` | Carrega a amostra e desfaz tudo no fim | Prova que os dados gerados cabem nas regras |
| `../services/matching-api/app/seed_db.py` | Gera o arquivo da carga, com as datas deslocadas | `literal`: toda aspa é dobrada, porque os textos adversariais são entrada hostil |
| `../scripts/conferir-carga-banco.sql` | Confere isolamento e tempo de resposta com os 12 meses, e desfaz tudo no fim | Roda como o navegador, sob RLS |
| `../services/matching-api/tests/test_contrato_banco.py` | Compara as listas do SQL com as do código | Roda sem banco, junto com o `pytest` |

## 5. Ferramentas e versões

| Ferramenta | Versão | Para quê | Por que esta e não outra | Custo |
| --- | --- | --- | --- | --- |
| Supabase (Postgres, Auth e RLS) | Postgres 17 | Banco e login | Decisão do plano; região São Paulo | 0 no plano gratuito |
| Supabase CLI | 3.0.0, via `npx` | Migrações, testes e alertas | Fixada para a CI e a máquina usarem a mesma | 0 |
| pgTAP | A do Supabase | Testes dentro do banco | Testa a RLS como o papel real, com o Postgres real | 0 |

## 6. Como rodar e testar

**Sem Docker**, o teste de contrato roda com os demais testes:

```
make test
```

**Com Docker**, sobe o Postgres do Supabase e roda os testes de banco:

```
make db-check
```

A CI roda tudo a cada PR. Para aplicar uma migração nova no projeto real, com o ok do Victor e os valores do `.env` no ambiente do comando:

```
npx supabase@3.0.0 db push --remote=<ref do projeto> --dry-run
npx supabase@3.0.0 db push --remote=<ref do projeto>
```

O `.env` fica em um clone fora do OneDrive.

**Para gerar a carga** em `supabase/seed/dados_sinteticos.sql`, fora do Git, e conferir que as métricas publicadas não mudam:

```
make db-seed
```

Para carregar, com o ok do Victor: `npx supabase@3.0.0 db push --remote=<ref do projeto> --include-seed`. O arquivo recusa um banco que já tenha dados.

**Para quem escreve o código da web:** liste as colunas em cada consulta. `select=*` falha de propósito nas tabelas com coluna restrita.

## 7. Testes e resultados

- **pgTAP:** 100 testes em três arquivos: estrutura e integridade (29), quem enxerga o quê (49) e trilha de auditoria (22).
- **Contrato em Python:** 9 testes comparam as migrações com as colunas de `models.py`, as variáveis do ranking, as ações da trilha e as regras de exclusão.
- **Carga em Python:** 16 testes conferem o deslocamento das datas, a aspa nos textos hostis e a ausência do gabarito, e refazem a avaliação com as datas deslocadas.
- **Métricas:** com as datas deslocadas, a avaliação dos 12 meses bateu com `docs/resultados/metricas-ranking.json`. Nenhuma métrica publicada mudou.
- **Dados:** a amostra e os 12 meses (300 médicos, 2.448 vagas e 7.555 ofertas) couberam em todas as restrições, e `accepted` e `y_success` bateram com o CSV em todas as ofertas. A CI repete a amostra; os 12 meses foram conferidos só na rodada local.
- **Os testes acusam mesmo?** Abrimos 14 buracos de propósito, como expor o valor do plantão, desligar a RLS e permitir escrita pelo navegador. Treze foram acusados de primeira. O outro, dar `UPDATE` na trilha à chave de serviço, não abriu falha real, porque o gatilho continuou barrando, mas revelou um teste que faltava. Com ele, os 14 são acusados.

Essas rodadas locais usaram um Postgres em WebAssembly (PGlite), que imita o Supabase e roda a versão 18. **O resultado que vale é o do job `banco` da CI**, na imagem `17.11.0.011` do Supabase, a mesma versão do projeto real:

- **Migrações:** as três aplicaram em um banco novo.
- **pgTAP:** 100 testes em 3 arquivos, todos aprovados.
- **Amostra:** 40 médicos, 95 vagas e 434 ofertas entraram, e a carga foi desfeita no fim.
- **Alertas do Supabase:** só informativos. Índices sem uso, porque as tabelas estão vazias, e `shift_compensation` sem política, que é de propósito.
- **Lint das funções:** sem erros.

No projeto real, em 03/11/2026, depois de aplicar as quatro migrações:

- **Estrutura:** 15 tabelas, todas com RLS, e 14 políticas. Só `shift_compensation` fica sem política, de propósito.
- **De fora, com a chave pública:** ler as 15 tabelas, gravar uma organização e chamar as duas funções públicas foi recusado com `42501`.
- **Alertas do Supabase:** só informativos.

## 8. Dados e segurança

- **Dados:** só sintéticos. O CRM precisa do prefixo `SIM` e o telefone do DDD fictício `00`, e o banco recusa outro formato.
- **Ameaças consideradas:** um hospital ler outro, escalada de papel pelo navegador, adulteração da trilha, dado pessoal na trilha, oferta sem aprovação, pagamento no ranking e chamada direta às funções internas.
- **Segredos:** a chave de serviço e a senha do banco nunca vão para o Git nem para o navegador. Os padrões de token estão na varredura da CI.
- **Texto da vaga:** `raw_text` é entrada hostil. O banco só o guarda, e a API trata esse texto antes de usá-lo.
- **Função criada pelo painel:** ao criar o projeto com RLS automática, o Supabase cria `public.rls_auto_enable()` com execução aberta a todos, e o gatilho `ensure_rls`, que liga a RLS em tabelas novas. A chamada de fora já falhava, porque é uma função de gatilho, mas a permissão foi fechada. O gatilho continua funcionando, o que foi conferido em uma simulação local.

## 9. Limitações e honestidade

- Os testes em pgTAP rodaram na CI, na mesma versão do projeto, e não no próprio projeto: a CLI pede a confirmação do Victor para isso. No projeto real foram conferidas a estrutura, as permissões e o acesso de fora.
- O histórico termina em 12/11/2026. Até lá, parte dos registros tem data no futuro, como vagas já preenchidas de dias que ainda não chegaram.
- O deslocamento vale só para o banco: os CSVs e os documentos da PoC continuam com as datas originais.
- Apagar os últimos registros da trilha não quebra a cadeia. Falta a cópia externa.
- A proteção depende de a chave de serviço ficar no servidor: quem a tiver lê tudo.
- Os testes de usuário logado usam só Postgres, sem passar pela API nem pelo login real. Pela API, só o acesso sem login foi conferido.
- A conformidade com a LGPD e as resoluções do CFM é um desenho a validar com jurídico.

## 10. Uso de IA no desenvolvimento

O Victor aprovou começar o banco com a lista de itens. O Claude Code escreveu as migrações, os testes e esta ficha e propôs as decisões do ADR 0008, que aguardam a revisão do Victor no PR. O teste dos 14 buracos existe porque tudo passou de primeira, o que pedia desconfiança.

## 11. Próximos passos

Com o ok do Victor:

1. Carregar os dados sintéticos, sem `doctors_latent` e com as datas deslocadas em semanas inteiras.
2. Criar a API sobre este banco.
