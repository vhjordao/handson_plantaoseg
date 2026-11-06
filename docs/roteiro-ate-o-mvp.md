# Roteiro até o MVP

O mapa de tudo o que falta para o PlantãoSeguro funcionar de ponta a ponta, do ponto em que estamos até a apresentação. Não tem datas: as datas ficam no [plano da Etapa 3](plano-etapa-3.md). Aqui fica a ordem, o motivo da ordem e o próximo passo.

**Como usar.** O próximo passo está sempre na seção 1. Cada PR marca o que terminou (`[x]`) e atualiza a seção 1. Uma decisão nova entra na seção 6, e uma mudança de rumo entra no [diário](diario-de-bordo.md).

## 1. Próximo passo

Três coisas podem andar ao mesmo tempo, porque não dependem uma da outra:

1. **Victor:** responder às decisões da [seção 6](#6-decisões-que-destravam-o-caminho). Dá para aceitar as recomendações de uma vez. Elas destravam a ligação da web com a API, que é o caminho crítico do produto.
2. **Claude Code:** o experimento contra a concentração das ofertas ([passo 7.1](#fase-7-concentração-das-ofertas)). Ele não depende das decisões e serve ao produto e à Entrega 3.
3. **Colegas:** as entrevistas e o teste de usabilidade da tarefa do coordenador, que já está no link público ([trilha da Entrega 3](#5-trilha-da-entrega-3-em-paralelo)).

## 2. Onde estamos

| Parte | Estado | Onde |
| --- | --- | --- |
| Motor (leitura, regras, ordem, motivos, trilha) | Pronto e testado | [ficha](../services/matching-api/README.md) |
| Banco (tabelas, RLS, trilha só de inserção, dados sintéticos) | No Supabase | [ficha](../supabase/README.md) |
| API de matching, com HTTPS | No servidor, imagem 0.2.0 | [ficha](../services/matching-api/app/api/README.md) |
| n8n e a cascata de ofertas | No servidor, conferida de ponta a ponta pela API | [ficha](../n8n/README.md) |
| Gemini | Pronto em custo zero; a chave só entra no ensaio e no dia | [ADR 0003](adr/0003-llm-do-produto-gemini.md) |
| Web: página inicial, entrada sem senha, lista de vagas, nova vaga, sugestões e decisão | No link público, **só no modo de demonstração** | [ficha](../apps/web/README.md) |
| Web: médico, telão ao vivo, auditoria, contestações e equidade | Ainda "em construção" | |
| Documento da Entrega 3 | Rascunho pronto, fora do Git, com frases a corrigir | trilha da seção 5 |

**O que falta, em uma frase:** as partes existem, mas ainda não conversam. A web roda sozinha no navegador e não chama a API nem o banco. Por isso o médico não recebe oferta, a cascata não aparece e a plateia não participa.

## 3. O que é o MVP pronto

O MVP está pronto quando, **no link público e com dados sintéticos**:

- [ ] O coordenador entra, escreve o pedido, confere os campos, vê a ordem sugerida com os motivos e quem ficou de fora, e aprova. Tudo grava no banco e na trilha.
- [ ] O médico, no celular, recebe a oferta com "Por que você", e aceita ou recusa.
- [ ] Se o médico recusa ou deixa o prazo passar, o n8n chama o próximo sozinho. No aceite, a vaga fecha.
- [ ] A plateia entra pelo QR code, sem senha, e participa como médico.
- [ ] O telão mostra o fluxo ao vivo, só com pseudônimos.
- [ ] O médico contesta uma recomendação, e o coordenador responde. Tudo fica na trilha.
- [ ] A auditoria mostra a trilha e confere a cadeia de hash. A equidade mostra a concentração das ofertas, rotulada como simulação.
- [ ] Com a chave ligada, o Gemini lê o pedido. Sem ela, ou se ele falhar, as regras leem.
- [ ] Se a API cair, a web oferece o modo de demonstração e a apresentação continua.
- [ ] CI verde, carga medida com a plateia simulada, servidor reiniciado com sucesso e ensaio em celulares reais.
- [ ] As regras de sempre valem: sem o clique do coordenador não sai oferta; o valor do plantão não entra na ordem; nome, CRM e telefone não vão à IA; segredos fora do Git; todo número de simulação rotulado.

## 4. O caminho, em ordem

Cada fase depende da anterior, salvo onde está escrito. Cada passo vira um PR com ficha, diário e CI verde, e só entra com o ok do Victor.

### Fase 1: decisões que destravam

- [ ] **1.1** Victor responde às decisões da [seção 6](#6-decisões-que-destravam-o-caminho).

**Por que primeiro:** o contrato da API, o banco e a entrada da plateia dependem delas. Construir antes seria refazer.

### Fase 2: banco e API completam o contrato

A API hoje faz o fluxo principal, mas a tela pede coisas que ela ainda não tem ([ADR 0014](adr/0014-estrutura-da-plataforma-web.md), divergências 3 a 17).

- [ ] **2.1** Aprovação com a justificativa da exceção gravada na trilha (D3).
- [ ] **2.2** Pular e desfazer o pulo, por nome, e o "Esta explicação ajudou?" (D4).
- [ ] **2.3** A leitura devolve, para cada campo, se está no texto ou foi deduzida, e o trecho. As sugestões devolvem a contribuição de cada variável e a evidência de quem ficou de fora.
- [ ] **2.4** O coordenador lê a política e a ficha do modelo.
- [ ] **2.5** Contestação: tabela, RLS e rotas para o médico abrir e o coordenador responder, com as ações `contestation_opened` e `contestation_answered` na trilha (D9).
- [ ] **2.6** Entrada da plateia: o perfil de médico nasce na hora, com uma persona sorteada (D1).
- [ ] **2.7** Login do coordenador da apresentação na rede simulada (D2). Quem roda o comando é o Victor.
- [ ] **2.8** Prazo curto da oferta na organização da apresentação (D7).
- [ ] **2.9** Publicar no servidor e conferir com `conferir-api.py`.

**Pronto quando:** cada rota nova tem teste, a neutralidade continua passando e a ficha da API mostra o contrato novo.

### Fase 3: a web passa a usar a API e o banco

O adaptador `live` liga a web ao sistema real.

- [ ] **3.1** Login real: o coordenador pelo login da fase 2 e a plateia pela entrada sem senha.
- [ ] **3.2** Leituras sob RLS, direto do banco: vagas, sugestões, ofertas, trilha. Escritas pela API: publicar, aprovar, pular, responder e contestar.
- [ ] **3.3** Erros da API viram mensagens da tela, e depois de um `429` a tela tenta de novo.
- [ ] **3.4** Se a API não responder, a tela oferece o modo de demonstração.
- [ ] **3.5** O relógio do cabeçalho vem do sistema, não de um valor fixo.
- [ ] **3.6** A jornada do coordenador, que hoje roda na demonstração, passa a rodar no `live`.

**Pronto quando:** a mesma jornada do coordenador passa nos dois modos, e uma vaga criada pela web aparece no banco e na trilha.

### Fase 4: a tela do médico e a cascata na tela

- [ ] **4.1** Ofertas no celular, com plantão, local, horário, distância, prazo e "Por que você".
- [ ] **4.2** Aceitar e recusar, com motivo (D5 e D6).
- [ ] **4.3** Contestar uma recomendação e ver a resposta.
- [ ] **4.4** "Minha conta": o que o sistema usa e não usa sobre o médico, e como pedir revisão humana.
- [ ] **4.5** Na tela da vaga, o coordenador acompanha a cascata: quem recebeu, quem recusou, quem deixou o prazo passar e o tempo que falta (D8 decide como a tela se atualiza).

**Pronto quando:** o cenário "o 1º recusa, o 2º deixa passar, o 3º aceita" acontece de verdade, com o n8n, e aparece nas duas telas.

### Fase 5: a plateia e o telão

- [ ] **5.1** O roteiro da demonstração: qual vaga, quantos na plateia, quem é sorteado para receber oferta e o que o telão mostra em cada momento.
- [ ] **5.2** QR code gerado no próprio site, levando à entrada do médico.
- [ ] **5.3** Persona sorteada para cada celular, entre os médicos que o roteiro precisa.
- [ ] **5.4** Telão ao vivo: o caminho da vaga, os números, a última decisão e o QR code.
- [ ] **5.5** Aviso "não digite dados reais" onde a plateia escreve.

**Pronto quando:** tantos celulares quanto a plateia esperada entram ao mesmo tempo, recebem ofertas e aparecem no telão.

### Fase 6: auditoria, contestações e equidade

- [ ] **6.1** Auditoria: tabela da trilha, filtro por vaga, exportação CSV e verificação da cadeia no navegador.
- [ ] **6.2** Contestações: a caixa do coordenador, com a resposta registrada.
- [ ] **6.3** Equidade: concentração das ofertas e disparidade, com "medidas em dados sintéticos" (D10).

### Fase 7: concentração das ofertas

Esta fase **não depende das anteriores** e pode começar já.

- [ ] **7.1** Experimento com rodízio entre elegíveis equivalentes e limite de ofertas, medindo o custo em tempo até preencher e na chance de sucesso.
- [ ] **7.2** A política escolhida vai para a API, com teste, e aparece na equidade.

**Por que importa:** hoje, os 10% mais recomendados ocupam 50,7% do top-5, contra 31,1% no processo manual (simulação). É o maior risco ético medido.

### Fase 8: pronto para o palco

- [ ] **8.1** Cabeçalhos de segurança na web e no Traefik. Endereço do site no Supabase (`site_url`) e login anônimo conforme D1.
- [ ] **8.2** MFA no n8n e a renovação do servidor desligada (Victor).
- [ ] **8.3** Teste de carga com as telas e a plateia simulada, ajustando o limite por IP se preciso.
- [ ] **8.4** Reiniciar o servidor e conferir que tudo volta sozinho.
- [ ] **8.5** Gemini no ensaio: chave no servidor, conferência de uma chamada e memória com `docker stats` ([passo a passo](../infra/README.md)).
- [ ] **8.6** Acessibilidade e Lighthouse nas telas novas, e ensaio em celulares reais.
- [ ] **8.7** Plano B: vídeo gravado da jornada inteira, o modo de demonstração pronto para trocar e as respostas já carregadas.
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

- [ ] **E.1** Entrevistas com 3 a 5 coordenadores e 3 a 5 plantonistas ([kit](entrevistas/LEIAME.md)), depois de o Victor confirmar com o professor.
- [ ] **E.2** Teste de usabilidade da tarefa do coordenador ([roteiro](ux/teste-de-usabilidade.md)). As tarefas do médico ficam para depois da fase 4, e o documento diz isso.
- [ ] **E.3** Resultado do experimento da concentração (7.1).
- [ ] **E.4** Comparar a regressão logística com o LightGBM, como a Etapa 2 prometeu.
- [ ] **E.5** Previsão de vagas, se sobrar tempo: um baseline com resultado honesto, mesmo abaixo da meta.
- [ ] **E.6** Corrigir o documento: a tela do coordenador já existe, a do médico não; o domínio público já tem a plataforma; o Gemini foi testado; o teste de usabilidade cobre só o coordenador.
- [ ] **E.7** Caso de negócio e critérios de sucesso com os números das entrevistas.
- [ ] **E.8** Gerar o PDF, atualizar a rastreabilidade (A4-1 a A4-11) e abrir o PR, com o ok do Victor.
- [ ] **E.9** Aplicar o retorno da aula de storytelling e preparar os slides e o pitch com o grupo.

## 6. Decisões que destravam o caminho

Todas são do Victor. A recomendação é a escolha mais simples que cumpre as regras do projeto.

| # | Decisão | Recomendação | Por quê |
| --- | --- | --- | --- |
| D1 | Como a plateia entra | Login anônimo do Supabase, ligado pelo Victor, e uma rota da API que cria o perfil de médico com uma persona sorteada | Sem senha e sem dado pessoal, e cada celular vira um médico de verdade no banco. É mudança de segurança: o Victor executa, com o comando preparado |
| D2 | Quem é o coordenador na apresentação | Um login do grupo na organização da rede simulada, criado pelo script dos logins de teste | Os logins de teste atuais pertencem a outra organização e não veem os 300 médicos |
| D3 | Justificativa da exceção | A API aceita a justificativa e a grava na trilha, junto da aprovação | Hoje a tela exige a justificativa, mas a API a recusa |
| D4 | Pular e "Esta explicação ajudou?" | Rotas novas, que registram na trilha | Hoje existem só no modo de demonstração. A outra rota da API recusa a lista inteira e cancela a vaga |
| D5 | Motivo da recusa | Os quatro motivos que a API já aceita, sem texto livre | Texto livre pode trazer dado pessoal e não tem onde ficar |
| D6 | Desfazer o aceite ou a recusa | Não desfazer; a tela pede confirmação antes | A API não tem essa volta, e a confirmação evita o toque sem querer |
| D7 | Prazo da oferta na apresentação | 2 minutos | Com 60, a plateia não vê a cascata andar |
| D8 | Como as telas se atualizam | Consultar a cada 3 segundos; tempo real do Supabase só se faltar | É mais simples e aguenta queda de conexão. O banco ainda não publica nada em tempo real |
| D9 | Contestação | Tabela própria, com RLS, e rotas na API | Hoje ela só existe no desenho. É o que o professor destacou como diferencial |
| D10 | O que a equidade mostra | As medidas da simulação, rotuladas, mais a contagem ao vivo das ofertas da apresentação | Dados reais não existem, e um número sem rótulo seria falso |
| D11 | Urgência | A tela passa a exigir, perguntando quando falta | A API e o banco a exigem, e a tela já pergunta pelos outros campos |

## 7. O que só o Victor faz

- Responder às decisões da seção 6.
- Confirmar com o professor que as entrevistas seguem como atividade da disciplina.
- Ligar o login anônimo no Supabase, se D1 for aceita, e criar o login do coordenador da apresentação, com os comandos preparados.
- Ligar o MFA do n8n e conferir no painel que a renovação do servidor está desligada.
- Rodar `usuarios-de-teste.py limpar` antes do ensaio e `remover` depois da apresentação.
- Dar o ok de cada merge e de cada publicação no servidor.

## 8. Fora do MVP

Telegram, check-in, pagamento, kit da Comissão de IA e Langfuse ficam como evolução futura ([ADR 0002](adr/0002-escopo-da-poc.md)). A previsão de vagas só entra se sobrar tempo, e só no documento.

## 9. Riscos e o que cortar primeiro

| Risco | Resposta |
| --- | --- |
| Tempo curto para as fases 2 a 6 | Cortar nesta ordem: equidade ao vivo (fica só a simulação), telão (fica a tela do coordenador projetada), contestação respondida pelo coordenador (fica só a abertura), persona sorteada (fica uma lista fixa). **Nunca cortar:** a decisão humana, a acessibilidade básica e o modo de demonstração |
| Servidor ou serviço externo cair ao vivo | Modo de demonstração na web, vídeo gravado e a leitura por regras no lugar do Gemini |
| Plateia no mesmo Wi-Fi esbarrar no limite por IP | Medir na fase 8 e ajustar `API_RATE_AVERAGE` e `API_RATE_BURST` |
| Plateia escrever dado real | Aviso na tela, e a plateia não alcança a leitura da vaga, a única etapa que vai ao Gemini |
| Supabase gratuito pausar depois de uma semana parado | O ensaio e os testes mantêm o projeto ativo; conferir antes do ensaio |
| Entrevistas não acontecerem | Teste com colegas, com a limitação dita no documento |
