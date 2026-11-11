# Roteiro até o MVP

O mapa de tudo o que falta para o PlantãoSeguro funcionar de ponta a ponta, do ponto em que estamos até a apresentação. As datas ficam no [plano da Etapa 3](plano-etapa-3.md); aqui só aparecem os marcos fixos. Aqui fica a ordem, o motivo da ordem e o próximo passo.

**Como usar.** O próximo passo está sempre na seção 1, no plano por fases. Cada PR marca o que terminou (`[x]`) e atualiza a seção 1. Uma decisão nova entra na seção 6, e uma mudança de rumo entra no [diário](diario-de-bordo.md).

**A apresentação é uma demonstração guiada** (decisão do Victor em 06/11/2026). Ele conduz sozinho, ao vivo, fazendo o papel do coordenador e o do médico. A plateia assiste e não usa o sistema. Por isso, QR code, persona sorteada, login anônimo, telão ao vivo e carga com muita gente saíram do MVP.

**Sem entrevistas** (decisão do Victor em 06/11/2026). Tudo segue com dados sintéticos, o mais realistas possível: cada premissa do simulador é comparada a uma fonte pública quando ela existe, e declarada como premissa quando não existe, com a análise de sensibilidade mostrando o quanto ela pesa.

## 1. Próximo passo: o plano por fases

**Plano combinado com o Victor em 06/11/2026.** O que falta vai em fases A a I, nesta ordem. Os números entre parênteses são os passos da [seção 4](#4-o-caminho-em-ordem), onde fica o detalhe. As datas fixas são as do [plano da Etapa 3](plano-etapa-3.md): Entrega 3 em 07/11, código congelado em 13/11 e apresentação em 17/11.

**Decisões do Victor em 06/11 que moldam o plano:** a entrada passa a ser só com login; a página do telão sai do site; o Gemini fica ligado no sistema real, e o projeto da chave continua sem faturamento (confirmado por ele); o visual novo parte de um modelo que ele vai trazer, e o Claude Code não propõe direção visual por conta própria.

| Fase | O que entra | Quem | Pronto quando |
| --- | --- | --- | --- |
| **A. Fechar o que está aberto** | Enviar a Entrega 3; conferir a jornada do coordenador no sistema real (3.6); ok para os PRs abertos | Victor | Entrega enviada, 3.6 conferida e nenhum PR aberto |
| **B. Só login, sem telão e Gemini ligado** | Entrada só com login e o telão fora do site (3.7); a chave do Gemini no servidor, com teto diário (3.8) | Claude Code | A entrada só aceita login, e um pedido escrito na tela é lido pelo Gemini, ou pelas regras se ele falhar |
| **C. Tela do médico e cascata na tela** | Ofertas, aceite e recusa, contestação, "Minha conta" e a cascata acompanhada pelo coordenador (4.1 a 4.5), no visual de hoje | Claude Code | "O 1º recusa, o 2º deixa passar, o 3º aceita" acontece de verdade e aparece nas duas telas |
| **D. Auditoria, contestações e equidade** | As três telas com os dados do sistema (6.1 a 6.3), no visual de hoje | Claude Code | As três mostram dados reais, com os rótulos de simulação |
| **E. O visual novo** | O Victor traz o modelo (F.1); ele vira a base (F.2), e as telas são ajustadas uma a uma (F.3 a F.8) | Victor e Claude Code | Todas as telas no visual novo, nos dois temas e no celular, com os testes passando |
| **F. Roteiro da demonstração** | Pedido, quem recusa, quem deixa passar e quem aceita, as janelas e quando trocar para o modo de demonstração (5.1 a 5.4) | Victor e Claude Code | O Victor percorre o roteiro sozinho, sem consultar ninguém |
| **G. Pronto para o palco** | Segurança, caminho completo no servidor, reinício, acessibilidade, vídeo de plano B e congelar o código (8.1 a 8.4, 8.6, 8.7 e 8.9); MFA do n8n (8.2, Victor) | Claude Code e Victor | Código congelado em 13/11, com o vídeo e o modo de demonstração prontos |
| **H. Ensaio e apresentação** | Limpar os dados de teste (8.8, também zera a contagem do rodízio), ensaio com o plano B e o Gemini (8.5 e 9.1), slides e pitch (E.9) e a apresentação (9.2) | Victor e grupo | 17/11 |
| **I. Depois da apresentação** | Chave do Gemini fora e apagada, logins e dados de teste removidos, servidor parado e tokens revogados (10.1 a 10.4) | Victor | Nada do projeto fica ligado |

**Em paralelo, se sobrar tempo:** teste de usabilidade com os colegas (E.2), regressão logística contra LightGBM (E.4) e previsão de vagas (E.5).

**Onde está a fase B (10/11):** na `main` e no servidor (PR #34): a entrada só com login, o telão fora do site, a imagem 0.5.0 e a chave do Gemini. O projeto do Supabase estava pausado e foi reativado no mesmo dia, com o ok do Victor. Depois, o uso econômico do Gemini (0.5.1, PR #35). **Fase B fechada em 10/11:** o pedido que o Victor escreveu na tela do sistema real foi lido pelo Gemini ("Leitura pela IA").

**Onde está a fase C (10/11):** o código está no PR da branch `f4/tela-medico`: no sistema real, o médico vê as ofertas com o "Por que você" e o prazo andando, aceita ou recusa com um dos quatro motivos e confirmação, contesta e acompanha a resposta, e o coordenador vê a cascata na tela da vaga, atualizada a cada 3 segundos. O modo de demonstração faz o mesmo caminho sem o servidor (4.6), numa aba só: o botão "Passar o prazo desta oferta" faz o papel do n8n, e a porta do médico mostra primeiro quem tem oferta esperando. Falta a conferência de ponta a ponta no sistema real ("o 1º recusa, o 2º deixa passar, o 3º aceita"), que precisa dos logins do Victor.

**Onde está a fase E (11/11):** o Victor trouxe o modelo (F.1) e pediu a fase E antes da D. Está na `main` e no ar desde 11/11 (PR #38): a base nova (F.2) em cores, raios, sombras, tipografia, componentes e as cascas do coordenador e do médico, nos dois temas. Como as telas usam os componentes e os tokens, a página inicial, a entrada, o coordenador e o médico mudaram juntos (F.3 a F.6). A revisão está na [direção de arte, seção 6](design/direcao-de-arte.md#6-revisão-da-fase-e-10112026-o-visual-novo). Em 10 e 11/11, a pedido do Victor, uma segunda passada seguiu o desenho do modelo (barra superior com menu em pílulas, painéis translúcidos, anéis de traços e cascata em linha do tempo), e a página inicial ganhou o hero em "vidro líquido" ([seção 6.1 e 6.2](design/direcao-de-arte.md#61-segunda-passada-10-e-1111-fiel-ao-desenho-do-modelo)). O Victor aprovou com a CI verde, e a produção da Vercel saiu pronta no commit do merge. Ainda em 11/11, a pedido dele, as vozes deixaram o tracejado, o médico ganhou um painel inicial no formato do dashboard do modelo, a plataforma ganhou ao fundo uma malha suave em CSS, escolhida pelo Victor entre três propostas (depois de um corpo em SVG, de uma aurora e de uma imagem do Figma), e o botão de tema claro e escuro; depois, a página inicial passou ao formato de "cartões mascarados" ([seção 6.4](design/direcao-de-arte.md#64-a-página-inicial-em-cartões-mascarados-1111)) ([seção 6.3](design/direcao-de-arte.md#63-vozes-sem-tracejado-painel-do-médico-corpo-de-vidro-e-tema-1111)). Quando a fase D fizer auditoria, contestações e equidade, elas já nascem no visual novo (F.7); a revisão de celular, teclado, leitor de tela e Lighthouse em todas as telas fica para o 8.6 (F.8).

**Próximo passo:** a fase D (auditoria, contestações e equidade, 6.1 a 6.3), já com os componentes do visual novo. O modelo chegou em 10/11, então o visual coube antes de 13/11 com o layout de cada tela, e não só a base.

## 2. Onde estamos

| Parte | Estado | Onde |
| --- | --- | --- |
| Motor (leitura, regras, ordem, motivos, trilha) | Pronto e testado | [ficha](../services/matching-api/README.md) |
| Banco (tabelas, RLS, trilha só de inserção, dados sintéticos) | No Supabase | [ficha](../supabase/README.md) |
| API de matching, com HTTPS | No servidor, imagem 0.4.0 (fase 2 e o rodízio entre equivalentes da 7.2) | [ficha](../services/matching-api/app/api/README.md) |
| n8n e a cascata de ofertas | No servidor, conferida de ponta a ponta pela API | [ficha](../n8n/README.md) |
| Gemini | Ligado no servidor desde 10/11 e lendo os pedidos da tela (3.8), em custo zero, com teto diário de 100, teto de 10 por minuto e pedido repetido sem nova chamada (0.5.1) | [ADR 0003](adr/0003-llm-do-produto-gemini.md) |
| Decisões D1 a D11 | Aprovadas pelo Victor em 06/11 | [ADR 0015](adr/0015-decisoes-que-destravam-o-mvp.md) |
| Web: página inicial, entrada com login, lista de vagas, nova vaga, sugestões e decisão | No link público, no sistema real com o login da demonstração; o modo de demonstração fica como plano B (3.7, no PR da fase B) | [ficha](../apps/web/README.md) |
| Web: médico (ofertas, resposta, contestação) e a cascata na tela da vaga | Na `main` desde 10/11 (PR #36), no sistema real e no modo de demonstração (4.6); falta a conferência de ponta a ponta com os logins | [ficha](../apps/web/README.md) |
| Web: auditoria, contestações do coordenador e equidade | Ainda "em construção" (fase D) | |
| Web: visual novo (fase E) | Na `main` e no ar desde 11/11 (PR #38), nos dois temas e no celular | [direção de arte, seção 6](design/direcao-de-arte.md#6-revisão-da-fase-e-10112026-o-visual-novo) |
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
- [x] **3.7** *Pedido do Victor em 06/11.* A entrada passa a ser só com login: e-mail e senha para o coordenador e para os médicos, e o papel vem do perfil. Saem da entrada as portas por persona. A página do telão sai do site, com o cartão da entrada e o papel "telão" da sessão (decisão do Victor em 06/11). O modo de demonstração continua como plano B (3.4 e 5.4), por um link discreto na entrada ("O sistema não responde? Usar o modo de demonstração") e pelo aviso de indisponível. A página inicial e a ajuda passam a apontar para o login. *Feito em 10/11, no PR da fase B: `/entrar` tem só e-mail e senha; as portas por persona foram para `/entrar/demonstracao`, aberta pelo link discreto e pelo aviso; `/telao` dá 404, e o papel `telao` saiu da sessão.*
- [x] **3.8** *Pedido do Victor em 06/11: "Gemini ligado, mas sempre sem gerar custos".* A chave vai para o `.env` do servidor e fica lá até o fim do projeto (10.1). O Victor confirmou em 06/11 que o projeto continua sem faturamento. A API ganha um teto diário de chamadas, abaixo da cota gratuita; passando dele, a leitura segue pelas regras, sem erro na tela. A reescrita dos motivos continua desligada. Conferir com uma chamada (`--rapido`), a memória com `docker stats` e um pedido de ponta a ponta pela tela. *Teto feito em 10/11 (PR #34), e a 0.5.0 e a chave estão no servidor desde 10/11. No mesmo dia, o Victor pediu uso econômico: teto diário de 100, teto de 10 por minuto e pedido repetido sem nova chamada (0.5.1, [ADR 0003](adr/0003-llm-do-produto-gemini.md)). A conferência com uma chamada deu 503 e tempo esgotado do Google naquela noite. *Feito em 10/11:* logo depois, o Victor escreveu um pedido na tela do sistema real, com o login do coordenador, e a leitura veio marcada "Leitura pela IA", com todos os campos certos (o modo de demonstração sempre lê pelas regras). A API usa 72 MiB de 512 com o pacote do Gemini.*

**Pronto quando:** a mesma jornada do coordenador passa nos dois modos, e uma vaga criada pela web aparece no banco e na trilha. Com o 3.7 e o 3.8: a entrada só aceita login, e o pedido escrito na tela é lido pelo Gemini, ou pelas regras se ele falhar.

### Fase 4: a tela do médico e a cascata na tela

- [ ] **4.1** Ofertas, com plantão, local, horário, distância, prazo e "Por que você". *Código no PR da fase C (10/11, branch `f4/tela-medico`), no sistema real; falta a conferência de ponta a ponta.*
- [ ] **4.2** Aceitar e recusar, com um dos quatro motivos (distância, cansaço, agenda ou outro) e confirmação antes, porque não se desfaz (D4 e D5). *Código no PR da fase C (10/11, branch `f4/tela-medico`), no sistema real; falta a conferência de ponta a ponta.*
- [ ] **4.3** Contestar uma recomendação e ver a resposta. *Código no PR da fase C (10/11, branch `f4/tela-medico`), no sistema real; falta a conferência de ponta a ponta.*
- [ ] **4.4** "Minha conta": o que o sistema usa e não usa sobre o médico, e como pedir revisão humana. *No PR da fase C: a página já existia; agora mostra o médico do login e leva às contestações.*
- [ ] **4.5** Na tela da vaga, o coordenador acompanha a cascata: quem recebeu, quem recusou, quem deixou o prazo passar e o tempo que falta (a tela consulta o sistema a cada 3 segundos, D7). *Código no PR da fase C (10/11, branch `f4/tela-medico`), no sistema real; falta a conferência de ponta a ponta.*
- [x] **4.6** O modo de demonstração simula as ofertas e a cascata, para o plano B (5.4) fazer o mesmo caminho sem o servidor. *Feito em 10/11, no PR da fase C: a aprovação envia a 1ª oferta; recusa, aceite, prazo e contestação seguem a regra do sistema real; tudo numa aba só, porque o estado da demonstração fica no `sessionStorage` e o cookie de sessão vale para o navegador inteiro. O relógio da demonstração só anda pelo botão "Passar o prazo desta oferta", e ele é um só: as vagas de exemplo com oferta aberta também andam. Um teste no navegador percorre o plano B inteiro.*

**Pronto quando:** o cenário "o 1º recusa, o 2º deixa passar, o 3º aceita" acontece de verdade, com o n8n, e aparece nas duas telas.

### Fase 5: a demonstração guiada

- [ ] **5.1** O roteiro: qual pedido digitar, quais médicos aprovar e em que ordem, quem recusa, quem deixa passar e quem aceita, e o que mostrar em cada tela.
- [ ] **5.2** O estado de partida: a vaga do roteiro recomenda os médicos que têm login, e o banco começa limpo de testes anteriores. Com o rodízio ([ADR 0017](adr/0017-rodizio-entre-equivalentes-na-api.md)), as recomendações dos ensaios na mesma semana mudam a ordem: rodar o `limpar-demonstracao` antes do dia zera essa contagem.
- [ ] **5.3** As janelas: coordenador e médico lado a lado, ou o médico no celular, com a tela do celular projetada. *Atenção (10/11): o cookie de sessão vale para o navegador inteiro, então duas abas do mesmo navegador viram o mesmo papel. No sistema real, lado a lado pede uma janela anônima, outro navegador ou o celular. No modo de demonstração, o caminho é numa aba só (4.6).*
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

*Pedido do Victor em 06/11: "melhorar o frontend por completo, desde a landing page até as páginas de dentro do produto".* O visual parte de um modelo que o Victor vai trazer. Por isso a trilha vem depois das fases 4 e 6 (fase E da seção 1): as telas novas são feitas no visual de hoje, e o modelo entra pela base, que muda todas as telas de uma vez. Não muda regra nem dado: a decisão humana, os rótulos de simulação, a acessibilidade e o modo de demonstração continuam.

- [x] **F.1** O Victor traz o modelo visual que tem em mente, até cerca de 10/11. O Claude Code não propõe direção por conta própria. *Feito em 10/11: uma tela de painel médico como referência de linguagem, sem copiar a estrutura nem as funções.*
- [x] **F.2** O modelo vira a base: cores e espaços como variáveis, tipografia, componentes e as cascas do coordenador e do médico, nos temas claro e escuro. *Feito em 10/11, no PR da fase E ([direção de arte, seção 6](design/direcao-de-arte.md#6-revisão-da-fase-e-10112026-o-visual-novo)).*
- [x] **F.3** A página inicial e a ajuda, contando o produto como a apresentação conta. *Feito em 11/11 (PR #38): o hero em "vidro líquido" e as seções em painéis ([seção 6.2](design/direcao-de-arte.md#62-o-hero-em-vidro-líquido-1111)).*
- [x] **F.4** A entrada só com login, no visual novo (a função vem no 3.7). *Feito em 11/11 (PR #38): o login num painel, com os três passos do produto ao lado.*
- [x] **F.5** As telas do coordenador: lista de vagas, nova vaga, sugestões e decisão. *Feito em 11/11 (PR #38): barra superior em pílulas, Vagas em grade com os indicadores, resumo e anel da rede na vaga e a cascata em linha do tempo.*
- [x] **F.6** As telas do médico (feitas na fase 4). *Feito em 11/11 (PR #38): a oferta com o anel do prazo e "Minha conta" em painéis.*
- [ ] **F.7** Auditoria, contestações e equidade (feitas na fase 6).
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
- Conferir de novo, antes do ensaio, que o projeto da chave do Gemini continua sem faturamento (confirmado em 06/11).
- Trazer o modelo visual (F.1), até cerca de 10/11.
- Dar o ok de cada merge e de cada publicação no servidor.

## 8. Fora do MVP

- **A plateia usando o sistema:** QR code, persona sorteada, login anônimo e teste de carga com muita gente. A apresentação é guiada.
- **O telão.** A página sai do site no 3.7 (decisão do Victor em 06/11).
- Telegram, check-in, pagamento, kit da Comissão de IA e Langfuse ficam como evolução futura ([ADR 0002](adr/0002-escopo-da-poc.md)).
- A previsão de vagas só entra se sobrar tempo, e só no documento.
- As entrevistas com coordenadores e plantonistas e a revisão às cegas das recomendações. O kit fica para um piloto futuro.

## 9. Riscos e o que cortar primeiro

| Risco | Resposta |
| --- | --- |
| Tempo curto para as fases 2 a 6 | Cortar nesta ordem: equidade com a contagem do sistema (fica só a simulação), resposta da contestação pelo coordenador (fica só a abertura), "Minha conta" do médico. **Nunca cortar:** a decisão humana, a cascata, a acessibilidade básica e o modo de demonstração |
| O modelo visual chegar tarde, ou o visual novo não caber antes de 13/11 | O modelo entra pela base, que muda todas as telas de uma vez. Se apertar, as telas que menos aparecem na fala (auditoria e contestações) ficam só com a base nova, sem layout novo. Mudar o visual depois de congelar o código vai contra a regra de só corrigir |
| Servidor ou serviço externo cair ao vivo | Modo de demonstração na web, vídeo gravado e a leitura por regras no lugar do Gemini |
| Conduzir sozinho e errar um passo ao vivo | Roteiro escrito, ensaio cronometrado e o estado de partida conferido antes de começar |
| A cascata andar fora do tempo da fala | Prazo curto (D6) e o roteiro dizendo em que momento esperar e em que momento recusar |
| Supabase gratuito pausar depois de uma semana parado | O ensaio e os testes mantêm o projeto ativo; conferir antes do ensaio |
| Sem dados reais nem entrevistas, a simulação parecer inventada (o retorno FB2-1 do professor) | Fonte pública para cada premissa que tiver uma, premissa declarada onde não tiver, análise de sensibilidade e o piloto em modo sombra como o jeito de validar com um hospital de verdade |
