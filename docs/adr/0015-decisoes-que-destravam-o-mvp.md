# ADR 0015: As onze decisões que destravam o MVP

- **Status:** aceitas pelo Victor em 06/11/2026: "Aceito todas as recomendações e faça toda a fase 1." Fecham a fase 1 do [roteiro até o MVP](../roteiro-ate-o-mvp.md).
- **Origem:** a seção 6 do roteiro, montada em 05/11 e revista em 06/11, quando a apresentação passou a ser uma demonstração guiada e as entrevistas foram canceladas.

## Contexto

As partes do produto existem, mas ainda não conversam. A web roda só no navegador, no modo de demonstração. A API está no servidor, mas não tem algumas rotas que a tela já usa. A contestação existe só no desenho, e a cascata não aparece em nenhuma tela. O contrato da API, o banco e a entrada no sistema real dependiam de escolhas que eram do Victor. Construir antes delas seria refazer.

A apresentação de 17/11 é guiada: o Victor conduz sozinho, como coordenador e como médico, e a plateia assiste. Os dados são todos sintéticos.

## Decisão

| # | O que se decidiu | O que muda |
| --- | --- | --- |
| D1 | **Logins com e-mail e senha só para a demonstração:** um coordenador e três médicos da rede simulada, recomendados pela vaga do roteiro. O `scripts/usuarios-de-teste.py` os cria, e as senhas aparecem só no terminal do Victor | Sem login anônimo e sem mudança de segurança no Supabase. A sessão por persona continua só no modo de demonstração ([ADR 0014](0014-estrutura-da-plataforma-web.md), divergência 16) |
| D2 | **A API aceita a justificativa da exceção** e a grava na trilha, junto da aprovação | Hoje a tela exige a justificativa, mas a API a recusa |
| D3 | **Pular, desfazer o pulo e "Esta explicação ajudou?" ganham rotas próprias,** que registram na trilha | A rota de rejeitar recusa a lista inteira e cancela a vaga, e não serve para isso |
| D4 | **Recusa com um dos quatro motivos que a API já aceita** (distância, cansaço, agenda ou outro), sem texto livre | Texto livre pode trazer dado pessoal e não tem onde ficar |
| D5 | **Aceite e recusa não se desfazem;** a tela pede confirmação antes | A API não tem essa volta, e a confirmação evita o toque sem querer |
| D6 | **Prazo de 2 minutos por oferta** na organização da demonstração | Com os 60 minutos de hoje, a cascata não anda durante a apresentação. O valor fica em `policy_config` ([ADR 0013](0013-aviso-da-api-inicia-a-cascata.md)) |
| D7 | **As telas consultam o sistema a cada 3 segundos** | Sem Realtime no MVP: é mais simples e aguenta queda de conexão |
| D8 | **Contestação com tabela própria, RLS e rotas na API,** com `contestation_opened` e `contestation_answered` na trilha | Era o diferencial que o professor destacou, e só existia no desenho |
| D9 | **A equidade mostra as medidas da simulação, rotuladas, mais a contagem das ofertas feitas no sistema** | Não há dado real, e um número sem rótulo seria falso |
| D10 | **A urgência passa a ser exigida na tela,** que pergunta quando falta | A API e o banco já a exigem |
| D11 | **A base sintética fica como está,** e o cenário calibrado com dados públicos aparece ao lado, no documento e na equidade | Trocar a base refaria o banco, os dados da web e todos os números publicados. Gênero e idade não entram na ordem sugerida, e no cenário calibrado a redução de tempo contra o manual vai de 57% para 55% ([teste de premissas](../resultados/metricas-robustez.md)) |

## Consequências

- **A fase 2 do roteiro pode começar:** D2, D3 e D8 viram rotas e tabelas, D6 vira o prazo da organização da demonstração e D1 vira o comando que cria os logins.
- **Quem cria os logins é o Victor,** com o comando preparado. O Claude Code não cria contas nem vê as senhas. As senhas ficam fora do Git, e os logins saem depois da apresentação (`usuarios-de-teste.py remover`).
- **Em escala hospitalar, a consulta é o primeiro limite** (nota de 11/11, [medição](../resultados/metricas-escala.md)): as telas passaram a guardar o que não muda, e a notificação em vez de consulta (Realtime) é o passo seguinte em produção.
- **Consultar a cada 3 segundos** é pouca carga com uma pessoa só conduzindo: duas janelas abertas fazem menos de uma consulta por segundo. A tela mostra o que mudou em até 3 segundos, e não na hora.
- **A contestação passa a mexer no banco:** tabela nova, RLS e teste, pelo mesmo caminho das migrações do [ADR 0008](0008-banco-no-supabase.md).
- **O gerador continua com os dois erros que a fonte pública mostrou** (mulheres na pediatria e médicos com 55 anos ou mais). Eles ficam declarados, com o cenário calibrado ao lado. Trocar a base só depois da Entrega 3, se houver tempo.

## Alternativas descartadas

- **Login anônimo com persona sorteada (D1):** pedia ligar o login anônimo e mexer na segurança do Supabase, e só fazia sentido com a plateia usando o sistema.
- **Link mágico por e-mail (D1):** depende de entrega de e-mail ao vivo, e o plano gratuito limita o envio.
- **Realtime do Supabase (D7):** atualiza na hora, mas o banco ainda não publica nada em tempo real, e uma queda de conexão no palco seria mais difícil de recuperar.
- **Texto livre na recusa (D4)** e **desfazer a resposta (D5):** risco de dado pessoal e uma volta que a API não tem.
- **Prazo de 1 minuto ou de 5 minutos (D6):** 1 minuto apertaria a fala; 5 minutos deixariam a plateia esperando.
- **Corrigir a base agora (D11):** custo alto e efeito pequeno a uma semana da apresentação.
