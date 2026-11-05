# ADR 0010: API de matching: pesos em arquivo, banco pela API REST e motor em memória

- **Status:** proposta no PR da branch `f3/api-matching`, com o ok do Victor para construir em 04/11/2026. Vale quando ele fizer o merge. Tira a API do adiamento do [ADR 0004](0004-prototipo-adiado.md).
- **Origem:** item `f3/api-matching` do [plano da Etapa 3](../plano-etapa-3.md).

## Contexto

O motor roda só com a biblioteca padrão, sobre CSVs. A plateia precisa dele por HTTP, com o banco do [ADR 0008](0008-banco-no-supabase.md) e no servidor de 1 vCPU do [ADR 0009](0009-servidor-so-para-a-apresentacao.md), que dura até a apresentação. A tabela `model_registry` guarda a versão, as variáveis e as métricas do modelo, mas não os pesos. E a chave de serviço ignora a RLS, então a própria API precisa se impedir de ler o que não deve.

## Decisão

1. **Os pesos ficam em um arquivo versionado**, `app/ranking/modelo_ativo.json`, gerado por `python -m app.cli freeze-model`. Na subida, a API compara a versão e as variáveis com a única linha ativa de `model_registry` e não sobe se divergirem. A CI treina de novo e confere o arquivo com o resultado (`freeze-model --check`).
2. **O banco é acessado pela API REST do Supabase**, com a chave `service_role`. O servidor não precisa guardar a senha do banco. Usamos a chave antiga, um JWT em HS256, e não a nova `sb_secret`, por uma medição: direto no Supabase, com 40 chamadas simultâneas, a `sb_secret` ficou em 51,5 por segundo e a `service_role` chegou a 922,7. Não sabemos a causa desse teto: o token de usuário, também em ES256, chegou a 431,5.
3. **A API lê só o que o motor usa.** Nome, CRM, telefone, gênero, faixa etária, zona, valor do plantão, gabarito e rótulos não entram na memória. O cliente REST recusa `select=*` e a tabela `shift_compensation` antes de a chamada sair da máquina.
4. **O motor roda em memória.** Os dados carregam na subida, e cada escrita da API os atualiza. Como só a API escreve, a cópia não envelhece. Uma mudança por fora pede `POST /internal/reload`.
5. **A cascata lê a decisão da trilha.** O que o coordenador aprovou, e em que ordem, está em `audit_log`, no registro `recommendation_approved`. Sem esse registro, não existe próxima oferta. As regras são refeitas antes de cada chamada, porque a agenda pode ter mudado.
6. **Um processo só, com uma trava por vaga.** Duas chamadas ao mesmo tempo não recomendam nem aprovam em dobro. As restrições de unicidade de `offers` seguem como segunda barreira.
7. **As rotas internas ficam fora da internet e pedem segredo.** A rota pública do Traefik exclui `/internal`, e o n8n chama por dentro do servidor, com `N8N_WEBHOOK_SECRET`.
8. **O JWT só vale em ES256**, o algoritmo das chaves deste projeto, conferido com a chave pública do Supabase. Um `kid` desconhecido relê as chaves no máximo 1 vez por minuto. O papel e a organização vêm de `profiles`, a cada chamada.
9. **A trilha ganhou 5 ações:** `offer_sent`, `offer_accepted`, `offer_declined`, `offer_expired` e `shift_uncovered`, em uma migração nova.
10. **A imagem é construída no próprio servidor**, com versão fixa, a partir de uma cópia da pasta.

## Consequências

- O núcleo e a CLI continuam sem pacotes de fora, e um teste barra importar FastAPI fora de `app/api/`. O job da PoC na CI roda sem instalar nada.
- Sem transação entre as escritas: se a rede cair no meio de uma aprovação, parte do registro fica gravada. A oferta duplicada o banco recusa, e a vaga pode ficar parada até alguém olhar. Aceito para uma demonstração, e dito na [ficha](../../services/matching-api/app/api/README.md).
- Uma recomendação gera 4 chamadas de escrita ao banco, além das leituras, e o gargalo é a ida ao Supabase, e não o motor nem a CPU ([medição](../resultados/metricas-carga-api.md)).
- A API de gestão do Supabase marca a chave `service_role` como `legacy`. Se o Supabase a desligar antes de 17/11, a API para de subir. A saída é trocar o valor no `.env` do servidor pela chave `sb_secret`, que o cliente também aceita, com o teto medido.
- A API não escala para mais de um processo sem revisar as travas e a cópia em memória. O desenho serve à apresentação, e não a uma operação real.
- Trocar de modelo pede três passos: nova linha ativa no banco, novo arquivo e nova imagem. A API se recusa a subir enquanto os dois não baterem.
- A organização de teste fica para sempre na trilha, que é só de inserção. Ela não aparece para o coordenador da rede simulada.

## Alternativas descartadas

- **Coluna de pesos em `model_registry`:** seria a fonte única, mas pede migração, muda a carga e expõe os pesos ao administrador pelo navegador, sem ganho na demonstração.
- **Treinar na subida:** a versão do modelo dependeria do momento da subida, e a recomendação gravada não teria uma versão confiável.
- **Conexão direta ao Postgres, com `psycopg`:** daria transações, mas pede a senha do banco no servidor e mais um pacote.
- **Função SQL para a aprovação:** daria atomicidade, mas põe regra de negócio no banco, o que o ADR 0008 evita.
- **Consultar o banco a cada recomendação:** cada vaga leria milhares de linhas. O motor gasta poucos milissegundos com os dados em memória.
- **Publicar a imagem em um registro, como o GHCR:** é o certo para uma operação real, mas não se paga em um servidor de poucos dias.
