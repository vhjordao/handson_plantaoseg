# Roteiro até o MVP

O mapa de tudo o que falta para o PlantãoSeguro funcionar de ponta a ponta, do ponto em que estamos até a apresentação. Não tem datas: as datas ficam no [plano da Etapa 3](plano-etapa-3.md). Aqui fica a ordem, o motivo da ordem e o próximo passo.

**Como usar.** O próximo passo está sempre na seção 1. Cada PR marca o que terminou (`[x]`) e atualiza a seção 1. Uma decisão nova entra na seção 6, e uma mudança de rumo entra no [diário](diario-de-bordo.md).

**A apresentação é uma demonstração guiada** (decisão do Victor em 06/11/2026). Ele conduz sozinho, ao vivo, fazendo o papel do coordenador e o do médico. A plateia assiste e não usa o sistema. Por isso, QR code, persona sorteada, login anônimo, telão ao vivo e carga com muita gente saíram do MVP.

**Sem entrevistas** (decisão do Victor em 06/11/2026). Tudo segue com dados sintéticos, o mais realistas possível: cada premissa do simulador é comparada a uma fonte pública quando ela existe, e declarada como premissa quando não existe, com a análise de sensibilidade mostrando o quanto ela pesa.

## 1. Próximo passo

**Em 06/11 o Victor acrescentou três pedidos:** só login na entrada (3.7), o Gemini ligado no sistema real, sempre em custo zero (3.8), e o frontend revisto por completo, da página inicial às telas de dentro ([trilha F](#trilha-f-o-frontend-por-completo)). A ordem agora:

1. **Victor: enviar a Entrega 3 (07/11).** O documento e o PDF de 12 páginas estão na `main` desde o PR #25 ([E.1 a E.8](#5-trilha-da-entrega-3-em-paralelo)).
2. **Victor: conferir a jornada do coordenador no sistema real (3.6).** Em `/entrar`, "Entrar no sistema real" com `coordenador.demo`: escrever um pedido, conferir os campos, ver as sugestões e aprovar. A vaga precisa aparecer na lista e na trilha. É o "pronto quando" da fase 3, e só ele tem as senhas.
3. **Claude Code: a entrada só com login (3.7) e o Gemini ligado (3.8).** São pequenos e mudam o que se vê ao entrar. O 3.8 começa depois de o Victor confirmar no AI Studio que o projeto da chave continua sem faturamento.
4. **Victor: aprovar a direção visual (F.1).** O Claude Code propõe a direção com a página inicial, a entrada e uma tela de dentro como amostra; o resto do frontend segue a direção aprovada.
5. **Claude Code: a [fase 4](#fase-4-a-tela-do-médico-e-a-cascata-na-tela)** (tela do médico e cascata na tela), já no visual novo (F.6).
6. **Colegas:** o teste de usabilidade da tarefa do coordenador, se o grupo puder fazer ([E.2](#5-trilha-da-entrega-3-em-paralelo)).

## 2. Onde estamos

| Parte | Estado | Onde |
| --- | --- | --- |
| Motor (leitura, regras, ordem, motivos, trilha) | Pronto e testado | [ficha](../services/matching-api/README.md) |
| Banco (tabelas, RLS, trilha só de inserção, dados sintéticos) | No Supabase | [ficha](../supabase/README.md) |
| API de matching, com HTTPS | No servidor, imagem 0.4.0 (fase 2 e o rodízio entre equivalentes da 7.2) | [ficha](../services/matching-api/app/api/README.md) |
| n8n e a cascata de ofertas | No servidor, conferida de ponta a ponta pela API | [ficha](../n8n/README.md) |
| Gemini | Pronto em custo zero, ainda sem a chave no servidor; em 06/11 o Victor decidiu deixá-lo ligado, sempre sem custo (3.8) | [ADR 0003](adr/0003-llm-do-produto-gemini.md) |
| Decisões D1 a D11 | Aprovadas pelo Victor em 06/11 | [ADR 0015](adr/0015-decisoes-que-destravam-o-mvp.md) |
| Web: página inicial, entrada sem senha, lista de vagas, nova vaga, sugestões e decisão | No link público, no modo de demonstração e, com o login da demonstração, no sistema real | [ficha](../apps/web/README.md) |
| Web: médico, auditoria, contestações e equidade | Ainda "em construção" | |
| Documento da Entrega 3 | Na `main` desde 06/11, com PDF de 12 páginas; o envio é do Victor | [documento](04-entrega-3-validacao.md) |

**O que falta, em uma frase:** a jornada do coordenador já passa pela API e pelo banco, mas a tela do médico e a cascata na tela ainda não existem. Por isso, na tela, o médico não recebe oferta e a cascata não aparece.

## 3. O que é o MVP pronto

O MVP está pronto quando, **no link público e com dados sintéticos**, o Victor consegue fazer sozinho, ao vivo, o caminho inteiro:

- [ ] Como coordenador, ele entra, escreve o pedido, confere os campos, vê a ordem sugerida com os motivos e quem ficou de fora, e aprova. Tudo grava no banco e na trilha.
- [ ] Como médico, em outra janela ou no celular, ele recebe a oferta com "Por que você" e aceita ou recusa.
- [ ] Se o médico recusa ou deixa o prazo passar, o n8n chama o próximo sozinho. No aceite, a vaga fecha, e o coordenador vê cada passo na tela da vaga.
- [ ] Como médico, ele contesta uma recomendação. Como coordenador, responde. Tudo fica na trilha.
- [ ] A auditoria mostra a trilha e confere a cadeia de hash. A equidade mostra a concentração das ofertas, rotulada como simulação.
- [ ] Com a chave ligada, o Gemini lê o pedido. Sem ela, ou se ele falhar, as regras leem.
- [ ] Se a API cair, a web oferece o modo de demonstração e a apresentação continua.
- [ ] CI verde, o caminho completo testado no servidor do jeito do roteiro, servidor reiniciado com sucesso e ensaio nos aparelhos da apresentação.
- [ ] As regras de sempre valem: sem o clique do coordenador não sai oferta; o valor do plantão não entra na ordem; nome, CRM e telefone não vão à IA; segredos fora do Git; todo número de simulação rotulado.

## 4. O caminho, em ordem

Cada fase depende da anterior, salvo onde está escrito. Cada passo vira um PR com ficha, diário e CI verde, e só entra com o ok do Victor.

### Fase 1: decisões que destravam

- [x] **1.1** Victor responde às decisões da [seção 6](#6-decisões-que-destravam-o-caminho). *Feito em 06/11: todas aprovadas como recomendadas ([ADR 0015](adr/0015-decisoes-que-destravam-o-mvp.md)).*

**Por que primeiro:** o contrato da API, o banco e a entrada no sistema real dependem delas. Construir antes seria refazer.

### Fase 2: banco e API completam o contrato

A API hoje faz o fluxo principal, mas a tela pede coisas que ela ainda não tem ([ADR 0014](adr/0014-estrutura-da-plataforma-web.md), divergências 3 a 17).

- [x] **2.1** Aprovação com a justificativa da exceção gravada na trilha (D2). *Feito em 06/11.*
- [x] **2.2** Pular e desfazer o pulo, por nome, e o "Esta explicação ajudou?" (D3). *Feito em 06/11, com o estado da decisão para a tela voltar igual.*
- [x] **2.3** *Feito em 06/11.* A leitura devolve, para cada campo, se está no texto ou foi deduzida, e o trecho. As sugestões devolvem a contribuição de cada variável e a evidência de quem ficou de fora.
- [x] **2.4** O coordenador lê a política e a ficha do modelo. *Feito em 06/11.*
- [x] **2.5** *Feito em 06/11.* Contestação: tabela, RLS e rotas para o médico abrir e o coordenador responder, com as ações `contestation_opened` e `contestation_answered` na trilha (D8).
- [x] **2.6** Os logins da demonstração na rede simulada, com e-mail e senha: um coordenador e três médicos que a vaga do roteiro recomenda (D1). O script fica pronto, e quem roda o comando é o Victor. *Script pronto em 06/11 (`usuarios-de-teste.py demonstracao`); falta o Victor rodar. Sem `--medicos`, usa os três primeiros médicos das personas da demonstração; o roteiro (5.2) pode trocar.* *Feito em 06/11: o Victor criou os quatro logins, conferidos no banco sem ler as senhas.*
- [x] **2.7** Prazo de 2 minutos por oferta na organização da demonstração (D6). *Feito em 06/11, por migração: vale quando ela for aplicada no 2.8.*
- [x] **2.8** Publicar no servidor e conferir com `conferir-api.py`. *Feito em 06/11: migrações no banco real e imagem 0.3.0 no servidor; 33 de 33 conferências do `conferir-api.py verificar` passaram, `/health` responde de fora, a rota interna segue fechada, as rotas novas pedem login e a API usa 59 MiB.*

**Pronto quando:** cada rota nova tem teste, a neutralidade continua passando e a ficha da API mostra o contrato novo.

### Fase 3: a web passa a usar a API e o banco

O adaptador `live` liga a web ao sistema real.

- [x] **3.1** Login com e-mail e senha, com os logins da fase 2, na tela de entrada (D1). A entrada por persona continua no modo de demonstração. *Feito em 06/11: "Entrar no sistema real" em `/entrar` ([ADR 0016](adr/0016-modo-real-pela-rota-do-site.md)).*
- [x] **3.2** Leituras sob RLS, direto do banco: vagas, sugestões, ofertas, trilha. Escritas pela API: publicar, aprovar, pular, responder e contestar. *Feito em 06/11 para a jornada do coordenador; ofertas e contestações na tela vêm nas fases 4 e 6.*
- [x] **3.3** Erros da API viram mensagens da tela, e depois de um `429` a tela tenta de novo. *Feito em 06/11.*
- [x] **3.4** Se a API não responder, a tela oferece o modo de demonstração. *Feito em 06/11: um aviso leva ao modo de demonstração com um clique.*
- [x] **3.5** O relógio do cabeçalho vem do sistema, não de um valor fixo. *Feito em 06/11.*
- [ ] **3.6** A jornada do coordenador, que hoje roda na demonstração, passa a rodar no `live`, com a urgência exigida no pedido (D10).
- [ ] **3.7** *Pedido do Victor em 06/11.* A entrada passa a ser só com login: e-mail e senha para o coordenador e para os médicos, e o papel vem do perfil. Saem da entrada as portas por persona e o cartão do telão. O modo de demonstração continua como plano B (3.4 e 5.4), por um link discreto na entrada ("O sistema não responde? Usar o modo de demonstração") e pelo aviso de indisponível. A página inicial e a ajuda passam a apontar para o login.
- [ ] **3.8** *Pedido do Victor em 06/11: "Gemini ligado, mas sempre sem gerar custos".* A chave vai para o `.env` do servidor e fica lá até o fim do projeto (10.1). Antes, o Victor confirma no AI Studio que o projeto continua sem faturamento. A API ganha um teto diário de chamadas, abaixo da cota gratuita; passando dele, a leitura segue pelas regras, sem erro na tela. A reescrita dos motivos continua desligada. Conferir com uma chamada (`--rapido`), a memória com `docker stats` e um pedido de ponta a ponta pela tela.

**Pronto quando:** a mesma jornada do coordenador passa nos dois modos, e uma vaga criada pela web aparece no banco e na trilha. Com o 3.7 e o 3.8: a entrada só aceita login, e o pedido escrito na tela é lido pelo Gemini, ou pelas regras se ele falhar.

### Fase 4: a tela do médico e a cascata na tela

- [ ] **4.1** Ofertas, com plantão, local, horário, distância, prazo e "Por que você".
- [ ] **4.2** Aceitar e recusar, com um dos quatro motivos (distância, cansaço, agenda ou outro) e confirmação antes, porque não se desfaz (D4 e D5).
- [ ] **4.3** Contestar uma recomendação e ver a resposta.
- [ ] **4.4** "Minha conta": o que o sistema usa e não usa sobre o médico, e como pedir revisão humana.
- [ ] **4.5** Na tela da vaga, o coordenador acompanha a cascata: quem recebeu, quem recusou, quem deixou o prazo passar e o tempo que falta (a tela consulta o sistema a cada 3 segundos, D7).

**Pronto quando:** o cenário "o 1º recusa, o 2º deixa passar, o 3º aceita" acontece de verdade, com o n8n, e aparece nas duas telas.

### Fase 5: a demonstração guiada

- [ ] **5.1** O roteiro: qual pedido digitar, quais médicos aprovar e em que ordem, quem recusa, quem deixa passar e quem aceita, e o que mostrar em cada tela.
- [ ] **5.2** O estado de partida: a vaga do roteiro recomenda os médicos que têm login, e o banco começa limpo de testes anteriores. Com o rodízio ([ADR 0017](adr/0017-rodizio-entre-equivalentes-na-api.md)), as recomendações dos ensaios na mesma semana mudam a ordem: rodar o `limpar-demonstracao` antes do dia zera essa contagem.
- [ ] **5.3** As janelas: coordenador e médico lado a lado, ou o médico no celular, com a tela do celular projetada.
- [ ] **5.4** O que fazer se algo falhar no meio: em que momento trocar para o modo de demonstração, que faz o mesmo caminho sem o servidor.

**Pronto quando:** o Victor percorre o roteiro inteiro, sozinho, sem consultar ninguém.

### Fase 6: auditoria, contestações e equidade

- [ ] **6.1** Auditoria: tabela da trilha, filtro por vaga, exportação CSV e verificação da cadeia no navegador.
- [ ] **6.2** Contestações: a caixa do coordenador, com a resposta registrada.
- [ ] **6.3** Equidade: concentração das ofertas e disparidade, com "medidas em dados sintéticos", mais a contagem das ofertas feitas no sistema e o cenário calibrado com dados públicos ao lado (D9 e D11).

### Fase 7: concentração das ofertas

Esta fase **não depende das anteriores** e pode começar já.

- [x] **7.1** Experimento com rodízio entre elegíveis equivalentes e limite de ofertas, medindo o custo em tempo até preencher e na chance de sucesso. *Feito em 06/11 ([experimento](resultados/metricas-concentracao.md)): o rodízio com margem de 10 pontos é o recomendado; a exclusão por zona continua aberta.*
- [x] **7.2** A política escolhida vai para a API, com teste, e aparece na equidade. *Feito em 06/11 ([ADR 0017](adr/0017-rodizio-entre-equivalentes-na-api.md)): a API ordena com o rodízio de 10 pontos, a trilha registra quem mudou de lugar, `GET /policy` traz a margem e a janela, e a tela do coordenador diz por que um nome mudou de lugar. O painel da equidade (6.3) mostra a política ao lado da concentração. No servidor desde 06/11, com a imagem 0.4.0 (33 de 33 conferências).*

**Por que importa:** os 10% mais recomendados ocupam 50,7% do top-5, contra 31,1% no processo manual (simulação). É o maior risco ético medido. Com o rodízio de 10 pontos, os 10% mais expostos passam de 82,1% para 35,7% das ofertas e de 50,7% para 28,5% dos lugares do top-5, com 1,8 ponto a menos de chance de sucesso e 2 minutos a mais por vaga.

### Trilha F: o frontend por completo

*Pedido do Victor em 06/11: "melhorar o frontend por completo, desde a landing page até as páginas de dentro do produto".* Anda junto das fases 4 e 6: as telas novas já nascem no visual novo, e as que existem são refeitas por cima. Não muda regra nem dado: a decisão humana, os rótulos de simulação, a acessibilidade e o modo de demonstração continuam.

- [ ] **F.1** Direção visual: o Claude Code propõe paleta, tipografia, componentes e o tom da marca, com a página inicial, a entrada e uma tela de dentro como amostra. O Victor aprova ou pede ajuste. Ele pode mandar referências e o que mais o incomoda hoje.
- [ ] **F.2** A base: cores e espaços como variáveis, tipografia, componentes e as cascas do coordenador e do médico, nos temas claro e escuro.
- [ ] **F.3** A página inicial e a ajuda, contando o produto como a apresentação conta.
- [ ] **F.4** A entrada só com login (junto do 3.7).
- [ ] **F.5** As telas do coordenador: lista de vagas, nova vaga, sugestões e decisão.
- [ ] **F.6** As telas do médico (junto da fase 4).
- [ ] **F.7** Auditoria, contestações e equidade (junto da fase 6).
- [ ] **F.8** Celular, teclado, leitor de tela e Lighthouse em todas as telas (junto do 8.6).

**Pronto quando:** todas as telas seguem a direção aprovada, nos dois temas e no celular, e os testes de jornada e de acessibilidade continuam passando.

### Fase 8: pronto para o palco

- [ ] **8.1** Cabeçalhos de segurança na web e no Traefik, e o endereço do site no Supabase (`site_url`).
- [ ] **8.2** MFA no n8n e a renovação do servidor desligada (Victor).
- [ ] **8.3** O caminho completo testado no servidor, do jeito do roteiro, inclusive a cascata com o prazo curto.
- [ ] **8.4** Reiniciar o servidor e conferir que tudo volta sozinho.
- [ ] **8.5** Gemini no ensaio: a chave já está no servidor desde o 3.8; conferir uma chamada, o teto do dia e a memória com `docker stats` ([passo a passo](../infra/README.md)), e o que fazer se ele cair (a leitura segue pelas regras).
- [ ] **8.6** Acessibilidade e Lighthouse nas telas novas, e ensaio nos aparelhos da apresentação.
- [ ] **8.7** Plano B: vídeo gravado do roteiro inteiro e o modo de demonstração pronto para trocar.
- [ ] **8.8** Limpar os dados de teste do banco (Victor roda `usuarios-de-teste.py limpar`).
- [ ] **8.9** Congelar o código: depois disso, só correção.

### Fase 9: ensaio e apresentação

- [ ] **9.1** Ensaio completo com o roteiro da aula de storytelling, cronometrado, com o plano B testado.
- [ ] **9.2** Apresentação.

### Fase 10: depois da apresentação

- [ ] **10.1** Tirar a chave do Gemini do servidor e apagá-la no AI Studio.
- [ ] **10.2** Remover os logins e os dados de teste (`usuarios-de-teste.py remover`).
- [ ] **10.3** Parar o servidor e cancelar a assinatura ([ADR 0009](adr/0009-servidor-so-para-a-apresentacao.md)).
- [ ] **10.4** Revogar os tokens de Supabase e Vercel usados pelo Claude Code.

## 5. Trilha da Entrega 3 (em paralelo)

O documento acadêmico anda junto com o produto e usa o que ele mede.

- [x] **E.1** *Feito em 06/11 ([premissas contra fontes públicas](resultados/premissas-comportamento.md)).* Realismo sem entrevistas: buscar números publicados sobre o comportamento dos plantonistas (aceite e recusa de convites, tempo até preencher, antecedência, distância aceita, carga de plantões) e compará-los às premissas do simulador, como a [comparação com dados públicos](resultados/metricas-robustez.md#comparação-com-dados-públicos) já faz para a composição. Onde não houver fonte, a premissa fica declarada e a análise de sensibilidade mostra o quanto ela pesa. O [kit de entrevistas](entrevistas/LEIAME.md) fica para um piloto futuro.
- [ ] **E.2** Teste de usabilidade da tarefa do coordenador ([roteiro](ux/teste-de-usabilidade.md)), se o grupo puder fazer. Se não, uma avaliação pelas diretrizes de interação humano-IA, com a limitação dita no documento. As tarefas do médico ficam para depois da fase 4.
- [x] **E.3** Resultado do experimento da concentração (7.1). *No documento em 06/11.*
- [ ] **E.4** Comparar a regressão logística com o LightGBM, como a Etapa 2 prometeu.
- [ ] **E.5** Previsão de vagas, se sobrar tempo: um baseline com resultado honesto, mesmo abaixo da meta.
- [x] **E.6** *Feito em 06/11.* Corrigir o documento: a tela do coordenador já existe, a do médico não; o domínio público já tem a plataforma; o Gemini foi testado; o teste de usabilidade cobre só o coordenador; a apresentação é guiada, sem a plateia usando o sistema; não houve entrevistas.
- [x] **E.7** *Feito em 06/11, com a referência pública do plantão e a taxa de vagas descobertas da referência acadêmica.* Caso de negócio e critérios de sucesso com números de fontes públicas e da simulação, sempre em faixas e com o rótulo de simulação.
- [x] **E.8** Gerar o PDF, atualizar a rastreabilidade (A4-1 a A4-11) e abrir o PR, com o ok do Victor. *Feito em 06/11: PDF de 12 páginas e rastreabilidade na `main` (PR #25).*
- [ ] **E.9** Aplicar o retorno da aula de storytelling e preparar os slides e o pitch com o grupo.

## 6. Decisões que destravam o caminho

**Aprovadas pelo Victor em 06/11/2026, todas como recomendadas** ("Aceito todas as recomendações"). O registro, com as alternativas descartadas, está no [ADR 0015](adr/0015-decisoes-que-destravam-o-mvp.md). A recomendação era a escolha mais simples que cumpre as regras do projeto.

| # | Decisão | O que ficou decidido | Por quê |
| --- | --- | --- | --- |
| D1 | Como o Victor entra no sistema real | Logins com e-mail e senha na rede simulada: um coordenador e três médicos que a vaga do roteiro recomenda. O script dos logins de teste cria, e as senhas aparecem só no terminal dele | Sem login anônimo e sem mudança de segurança no Supabase. Os logins de teste atuais pertencem a outra organização e não veem os 300 médicos |
| D2 | Justificativa da exceção | A API aceita a justificativa e a grava na trilha, junto da aprovação | Hoje a tela exige a justificativa, mas a API a recusa |
| D3 | Pular e "Esta explicação ajudou?" | Rotas novas, que registram na trilha | Hoje existem só no modo de demonstração. A outra rota da API recusa a lista inteira e cancela a vaga |
| D4 | Motivo da recusa | Os quatro motivos que a API já aceita, sem texto livre | Texto livre pode trazer dado pessoal e não tem onde ficar |
| D5 | Desfazer o aceite ou a recusa | Não desfazer; a tela pede confirmação antes | A API não tem essa volta, e a confirmação evita o toque sem querer |
| D6 | Prazo da oferta na demonstração | 2 minutos | Com 60, a cascata não anda durante a apresentação |
| D7 | Como as telas se atualizam | Consultar a cada 3 segundos | É mais simples e aguenta queda de conexão. O banco ainda não publica nada em tempo real |
| D8 | Contestação | Tabela própria, com RLS, e rotas na API | Hoje ela só existe no desenho. É o que o professor destacou como diferencial |
| D9 | O que a equidade mostra | As medidas da simulação, rotuladas, mais a contagem das ofertas feitas no sistema | Dados reais não existem, e um número sem rótulo seria falso |
| D10 | Urgência | A tela passa a exigir, perguntando quando falta | A API e o banco a exigem, e a tela já pergunta pelos outros campos |
| D11 | Corrigir no gerador o que a fonte pública já mostrou errado: há mais mulheres na pediatria (76,8%, e não 50%) e mais médicos com 55 anos ou mais (26,8%, e não 15%) | Manter a base atual e mostrar o cenário "calibrado com dados públicos" ao lado, no documento e na equidade. Trocar a base só depois da Entrega 3, se houver tempo | Trocar a base refaz a carga do banco, as fixtures da web e todos os números já publicados. Gênero e idade não entram na ordem sugerida, só na auditoria de equidade, e o cenário calibrado já mostra o efeito: a redução contra o manual vai de 57% para 55% |

## 7. O que só o Victor faz

- Criar os logins da demonstração (D1) e guardar as senhas fora do Git, num gerenciador de senhas: `py -3.12 scripts/usuarios-de-teste.py demonstracao --env C:\dev\handson_plantaoseg\.env`. Rodar de novo troca as senhas; `--medicos id1,id2,id3` troca os médicos.
- Antes do ensaio, apagar o que o login da demonstração publicou: `limpar-demonstracao`; depois da apresentação, `remover-demonstracao`.
- Ligar o MFA do n8n e conferir no painel que a renovação do servidor está desligada.
- Rodar `usuarios-de-teste.py limpar` antes do ensaio e `remover` depois da apresentação.
- Confirmar no AI Studio que o projeto da chave do Gemini continua sem faturamento, antes do 3.8 e antes do ensaio.
- Aprovar a direção visual (F.1).
- Dar o ok de cada merge e de cada publicação no servidor.

## 8. Fora do MVP

- **A plateia usando o sistema:** QR code, persona sorteada, login anônimo e teste de carga com muita gente. A apresentação é guiada.
- **O telão ao vivo.** Com o 3.7, o cartão do telão sai da entrada.
- Telegram, check-in, pagamento, kit da Comissão de IA e Langfuse ficam como evolução futura ([ADR 0002](adr/0002-escopo-da-poc.md)).
- A previsão de vagas só entra se sobrar tempo, e só no documento.
- As entrevistas com coordenadores e plantonistas e a revisão às cegas das recomendações. O kit fica para um piloto futuro.

## 9. Riscos e o que cortar primeiro

| Risco | Resposta |
| --- | --- |
| Tempo curto para as fases 2 a 6 | Cortar nesta ordem: equidade com a contagem do sistema (fica só a simulação), resposta da contestação pelo coordenador (fica só a abertura), "Minha conta" do médico. **Nunca cortar:** a decisão humana, a cascata, a acessibilidade básica e o modo de demonstração |
| O frontend novo competir com as fases 4 e 6 pelo mesmo tempo | A direção visual (F.1) sai antes, para as telas novas nascerem nela. Se apertar, as telas que menos aparecem na fala (auditoria e contestações) ficam só com a base nova (cores, tipografia e componentes), sem layout novo |
| Servidor ou serviço externo cair ao vivo | Modo de demonstração na web, vídeo gravado e a leitura por regras no lugar do Gemini |
| Conduzir sozinho e errar um passo ao vivo | Roteiro escrito, ensaio cronometrado e o estado de partida conferido antes de começar |
| A cascata andar fora do tempo da fala | Prazo curto (D6) e o roteiro dizendo em que momento esperar e em que momento recusar |
| Supabase gratuito pausar depois de uma semana parado | O ensaio e os testes mantêm o projeto ativo; conferir antes do ensaio |
| Sem dados reais nem entrevistas, a simulação parecer inventada (o retorno FB2-1 do professor) | Fonte pública para cada premissa que tiver uma, premissa declarada onde não tiver, análise de sensibilidade e o piloto em modo sombra como o jeito de validar com um hospital de verdade |
