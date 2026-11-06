# Diário de bordo

Decisões e mudanças do dia, para os seis integrantes acompanharem. Registra também o uso de IA no planejamento do projeto (Gestão de Projetos com IA). Mais recente no topo.

> **Nota de 31/10/2026 (Victor).** O trabalho deste projeto foi feito **em conjunto** entre o Victor e o Claude Code, e nem tudo foi feito pela IA: a sugestão dos dados partiu do Victor. As linhas de "Uso de IA" abaixo descrevem o apoio da IA em cada dia; não significam que tudo foi escrito por ela.

## 06/11/2026 (sexta): o rodízio no servidor (imagem 0.4.0)

**Pedido do Victor:** "Merge e publicar", para o PR #32.

**O que foi feito:**

- **Merge** do #32 com a CI verde.
- **Publicação:** o Compose do servidor só diferia da `main` na tag da imagem. Antes, cópias para voltar atrás (`docker-compose.yml.antes-rodizio` e `services/matching-api.antes-rodizio`); a imagem 0.3.0 continua no servidor. O código foi copiado da `main`, a imagem 0.4.0 foi construída lá, e só a API foi trocada. Sem migração.
- **Conferência:** 33 de 33 do `conferir-api.py verificar`, API saudável e sem erro no log. No banco, a primeira recomendação da 0.4.0 gravou na trilha a política `rodizio`, com margem 0,1 e janela de 7 dias.

**Uso de IA:** o Claude Code fez o merge, publicou e conferiu; nenhum segredo, IP ou endereço foi impresso.

## 06/11/2026 (sexta): o rodízio contra a concentração entra na API (7.2)

**Pedido do Victor:** "Sim, fazer a 7.2", enquanto a conferência da 3.6 não sai.

**O que ficou pronto ([ADR 0017](adr/0017-rodizio-entre-equivalentes-na-api.md)):**

- **A regra num lugar só:** `app/ranking/rotation.py`. Entre os elegíveis com chance a até 10 pontos da melhor ainda disponível, vai primeiro quem apareceu menos no top-5 nos últimos 7 dias. O experimento da 7.1 passou a usar a mesma função, e o relatório não mudou.
- **Na API:** a contagem vem das recomendações gravadas no banco (posição até 5, últimos 7 dias). A resposta traz, para cada nome, a posição só pelo modelo e a exposição; `GET /policy` traz a margem e a janela.
- **Na trilha:** a `recommendation_generated` registra a política e quem mudou de lugar.
- **Na tela do coordenador (modo real):** o nome que mudou de lugar diz por quê ("Rodízio: só pelo modelo, seria o 3º..."). O modo de demonstração não tem histórico e segue igual.

**Testes:** 560 testes do motor e da API (10 novos do rodízio) e 204 de unidade e componente na web. O banco falso dos testes aprendeu `gte` e `lte` e passou a gravar `created_at`, como o banco real.

**Depois:** publicado no mesmo dia (entrada acima). Ensaios na mesma semana mudam a ordem da vaga do roteiro; o `limpar-demonstracao` antes do dia zera a contagem.

**Uso de IA:** o Claude Code levou a política ao motor e à API, escreveu os testes e a documentação; a escolha da política seguiu o critério do grupo no experimento.

## 06/11/2026 (sexta): fase 3, a web usa o sistema real

**Pedido do Victor:** "Pode seguir" (fase 3), depois de criar os logins da demonstração.

**O que ficou pronto:**

- **Login real (3.1):** "Entrar no sistema real" em `/entrar`, com e-mail e senha, ao lado das portas por persona. O papel não vem do navegador: o servidor pergunta à API quem é o dono do token.
- **Adaptador `live` (3.2):** a jornada do coordenador lê vagas, sugestões e decisões do banco sob RLS e escreve pela API (publicar, recomendar, aprovar com justificativa, pular, desfazer e feedback). A recomendação gerada fica guardada na aba, e depois de recarregar é refeita do banco e da trilha.
- **Erros, 429 e plano B (3.3 e 3.4):** os códigos da API viram as mensagens da tela; depois de um 429 a chamada espera e tenta de novo; sem resposta, um aviso leva ao modo de demonstração com um clique.
- **Relógio do sistema (3.5)** no modo real, e a **urgência exigida** na nova vaga (D10).
- **Uma mudança de desenho, registrada no [ADR 0016](adr/0016-modo-real-pela-rota-do-site.md):** chamar a API direto do navegador poria o endereço do servidor no JavaScript público. O navegador passou a falar só com o próprio site, em `/api/sistema`, que repassa à API e ao banco com endereços só do servidor e uma lista fechada de rotas (nunca `/internal`; no banco, só leitura).

**Testes:** 203 testes de unidade e componente na web (19 novos do modo real e da rota) e 123 de jornada e acessibilidade, com os três que publicavam sem urgência ajustados. A ponte foi testada contra o servidor e o banco reais sem login: rota interna recusada, 401 sem login, tabela fora da lista recusada e senha errada com a mensagem certa.

**O que não foi conferido:** a jornada com o login de verdade. As senhas estão só com o Victor, e o Claude Code não digita senhas. Ela é o passo 3.6.

**Uso de IA:** o Claude Code escreveu o adaptador, a rota, o login e os testes, e mudou o desenho para não expor o servidor; o Victor confere a jornada.

## 06/11/2026 (sexta): fase 2 no servidor

**O que foi feito (passo 2.8), com o ok do Victor para a fase 2:**

- **Banco:** as três migrações da fase 2 (`contrato_da_tela`, `contestacao` e `prazo_da_demonstracao`) foram aplicadas no projeto real com `npx supabase@3.0.0 db push`, depois de um ensaio que listou só elas. Conferido por fora: prazo de 2 minutos na rede simulada e de 60 na organização de teste, tabela de contestações respondendo à API e recusando quem não tem login, e as colunas novas no lugar.
- **API:** imagem 0.3.0 construída no servidor a partir da `main`, com cópias para voltar atrás (`docker-compose.yml.antes-fase2`, `services/matching-api.antes-fase2` e a imagem `antes-fase2`).
- **Conferência:** 33 de 33 conferências do `conferir-api.py verificar` passaram, `/health` responde de fora, a rota interna segue fechada, as rotas novas pedem login e a API usa 59 MiB.

**Falta na fase 2:** o Victor rodar o comando dos logins da demonstração (2.6).

**Uso de IA:** o Claude Code aplicou as migrações, publicou a imagem e rodou a conferência; nenhum segredo foi impresso.

## 06/11/2026 (sexta): fase 2, o comando dos logins da demonstração

**O que ficou pronto (passo 2.6, D1):** `scripts/usuarios-de-teste.py` ganhou três comandos. `demonstracao` cria um coordenador da rede simulada e três médicos dela, com e-mail em domínio reservado (nenhum e-mail é enviado) e senha sorteada, que aparece só no terminal de quem roda. Sem `--medicos`, usa os três primeiros médicos das personas da demonstração, que existem no banco com os mesmos IDs; rodar de novo troca as senhas e, com `--medicos`, os médicos. `limpar-demonstracao` apaga só o que o coordenador da demonstração publicou (vagas, recomendações, ofertas e contestações), e `remover-demonstracao` apaga também os logins. A trilha fica.

**Falta:** o Victor rodar o comando. O Claude Code não cria contas no projeto real nem vê as senhas.

**Uso de IA:** o Claude Code escreveu os comandos sobre o script que já existia; nada foi executado contra o projeto real.

## 06/11/2026 (sexta): fase 2, a contestação e o prazo de 2 minutos

**O que ficou pronto (passos 2.5 e 2.7):**

- **Contestação (D8):** tabela `contestations` sob RLS. O médico lê as próprias, e o coordenador, as da organização; ninguém escreve pelo navegador. A API abre (`POST /offers/{id}/contest`, só o médico da oferta, uma por oferta) e responde (`POST /contestations/{id}/answer`, só o coordenador da organização, uma vez). O texto vai para a tabela sem CRM, telefone, e-mail nem documento; a trilha guarda só códigos e IDs (`contestation_opened` e `contestation_answered`). Com isso, a tela não tem mais nenhuma ação "só do desenho".
- **Prazo de 2 minutos (D6):** uma migração muda o prazo da oferta só na rede simulada. A simulação e as métricas publicadas continuam com 60.

**Testes:** 11 da contestação na API e um teste de banco novo (`03_contestacao_test.sql`, 11 casos: uma por oferta, regras da resposta, quem lê e quem não escreve).

**Uso de IA:** o Claude Code escreveu a migração, as rotas e os testes a partir do contrato da tela; o Victor autorizou a fase.

## 06/11/2026 (sexta): fase 2, a API completa o contrato da tela do coordenador

**Pedido do Victor:** "Todos os merges feitos, tem meu ok. Siga para a fase 2, está autorizado a já executar." Os PRs #24 e #25 entraram na `main` com a CI verde.

**O que ficou pronto (passos 2.1 a 2.4):**

- **Leitura com origem e trecho:** cada campo diz se está escrito, foi deduzido ou falta, e onde está no texto. É a mesma regra da tela, portada para o Python; os valores lidos não mudaram (as fixtures da demonstração continuam idênticas).
- **Contribuições e evidência:** a recomendação devolve a contribuição de cada variável e a evidência numérica de cada exclusão, e as duas ficam gravadas. A evidência saiu do exportador para `app/evidence.py`, que a API e o exportador usam.
- **Justificativa da exceção (D2):** aprovar alguém com alerta de jornada exige uma justificativa de pelo menos 10 caracteres, que vai para a trilha sem CRM, telefone, e-mail nem documento. Nome pulado não pode ser aprovado.
- **Pular, desfazer e feedback (D3):** cada um com rota e linha na trilha, no mesmo formato do modo de demonstração. A trilha só cresce: desfazer é uma linha nova.
- **Estado da decisão, política e ficha:** rotas só de leitura, para a tela voltar igual depois de recarregar.
- **Banco:** a migração `contrato_da_tela` acrescenta duas ações à trilha e as colunas de contribuições e evidência. As contribuições têm a mesma lista fechada das variáveis, então o valor do plantão não cabe ali (teste de banco novo).

**Uma escolha de privacidade:** a API nunca lê nome de médico. Por isso o filtro de dados pessoais fica em duas camadas: a tela apaga os nomes antes de enviar, e a API apaga CRM, telefone, e-mail, documento e números longos.

**Testes:** 539 no motor (29 novos) e 184 na web.

**Uso de IA:** o Claude Code desenhou o contrato a partir das divergências do ADR 0014 e do modo de demonstração, escreveu o código, a migração e os testes; o Victor autorizou a fase.

## 06/11/2026 (sexta): Entrega 3 corrigida, com fontes públicas e o experimento da concentração

**Pedido do Victor:** "Entrega 3 primeiro".

**O que mudou no documento** (`docs/04-entrega-3-validacao.md`, PDF de 12 páginas):

- **Estado real em 06/11:** a interface está no ar só em modo de demonstração, com a tela completa do coordenador; o Gemini foi testado com o serviço real (6 de 6 leituras certas na comparação; nenhum dos 10 ataques obedecido); a apresentação é guiada; não houve entrevistas.
- **Concentração:** o resultado do experimento entra no resumo, no C5, na robustez, na matriz de riscos e nos vieses, com a figura nova. A exclusão por zona fica dita como aberta.
- **Fontes públicas (E.1):** `docs/resultados/premissas-comportamento.md` compara as premissas de comportamento com o que foi publicado. O único número acadêmico encontrado (BMJ Open, 2023) mostra 11,3% de turnos de médicos substitutos sem cobertura nos hospitais públicos ingleses, contra 5,4% no processo manual simulado. O plantão público de 12 h tem referência de R$ 1.500 (Fhemig, 2024). Distância e ofertas até o aceite seguem sem fonte. Cada número foi conferido na página original; o que não se confirmou (um percentual de vínculos de 2019 e uma reportagem de Goiânia, que não abriu) ficou de fora.
- **Caso de negócio (E.7):** V passa a ter a referência pública do plantão como ordem de grandeza, e o ROI ganha o cenário da taxa inglesa: cerca de 92 vagas descobertas por ano, e evitar metade delas pagaria o custo com V de R$ 1.000.
- **Experiência:** as três primeiras imagens da seção 4.2 passam a ser capturas da tela real; a do médico continua como wireframe.
- **Rastreabilidade:** A4-1 a A4-11 apontam a seção do documento que responde a cada exigência.
- **Script do PDF:** `scripts/gerar-pdf.sh` passou a usar um perfil próprio do navegador e a esperar o arquivo. Com o Edge aberto, ele anunciava o PDF antigo como novo.

**O que fica para o Victor:** revisar o documento e o PDF e autorizar o merge. O teste de usabilidade (E.2) e a comparação com o LightGBM (E.4) não foram feitos, e o documento diz isso.

**Uso de IA:** o Claude Code fez a busca das fontes, conferiu cada número na página original, redigiu as correções e gerou o PDF; o Victor revisa.

## 06/11/2026 (sexta): experimento contra a concentração das ofertas

**Pedido do Victor:** "Entrega 3 primeiro". O experimento da concentração (roteiro, passo 7.1) vem antes porque o documento o declarava não implementado e é o maior risco ético medido.

**O que foi feito:** `app/concentration.py` passa pelas 392 vagas de teste em ordem de publicação, com memória de quem apareceu no top-5 na última semana, e compara sete políticas: a ordem de hoje, rodízio entre equivalentes com margens de 5, 10 e 15 pontos, limite de 2 e de 4 aparições por semana e rodízio com limite. Todas usam os mesmos sorteios por vaga.

**Resultado (simulação):** em simulação, o rodízio entre elegíveis equivalentes (margem de 10 pontos) leva os 10% mais expostos de 82,1% para 35,7% das ofertas e de 50,7% para 28,5% dos lugares do top-5, com 1,8 ponto a menos de chance de sucesso e 2 minutos a mais por vaga. O critério de escolha, do grupo, é a maior redução perdendo até 2 pontos de chance. O limite sozinho perde mais chance para cortar menos, e somado ao rodízio acrescenta pouco. **A exclusão por zona quase não muda** (0,01 para 0,07): quem mora longe quase nunca fica perto da melhor chance, então segue aberta a medida contra ela.

**O que ainda não está feito:** a política não está na API (passo 7.2).

**Uso de IA:** o Claude Code desenhou e rodou o experimento e escreveu os testes; a margem de 5 pontos veio da regra de "chances parecidas" da tela do coordenador, e o critério dos 2 pontos fica para o Victor confirmar.

## 06/11/2026 (sexta): fase 1 fechada, com as onze decisões aprovadas

**Decisão do Victor:** "Aceito todas as recomendações e faça toda a fase 1."

**O que ficou decidido** ([ADR 0015](adr/0015-decisoes-que-destravam-o-mvp.md)): logins da demonstração com e-mail e senha, um coordenador e três médicos (D1); a API grava a justificativa da exceção (D2); pular, desfazer o pulo e "Esta explicação ajudou?" ganham rotas (D3); recusa com um dos quatro motivos, sem texto livre (D4), e sem desfazer, com confirmação antes (D5); prazo de 2 minutos por oferta na demonstração (D6); as telas consultam a cada 3 segundos (D7); a contestação ganha tabela, RLS e rotas (D8); a equidade mostra a simulação rotulada e a contagem do sistema (D9); a urgência passa a ser exigida (D10); e a base sintética fica como está, com o cenário calibrado ao lado (D11).

**O que mudou nos documentos:** o roteiro marca a fase 1 como feita e põe a fase 2 como próximo passo; o plano, os ADRs 0008, 0013 e 0014, a arquitetura, as fichas do banco, do n8n, da API e da web, a rastreabilidade (FB-5, A3-5 e A4-4), o README e o `CLAUDE.md` deixaram de tratar as decisões como pendentes. O PR #22, com o roteiro, entrou na `main` antes, com a CI verde.

**Uso de IA:** o Claude Code propôs as recomendações em 05/11 e registrou a decisão; o Victor decidiu.

## 06/11/2026 (sexta): o repositório inteiro alinhado às decisões do dia, e o início da fase 1

**Pedido do Victor:** "faça o merge final e atualize todo o GitHub com as novas decisões", e "vamos iniciar a fase 1".

**O que mudou:** cerca de 40 trechos ainda falavam da plateia usando o sistema, do QR code, do login anônimo ou das entrevistas como coisa por fazer. Os ADRs 0002, 0003, 0008, 0009, 0011 e 0014 ganharam uma nota de 06/11 no cabeçalho, e o corpo ficou como registro. A arquitetura, as fichas (servidor, n8n, banco, API, motor e web), segurança, dados em produção, o dicionário, o prompt e a direção de arte foram corrigidos. A página do telão deixou de prometer números ao vivo e QR code. Os textos gerados pela análise, pelo fluxo e pelo teste de premissas trocaram "só as entrevistas dirão" por "só dado real dirá", no código e no documento. A frase de custo da solução de IA ainda dizia que a demonstração usaria a camada paga do Gemini; agora diz que o projeto fica só na gratuita.

**Fase 1:** o Victor responde às decisões D1 a D11 do [roteiro](roteiro-ate-o-mvp.md#6-decisões-que-destravam-o-caminho).

**Uso de IA:** o Claude Code procurou e corrigiu as menções antigas; o Victor decidiu o rumo.

## 06/11/2026 (sexta): sem entrevistas, dados sintéticos o mais realistas possível

**Decisão do Victor:** "As entrevistas reais não irão acontecer no momento. Vamos ficar com dados sintéticos mesmo, tente ser o mais realista possível."

**O que muda**

- **A evidência do mundo real (FB2-1)** fica com fontes públicas. A composição dos médicos já foi comparada ao estudo Demografia Médica 2025. Falta o comportamento, que o estudo quase não cobre: aceite e recusa de convites, tempo até preencher, antecedência e distância. Onde não houver fonte, a premissa fica declarada, e a análise de sensibilidade mostra o quanto ela pesa.
- **O caso de negócio e os critérios de sucesso** usam números públicos e da simulação, em faixas, e não números de entrevista.
- **A promessa da Entrega 1** (3 a 5 coordenadores e 3 a 5 plantonistas) fica declarada como não cumprida. O kit de entrevistas fica para um piloto futuro.
- **Uma decisão nova (D11) no roteiro:** a fonte pública já mostrou dois erros do gerador, gênero na pediatria e médicos com 55 anos ou mais. A recomendação é manter a base e mostrar o cenário calibrado ao lado, porque trocar a base refaz o banco, as fixtures e todos os números.

**Uso de IA:** o Claude Code ajustou o roteiro, o plano e a rastreabilidade; o Victor decidiu.

## 05/11/2026 (quinta): roteiro até o MVP e a API 0.2.0 no servidor

**Pedido do Victor:** "monte um documento completo com tudo que ainda falta para o MVP final", e depois: "pode deixar sem datas. Quero só ter um documento para entender o todo e saber sempre o próximo passo."

**O que ficou pronto**

- **O [roteiro até o MVP](roteiro-ate-o-mvp.md):** onde estamos, o que é o MVP pronto, as dez fases em ordem, a trilha da Entrega 3, as onze decisões que destravam o caminho (cada uma com recomendação), o que só o Victor faz, o que fica fora e o que cortar primeiro. O próximo passo fica sempre na seção 1, e todo PR o atualiza.
- **A imagem 0.2.0 da API foi publicada no servidor, sem a chave do Gemini,** com o ok dele. Ela subiu saudável, `/health` responde de fora, a rota interna continua fechada e a memória ficou em 60 MiB. Ficaram cópias do Compose, do código e da imagem anteriores para voltar atrás.

**O que o levantamento mostrou:** as partes existem, mas ainda não conversam. A web roda só no navegador, a contestação não tem tabela nem rota, e o banco não publica nada em tempo real.

**Mudança de rumo (06/11):** "não vou fazer um teste com a plateia, vou fazer um teste guiado na apresentação. [...] Eu irei simular ao vivo sozinho." O roteiro foi refeito antes do merge: QR code, persona sorteada, login anônimo, telão ao vivo e carga com muita gente saíram do MVP. A entrada no sistema real passa a ser por logins da demonstração, um coordenador e três médicos, sem mudança de segurança no Supabase (D1). Ganharam lugar o roteiro da demonstração guiada e o risco de errar um passo conduzindo sozinho.

**Uso de IA:** o Claude Code leu as fichas, os ADRs, o plano e a rastreabilidade e montou o roteiro; o Victor decide as recomendações.

## 05/11/2026 (quinta): API pronta para o Gemini, sem gastos, e o primeiro teste real

**Pedido do Victor:** preparar a API para receber a chave do Gemini. Ele colocou a chave no `.env`, conferiu que o projeto está sem faturamento e decidiu: "Não quero ter gastos, use o que for free", e "vou usar só para demonstração no dia".

**O que o teste real mostrou, e os testes com clientes falsos não mostravam**

- **O limite de tempo de 8 s derrubava todas as chamadas.** O serviço recusa menos de 10 s ("Minimum allowed deadline is 10s"). A tela agora desiste em 6 s, e o pedido declara 10 s ao serviço.
- **O modelo que o ADR tinha escolhido quase não respondia:** o `gemini-3.5-flash-lite` acertou 3 de 12 pedidos, mesmo com 15 s entre eles. Medidos em revezamento, o `gemini-3.1-flash-lite` acertou 6 de 6, e os outros, de 0 a 1. É uma manhã só, mas a diferença decidiu a troca, e os dois são gratuitos.
- **Quando respondeu, respondeu bem:** no modelo escolhido, 14 de 16 chamadas tiveram resposta, com mediana abaixo de 1 s, e nenhum dos 10 ataques foi obedecido.

**Decisões**

- **Custo zero: camada gratuita, sem faturamento, e a chave no servidor só para o ensaio e o dia** (Victor). Isso substitui "camada paga na demo" do ADR 0003. Como o Google pode usar o conteúdo nessa camada, só texto sintético vai ao modelo: a plateia não alcança a leitura da vaga, que exige login de coordenador. O cliente também nunca vai ao Google Cloud, o caminho que cobra.
- **Uma chamada de conferência para o dia** (`--rapido`), porque uma manhã de medição não garante o dia 17/11.
- **Os motivos continuam no texto montado por regra**, salvo pedido explícito: cinco chamadas em fila atrasariam a tela e gastariam a cota.
- **Fica a `generateContent`, não a Interactions**, que o Google recomenda para projetos novos: ela segue com suporte total, e a outra guarda a conversa no servidor por padrão.
- **`nullable` saiu do esquema**, porque não está na lista de palavras que o SDK documenta.

**Ainda não feito:** publicar no servidor. A web também não chama a API, então nada disso aparece na demonstração até o adaptador `live`.

**Conferido:** testes da API, inclusive contra o SDK real com a rede trocada por um transporte falso, lint e a configuração final contra o serviço real. A memória da API com o pacote carregado só se mede no servidor, no ensaio.

**Uso de IA:** o Claude Code rodou o teste com a chave do `.env`, sem ler nem imprimir o valor, achou os problemas, comparou os modelos gratuitos e fez as correções; o Victor decidiu pelo custo zero e conferiu o faturamento.

## 05/11/2026 (quinta): tela do coordenador e a ordem das atividades

**Pedido do Victor:** "Alinha o passo a passo e a ordem das atividades. E comece pela tela do coordenador." O merge da plataforma web (PR #13), que ele tinha autorizado, saiu antes, com a CI toda verde.

**O que ficou pronto**

- **A ordem das atividades até 17/11** está no [plano](plano-etapa-3.md), com quem faz cada uma, a data e o motivo. As datas das fases no prompt de frontend eram de 03/11 e ficaram para trás.
- **Nova vaga:** escrever o pedido, ler, conferir campo a campo e publicar. O campo que falta vira pergunta, e a tentativa de injeção é sinalizada.
- **Sugestões:** a ordem sugerida com motivo, faixa de chance e alertas; "Ver motivos" com as barras e a ficha do modelo; "Quem ficou de fora" com a regra e a evidência; o diálogo de conferência; a justificativa de exceção; e o tracejado que fecha com o selo.
- **Os dois achados da revisão de ontem que eram desta tela foram corrigidos:** um nome pulado agora volta marcado e não pode ser aprovado, e entrada fora do contrato vira erro de domínio, com mensagem que a pessoa entende.

**Decisões e correções desta rodada**

- **Pular ficou reversível:** a trilha só cresce, então desfazer grava uma linha nova (`recommendation_restored`), em vez de apagar o pulo. O backend não tem essa ação: está nas divergências do [ADR 0014](adr/0014-estrutura-da-plataforma-web.md).
- **Caixas em vez de um botão por nome:** a API recebe uma lista em ordem, e a cascata precisa de mais de um nome. Nenhuma caixa vem marcada.
- **As barras de "Ver motivos" ganharam duas cores próprias:** o validador de paleta reprovou o cinza com o azul da IA no tema escuro.
- **Os testes acharam um erro de layout real:** com a letra a 200%, a tela passava 51 px da largura. A coluna do número apertava o texto, e o alerta não deixava a palavra longa quebrar.
- **A revisão visual nas capturas** corrigiu o botão "Pular" sozinho numa linha no celular, os links recuados e o nome aprovado, que não se destacava dos outros.

**O que falta, e o documento precisa dizer:** a tela roda no modo de demonstração e não chama a API nem o n8n. O adaptador `live` vem com a tela do médico. Por isso, o teste de usabilidade da Entrega 3 cobre só a tarefa do coordenador.

**Conferido:** 184 testes de unidade e de componente; 123 de jornada e acessibilidade, em 1440 e 390 px, com o `axe` nos dois temas (11 ignorados de propósito); lint, tipos, contraste e build de produção. Não houve teste com pessoas nem com leitor de tela real.

**Uso de IA:** o Claude Code propôs a ordem, escreveu as telas e os testes e revisou as capturas; o Victor definiu a prioridade e decide o merge.

## 05/11/2026 (quinta): revisão final antes do merge da plataforma web

**Pedido do Victor:** revisar o que foi feito nesta e nas outras sessões e fazer o merge final.

**O que a revisão achou e corrigiu**

- **A zona de residência dos médicos ia ao navegador** nas fixtures, embora a API e a RLS não a liberem e o próprio script dissesse o contrário. Saiu do contrato e das fixtures, e um teste barra a volta dela e dos outros atributos protegidos.
- **A limpeza de dados pessoais deixava passar nome em partes** ("Felipe Ferraz") **e texto colado com o acento em separado.** Os dois chegariam à trilha, que é só de inserção.
- **Uma justificativa feita só de um nome valia como exceção:** o mínimo de caracteres passou a contar o que sobra depois da limpeza.
- **"Sugestões aceitas" nunca saía do travessão**, embora a tela prometesse o número depois da decisão. Agora conta o que a pessoa decidiu na sessão.
- **Voltar do login perdia o filtro da lista**, porque o `proxy` guardava só o caminho.
- **As fixtures não eram conferidas na CI:** o job `poc` agora roda `exportar_fixtures_web.py --check`, e o `ruff` passa também em `scripts/`.
- **Documentos parados no tempo:** o README público ainda dizia "a API continua adiada", o guia da equipe dizia que não se construía API, n8n nem banco, e o plano dizia "n8n sem workflows". Os três foram atualizados.

**Ficam para as telas que usam cada recurso (UI-1 e UI-2):** o nome pulado ainda não volta marcado nas sugestões nem bloqueia a aprovação; entrada fora do contrato sai como `ZodError`, e não como erro de domínio; e o cabeçalho mostra o relógio fixo, o que só importa quando houver o controle que adianta o relógio.

**Conferido:** 141 testes de componente, a jornada de entrada no navegador (24 de 24) e lint, tipos e contraste. Na varredura do repositório inteiro, nenhuma chave real nem nome ou IP do servidor.

**Uso de IA:** o Claude Code revisou o trabalho das sessões, corrigiu o que achou e concluiu o merge que a sessão da web havia deixado pela metade. O Victor autorizou o merge final.

## 04/11/2026 (quarta): revisão de olhos novos da plataforma web

**O que aconteceu:** os agentes `designer-ui` e `revisor-frontend` leram a plataforma sem ter visto o processo e devolveram achados; este dia aplicou os que valiam, no mesmo PR (`f3/web-plataforma`), e corrigiu o que os testes mostraram.

**Mudanças na interface**

- **Texto sem jargão:** "ordem sugerida", "cinco primeiros", "Teste da aprovação"; a origem dos campos passou de "achei/deduzi" para "Está no texto", "Calculado do texto" e "Não está no texto".
- **Entrada em casca própria:** `/entrar` saiu do site público (route group `(entrada)`), com cabeçalho só de marca e Ajuda; as três portas sem ícone, na mesma altura.
- **Vagas começa pela lista**, com o resumo "Exigem a sua ação"; os indicadores levam "simulado" e a fonte dos tempos.
- **Acessibilidade (auditoria do agente, 17 achados, nenhum bloqueando o uso):** o foco voltando com Shift+Tab não fica mais sob o cabeçalho fixo (cabeçalho de uma linha no celular e `scroll-padding`); sem rolagem horizontal a 320 px e com a letra a 200%; a porta em destaque de `/entrar?papel=` vem primeiro no HTML; o filtro das vagas e a decisão do hero são anunciados em regiões de status; o item atual aparece em alto contraste; abas, alvos de toque, 404 com título e `h1`. Tudo virou teste (`e2e/acessibilidade.spec.ts`).
- **Hero** com 2 sugestões em vez de 5 (cabia na tela do celular) e "Como funciona" com trilho tracejado, contínuo e fino. Telão provisório em corpo de 28 px.

**Mudanças na camada de dados e na segurança**

- Aprovar a mesma lista de novo devolve a decisão já tomada (duplo clique não duplica a trilha); a geração é lida antes da espera, então reiniciar a demonstração no meio descarta a operação; o feedback da explicação passa pela mesma fila.
- Limpeza de dados pessoais mais larga (CRM com UF e "nº", telefone sem DDD, e-mail, CPF/CNPJ, números longos) sem tocar em datas, horários nem intervalos de anos; limite de 2.000 caracteres para o pedido e 1.000 para textos livres.
- `erros.ts` subiu para `lib/api` (os erros são do contrato). Cookie `secure` pelo protocolo real, `destinoSeguro` só com o papel exato e cabeçalhos de segurança (`nosniff`, `Referrer-Policy`, `Permissions-Policy`, `frame-ancestors 'none'`).
- ADR 0014 ganhou as **divergências conhecidas com o backend**; o README da demo passou a dizer que o hash encadeado detecta alteração mas não impede forja.

**Medidas:** Vitest 135 passando (138 depois da reconferência com a API, com os 3 testes de paridade com o backend); Playwright 64 passando e 8 ignorados de propósito, no build de produção; contraste (com os pares do telão em 7:1), fixtures (`--check`) e `ruff` limpos. O Lighthouse não foi repetido depois da revisão (a medida de 03/11 continua na ficha).

**Descobertas**

- Rodar a jornada contra o servidor de desenvolvimento derrubou 5 testes do computador por tempo (30 s); no build de produção, como na CI, passam todos. A medida que vale é a do build.
- **A API desfez 2 das 6 divergências e mostrou 10 novas:** a reconferência do ADR 0014 contra a API do PR #16 (rotas e `schemas.py`), as migrações e a RLS mostrou que as variáveis do candidato e o id da vaga já coincidem. Ficam abertas, entre outras: a aprovação não aceita justificativa (422); `reject` cancela a vaga inteira e não serve ao "pular"; a recusa de oferta só tem 4 motivos; o coordenador não lê a política nem a ficha do modelo (a RLS deixa só o admin); e a API só atende quem tem perfil, o que não casa com o login anônimo previsto. Nada disso mudou no backend; a lista, com a proposta de cada uma, está no ADR 0014. Na interface, faltava a ação `shift_uncovered` no contrato (a leitura da trilha falharia no `live`) e `Medico.zona` não existe sob a RLS (passou a ser opcional); um teste novo compara as listas fechadas da interface com o código Python.
- **Colisão de número de ADR, duas vezes:** a web tinha reservado "0010 em diante" para não colidir com o banco e a API, mas a API entrou na `main` (PR #16) justamente como ADR 0010. Renumerei os da web para 0011 e 0012, e horas depois o n8n (PRs #17 e #18) entrou com o 0012 e o 0013. Como os ADRs da web ainda não estavam na `main`, foram eles que mudaram de novo: ficaram 0011 (web responsiva, sem PWA, número que a `main` deixou livre) e 0014 (estrutura da plataforma). Número reservado não segura com sessões em paralelo; vale conferir `docs/adr/` da `main` antes de numerar e de novo ao mesclar a `main`.
- Uma medição de Lighthouse dá resultado inválido se algum servidor velho ficar na porta: a primeira saiu com acessibilidade 93 e `/entrar` com erro por isso.

**Uso de IA:** o Claude Code aplicou os achados dos dois revisores e escreveu os testes novos; o agente `acessibilidade` auditou o código final, e o Claude Code aplicou os achados e os cobriu com testes. O Victor aprova ou ajusta no PR; nada foi mesclado.

## 04/11/2026 (quarta): API pública do n8n fechada

**Pedido do Victor:** depois de ver o que implicava, "pode fechar" a rota `/api/v1` do n8n para a internet.

**O que foi feito:** a rota do editor passou a excluir `/api`, e o teste de contrato barra a volta dela. Antes de fechar, lemos o código da interface: lá, a rota só serve ao link da documentação e às telas de promoção entre ambientes, que esta instalação não usa.

**No servidor real:** só o n8n foi recriado. De fora, `/api`, `/api/v1/workflows` e `/api/v1/docs/` devolvem o `404` do Traefik, inclusive com chave. O editor, o login, a API de matching e o webhook interno da cascata seguem respondendo, e a execução que dormia continuou dormindo. O uso do editor já logado não foi testado pelo Claude Code, que não entra na conta do Victor.

**Uso de IA:** o Victor decidiu fechar. O Claude Code explicou as consequências, fez a mudança e conferiu no servidor.

## 04/11/2026 (quarta): workflow da cascata no n8n

**Pedido do Victor:** passar ao workflow da cascata. Ele perguntou se o Claude Code precisava da chave da API do n8n e, entre as duas opções para o n8n saber que uma oferta saiu, escolheu "API avisa o n8n".

**O que foi feito**

- O [ADR 0013](adr/0013-aviso-da-api-inicia-a-cascata.md) registra a decisão: a API avisa uma vez por vaga, no clique do coordenador, e o n8n só espera o prazo e pergunta. Quem decide continua sendo a API.
- O [workflow](../n8n/README.md) é um arquivo no Git, publicado pelo CLI do n8n, sem chave da API. A credencial nasce do `.env` do servidor, sem passar pelo chat.
- Testes de contrato amarram o workflow às ações da API e ao Compose, e barram nó de código, de LLM ou de banco.

**No servidor real (simulação):** com o prazo de teste em 2 min, 19 de 19 conferências, sem ninguém chamar `advance`. A oferta passou ao segundo médico 3 s depois do prazo, mesmo com o n8n reiniciado no meio da espera, e a vaga ficou descoberta quando ninguém respondeu. Numa vaga com recusa e aceite, o n8n encerrou o laço sem nova oferta. Um prazo de 60 min também terminou sozinho.

**Pendências:** decidir o prazo curto da demonstração, porque com os 60 min da rede simulada a plateia não vê a cascata andar. Muitas vagas ao mesmo tempo ainda não foram medidas.

**Uso de IA:** o Victor escolheu o desenho e autorizou publicar a API. O Claude Code escreveu o aviso, o workflow, os scripts, os testes e os documentos, publicou e conferiu no servidor.

## 04/11/2026 (quarta): editor do n8n na web

**Pedido do Victor:** "verifique o n8n, não consigo acessá-lo via web. o que houve?". Depois escolheu "Abrir na web" e pediu ajuda para entrar com login.

**O que foi feito**

- O n8n não tinha caído: estava no ar e saudável. O endereço público devolvia 404 porque o [ADR 0009](adr/0009-servidor-so-para-a-apresentacao.md) tirou a rota do editor, e o editor só abria por túnel SSH. A decisão era nossa, e ele não a tinha presente.
- O [ADR 0012](adr/0012-editor-do-n8n-na-web.md) abre o editor na web, só em HTTPS, e mantém webhook, formulário e MCP fora da internet. O login tem limite de tentativas por IP no Traefik, além do limite por e-mail que o próprio n8n já tem. O túnel SSH fica como reserva.
- O teste de contrato trocou "editor fora do Traefik" por seis testes novos, e o Compose novo foi validado no servidor, com o `.env` real, antes de aplicar.

**No servidor real:** só o n8n e o worker foram recriados (cerca de 12 s). De fora, a página abre por HTTPS, o cookie ficou seguro, os 7 caminhos de webhook, formulário e MCP respondem 404 e o limite barra a 6ª tentativa de login. O Victor relatou que conseguiu acessar.

**A correção do dia:** eu havia escrito que, depois da rajada, o login voltava a uma tentativa a cada 12 segundos. Os cabeçalhos das respostas mostraram dois limites: o do Traefik, por IP, e o do próprio n8n, de 5 por minuto por e-mail, que li no código da imagem. O ADR foi corrigido.

**Pendências:** o MFA do n8n (do Victor), a decisão de fechar `/api/v1` na rota pública e o workflow da cascata (`f3/cascata-n8n`), que depende de decidir como o n8n fica sabendo que uma oferta saiu.

**Uso de IA:** o Victor decidiu abrir o editor na web. O Claude Code diagnosticou, escreveu o Compose, os testes e os documentos e aplicou no servidor a pedido dele. Errou ao descrever o limite do login, e a medição corrigiu. O certificado visto desta máquina é o do antivírus, que intercepta o HTTPS, então o real foi conferido de dentro do servidor.

## 04/11/2026 (quarta): API de matching no servidor

**Pedido do Victor:** aprovou o plano da API com as decisões e os riscos ("Pode começar") e rodou o comando que cria os logins de teste.

**O que foi feito**

- A [API](../services/matching-api/app/api/README.md) em FastAPI, sobre o motor que já existia. A CLI e o núcleo continuam só com a biblioteca padrão, e um teste barra pacote de fora. As decisões estão no [ADR 0010](adr/0010-api-de-matching.md).
- A API nem carrega nome, CRM, telefone, atributo protegido, valor do plantão nem gabarito. Os pesos do modelo ficam em arquivo versionado, conferido com `model_registry` na subida.
- Uma migração pôs as ofertas na trilha. A cascata só chama quem está na aprovação gravada e refaz as regras antes de cada chamada.
- A API entrou no Compose, atrás do Traefik, com limite de requisições, sem porta publicada e com as rotas internas fora da internet.
- Os testes foram de 267 para 421. Abrimos 22 falhas de propósito, e hoje todas são acusadas.

**No servidor real (simulação):** 60 de 60 vagas iguais aos CSVs, lendo do banco real. 33 de 33 conferências no fluxo inteiro com login. Nenhuma chamada falhou na [medição de carga](resultados/metricas-carga-api.md).

**A descoberta do dia:** a primeira medição travou em 50 chamadas por segundo, com a CPU em menos de 30%. O que parecia limite do servidor era a chave do Supabase: a `sb_secret` tem esse teto, e a `service_role` passou de 900 por segundo no mesmo teste. Com a troca, a API chegou a cerca de 270 por segundo, e só então a CPU virou o limite. A causa do teto segue desconhecida.

**Pendências:** o workflow da cascata, as telas, o teste do Gemini com chave e a repetição da carga antes de 13/11, com as telas e os celulares.

**Uso de IA:** o Victor decidiu o escopo e aprovou o plano. O Claude Code escreveu o código, os testes e os documentos e fez a implantação. Os logins de teste e a limpeza do banco ficam com o Victor, porque o Claude Code não cria contas nem apaga dados no projeto real. A hipótese inicial do Claude Code para o teto, a de que a culpa era do ES256, estava errada, e a medição mostrou isso. Ele também corrigiu o que apareceu no caminho: o log do `httpx` registrava cada chamada ao banco com a URL inteira, e uma vaga sem elegíveis duplicaria as exclusões.

## 04/11/2026 (quarta): servidor na Hostinger

**Pedido do Victor:** "já quero usar a hostinger e tirar tudo da local", e depois: "vou usar só para apresentar o protótipo. Depois vou parar tudo". Ele escolheu a KVM 1 e criou o servidor com o modelo de n8n em modo fila.

**O que foi feito**

- Inspecionamos o servidor sem mudar nada. O [ADR 0009](adr/0009-servidor-so-para-a-apresentacao.md) registra as decisões, e a [ficha](../infra/README.md) tem como entrar, testes e limites.
- O modelo trazia 3 workers, fuso de Berlim, firewall desligado, editor aberto na internet e segredos escritos no arquivo do Compose. Agora são 1 worker, fuso de São Paulo, versões fixas, editor só por túnel SSH e segredos no `.env` do servidor.
- O Compose foi para `infra/`, sem segredos e sem IP, e o `make up` local saiu. Um teste de contrato barra porta nova, versão solta e segredo no arquivo.
- O n8n avisou que não suporta o Postgres 15 do modelo. Levamos o banco para o 17 enquanto só havia a conta de administrador, e as contagens bateram.
- A proteção do sistema (login só por chave, firewall e swap) está em um script, que o próprio Victor rodou.

**No servidor real:** um webhook temporário passou pela fila e foi executado pelo worker, em 0,14 s, e foi apagado depois. De fora, das 10 portas testadas, só 22, 80 e 443 respondem, por IPv4 e IPv6, o login sem chave é recusado e o endereço público do n8n devolve 404. A carga com 1 vCPU e um reinício do servidor ainda não foram testados.

**Uso de IA:** o Claude Code inspecionou, escreveu os arquivos e aplicou o Compose com o ok do Victor. A recomendação dele mudou no caminho: KVM 2, depois aceitar a KVM 1, depois o n8n simples, e de volta ao modo fila ao ver o que o servidor já tinha. A migração do Postgres não estava no plano aprovado e saiu do aviso do n8n.

## 04/11/2026 (quarta): carga dos dados sintéticos no banco

**Pedido do Victor:** carregar os dados sintéticos no projeto.

**O que foi feito**

- `python -m app.cli seed-db` gera um arquivo SQL com os 12 meses simulados, fora do Git. As datas andam 6 semanas, e o histórico termina em 12/11, cinco dias antes da apresentação, com os mesmos dias da semana.
- O gabarito do simulador fica de fora. O arquivo recusa um banco que já tenha dados e confere as contagens no fim.
- A avaliação refeita com as datas deslocadas bateu com as métricas publicadas: nenhuma mudou.
- A CI carrega os 12 meses pelo mesmo caminho do projeto real e repete os testes de RLS com os dados.

**No projeto real:** o Victor aprovou, e a carga entrou depois de a CI ficar verde. Pela API, todas as contagens bateram (16.547 linhas), e a tabela do gabarito não existe. De fora, com a chave pública, ler, gravar e chamar funções continuou recusado. O histórico vai até 12/11, então parte dos registros tem data no futuro até esse dia.

**Uso de IA:** o Claude Code escreveu o gerador, os testes e a conferência; a revisão é do Victor, no PR.

## 03/11/2026 (terça, à noite): plataforma web, prompt de frontend v2 e agentes de revisão

**Pedido do Victor:** fazer o frontend como uma **plataforma** (não um app), aberta no computador e no celular, com uma página inicial que apresente o produto e uma área de login para seguir com a plataforma funcional; buscar as skills de frontend e design, pegar referências na internet (nexunio.health), criar um prompt melhor do que o de exemplo e aplicá-lo na sessão, com agentes de revisão e de UX/UI, **sem interromper a sessão do banco de dados**.

**Decisões**

- **Isolamento:** o trabalho correu num worktree próprio (`C:\dev\plantaoseg-web`, branch `f3/web-plataforma`), sem trocar a branch do checkout da outra sessão. Os ADRs de web começaram em 0010 para não colidir com os do banco; em 04/11 foram renumerados para 0011 e 0014, porque a API (ADR 0010) e o n8n (ADR 0012 e 0013) entraram na `main` antes.
- **Prompt v2** em [`docs/design/prompt-frontend.md`](design/prompt-frontend.md), no lugar do v1: corrige o segmento (pronto-socorro de hospital privado, não UPA), o formato do CRM sintético, a 2.462 suspensa e a ordem de autoridade.
- **Metáfora de arte:** "rascunho a lápis, decisão a carimbo". A IA é tracejada, a pessoa é contínua com selo, a regra é cinza. A **voz segue a origem real**: como a leitura da vaga é por regras (o Gemini não foi testado), ela aparece em cinza, não como sugestão da IA.
- **Web responsiva, sem PWA** ([ADR 0011](adr/0011-web-responsiva-sem-pwa.md)) e **estrutura da plataforma** ([ADR 0014](adr/0014-estrutura-da-plataforma-web.md)): rotas por papel, sessão por persona sem senha, `PlantaoApi` com adaptador `demo` (fixtures do pipeline real) e `live` (depois).
- **Idioma do código:** domínio e tokens em português (glossário fixo), nomes técnicos genéricos em inglês (`Button`, `Dialog`), códigos do backend como estão. É uma exceção consciente à linha "identificadores em inglês" do prompt v1.

**O que ficou pronto:** landing com demonstração viva (saída real da PoC), entrada por persona, cascas do coordenador e do médico, "Minha conta e transparência" do médico, tela de Vagas com indicadores simulados, telão provisório, testes de componente, jornada e `axe` nos temas claro e escuro, e script de contraste dos tokens. Tudo o que depende de fases seguintes diz "esta tela chega na fase UI-n".

**Descobertas**

- A skill do Vercel dizia que o `proxy.ts` exporta `proxyConfig`; a documentação que vem **dentro do pacote** do Next.js diz `config`. Valeu a do pacote.
- Os cinco primeiros do ranking da demo real têm chances de 66% a 69%: a tela **diz** que a ordem entre eles é uma sugestão fraca, em vez de fingir precisão.
- A Atkinson Hyperlegible Next tem numerais tabulares (medido no navegador).
- Quatro subagentes em paralelo estouraram o limite de uso da API; a retomada foi um agente de cada vez.

**Uso de IA:** o Claude Code escreveu o prompt v2, a direção de arte, os componentes e os testes; um subagente gerou as fixtures a partir do pipeline Python; três agentes (`designer-ui`, `revisor-frontend`, `acessibilidade`) revisam de olhos novos. O Victor aprova ou ajusta no PR.

**Pendências para o Victor:** revisar texto e visual no PR; decidir se o prompt v2 substitui de vez o v1; combinar com a sessão do banco os contratos que a interface espera (campo `trecho` e o texto de `evidencia` das exclusões), registrados no ADR 0014.

## 03/11/2026 (terça): banco no Supabase

**Pedido do Victor:** começar o banco. Ele também avisou que a Hostinger ainda não foi comprada: quando for preciso, o Claude Code avisa, e os dois criam juntos o servidor e o n8n.

**O que foi feito**

- [Migrações](../supabase/README.md) com as tabelas do dicionário (v0.4), a trilha só de inserção com hash encadeado e as regras de acesso por organização e papel. O navegador só lê, e as colunas restritas ficam sem permissão.
- 100 testes em pgTAP, 9 de contrato em Python e um job novo na CI, que também carrega a amostra sintética e roda os alertas do Supabase.
- [ADR 0008](adr/0008-banco-no-supabase.md), com as decisões: regras em Python e papel e organização vindos do perfil, e não do JWT.

**O que a medição mostrou**

- Os dados gerados couberam em todas as restrições, mas o limite de 500 caracteres no texto da vaga caiu: o ataque `oversize` chega a 3.314.
- Desde 30/10 o Supabase não expõe tabelas novas automaticamente, então cada permissão é explícita.

**Uso de IA:** o Claude Code propôs as decisões e escreveu o SQL e os testes; a revisão é do Victor, no PR. Como tudo passou de primeira, abrimos 14 buracos de propósito para ver se os testes acusavam. Treze foram acusados, e o outro revelou um teste que faltava.

**No projeto real:** o Victor aprovou aplicar, e as migrações entraram. Com a chave pública, todas as tentativas de ler, gravar e chamar funções foram recusadas. Os alertas do Supabase apontaram uma função criada pelo painel, `rls_auto_enable`, com execução aberta a todos, que a CI não tinha como ver. A chamada de fora já falhava, mas a permissão foi fechada com uma quarta migração.

**Pendência:** carregar os dados, com o ok do Victor.

## 03/11/2026 (terça): contas novas e primeira página na Vercel

**Pedido do Victor:** conectar as contas novas de Supabase e Vercel, arrumar a Vercel "para ele funcionar" e criar a primeira página.

**Decisões do Victor**

- Criou as contas de Supabase e Vercel e o projeto `plantaoseguro`, em São Paulo. A Hostinger fica para depois.
- Preferiu arrumar a Vercel a pausá-la.
- Aprovou criar a primeira página. Novas telas, API, banco e n8n continuam esperando o ok dele ([ADR 0007](adr/0007-web-sai-do-adiamento.md)).

**O que foi feito**

- Clone fora do OneDrive e `.env` local, ignorado pelo Git, com os valores colados pelo Victor. A conferência das contas só fez leituras e não imprimiu nenhum valor. O token do Supabase enxerga só o projeto `plantaoseguro`, a senha do banco confere e o token da Vercel enxerga só o projeto `handson-plantaoseg`.
- A importação na Vercel tinha ficado com Python e `services/matching-api`, e cada push marcava falha no GitHub. O projeto passou para Next.js, `apps/web` e um Ignored Build Step. Os commits `6bb61e6` e `d3c8ff6` passaram de falha para `success`.
- [`apps/web`](../apps/web/README.md): Next.js 16.4.4 e Tailwind 4, com uma página provisória sem dados nem chaves. Entraram também um job de CI da web e os padrões de token da Vercel e do Supabase na varredura de segredos.

**Uso de IA**

- O Claude Code encontrou a causa da falha e primeiro recomendou pausar as implantações. O Victor pediu para fazer funcionar, e a recomendação mudou depois de ler a documentação oficial, porque pausar só esconderia o erro.
- O texto e o visual da página foram propostos pelo Claude Code e aguardam a revisão do Victor no PR. Uma animação da fita de obra saiu depois da conferência no navegador, porque podia aparecer pela metade.

**Pendências:** Hostinger, chave do Gemini e o ok para cada novo pedaço do protótipo. As prévias de PR pedem login na Vercel.

## 03/11/2026 (terça): exemplo do dicionário e dados em produção

**Pedido do Victor:** escrever a tabela do dicionário e o documento de dados em produção, respondendo aos dois outros pontos do feedback da Entrega 2.

**O que foi feito**

- [Exemplo concreto do dicionário](dados/dicionario-exemplo.md) (`app/datadict.py`, `make dicionario`): 18 variáveis com nome, tipo, papel, descrição, valores possíveis e o que aparece nos dados. A última coluna é calculada, e um teste regenera tudo a partir do gerador. O dicionário completo passou à v0.3, sem mudança de coluna.
- [Dados em produção](dados/dados-em-producao.md): de onde vem cada dado, como entra no piloto e depois, com que frequência se atualiza, a regra de qualidade, o responsável e o cuidado com dados pessoais; as integrações com CFM e CNES, lidas na fonte; o caminho do dado até o modelo; e as fases de implantação, com o limite do modo sombra.

**Rastreabilidade:** FB2-2 e FB2-3 viraram "feito", com o arquivo apontado. FB2-1 segue em andamento, porque depende das entrevistas.

**Ponto a validar:** o serviço do CFM só atende o usuário final, sem empresa intermediária. O contrato talvez precise ser do hospital, não da plataforma. Fica para o jurídico.

**Uso de IA:** o trabalho segue em conjunto. O Claude Code (Opus 5.5) gerou a tabela, redigiu o desenho e conferiu as fontes; a revisão do desenho e das fases fica com o Victor e o grupo.

## 03/11/2026 (terça): teste de premissas e simulação de lançamento

**Pedido do Victor:** colocar no repositório, com testes, o teste de premissas e a simulação de lançamento, que vieram da medição exploratória feita para o feedback da Entrega 2.

**O que foi feito:** `app/robustness.py`, `app/public_data.py` e `make robustez`, com resultado em [docs/resultados/metricas-robustez.md](resultados/metricas-robustez.md). A base continua idêntica: os checksums dos dados e as métricas publicadas não mudaram.

**O que os números dizem (simulação, 17 cenários):**

- O modelo supera o baseline nos 17, de +2,1 a +6,4 pontos no top-5. Essa conclusão resiste.
- A meta de reduzir 50% o tempo se sustenta em 14 dos 17 (de 42% a 63%). Essa depende das premissas.
- A concentração piora nos 17: precisa de mitigação, com qualquer premissa.
- O estudo Demografia Médica 2025 confirma a premissa de pediatras (44,7% contra 45%), mas mostra dois erros do simulador: 76,8% de mulheres na pediatria (usamos 50%) e 26,8% de médicos com 55 anos ou mais (usamos 15%). Pesam na auditoria de equidade, não no ranking.

**Correção em relação à medição exploratória:** na exploração, o modelo já parecia vencer no dia 7 (+2,2 pontos). Ela treinava com ofertas cujo resultado ainda não se saberia naquele dia. Com a regra certa, só ofertas de plantão já terminado, o modelo **perde** no dia 7 (114 ofertas, 2,5 pontos atrás) e vence a partir do dia 14 (252 ofertas). Isso reforça começar o lançamento pelo baseline. A avaliação principal tem a mesma folga na fronteira, em 75 de 6.259 ofertas, e o efeito é desprezível (AUC de 0,7623 para 0,7624): está nos limites do relatório, e os números publicados não mudaram.

**Uso de IA:** o trabalho segue em conjunto. O Claude Code (Opus 5.5) transformou a exploração em módulo testado, encontrou e corrigiu o vazamento do rótulo na curva e conferiu os agregados no PDF oficial do estudo.

## 03/11/2026 (terça): kit de entrevistas e revisão às cegas

**Pedido do Victor:** aplicar a proposta para os pontos do feedback da Entrega 2, sem tocar no protótipo. Esta é a parte mais urgente: os colegas precisam do roteiro para começar a entrevistar.

**O que foi feito**

- [Kit do entrevistador](entrevistas/LEIAME.md): convite, regras, termo, roteiros de coordenador e de plantonista, ficha de registro e a tabela que liga cada resposta à premissa que ela testa. Os números citados têm teste de sincronia com os resultados.
- Revisão às cegas (`app/blind_review.py`, `make kit-entrevistas`): 10 vagas simuladas, cada uma com a lista do modelo e a do baseline em ordem sorteada, sem nome nem CRM. É a forma mais barata de medir a meta da Entrega 1 de 60% de recomendações aceitas.
- O conversor de documentos ganhou dois marcadores: `<!-- bloco -->`, que não deixa um caso se dividir entre páginas, e `<!-- grande -->`, para as telas ficarem legíveis. Agora ele também resolve os links relativos a partir da pasta de cada documento.

**Por que a pergunta central é "quantos médicos você chama até alguém aceitar":** na simulação, o ganho de tempo do modelo é de 57% contra um coordenador que não confere a agenda, 27% contra quem já chama só quem pode ir e 7% contra quem já escolhe tão bem quanto o baseline. É a premissa que mais pesa, e só as entrevistas a resolvem.

**Ponto aberto, para o Victor:** confirmar com o professor, antes da primeira entrevista, que as conversas podem seguir como atividade da disciplina. A Res. CNS 510/2016 dispensa do sistema CEP/Conep a atividade de ensino sem finalidade de pesquisa, mas exclui dessa dispensa TCC, monografias e similares. A classificação não cabe ao grupo (seção 3 do kit; validar com jurídico).

**Uso de IA:** o trabalho segue em conjunto. O Claude Code (Opus 5.5) escreveu roteiros, código e testes a partir da proposta aprovada pelo Victor e conferiu a norma na fonte. A revisão dos roteiros e as conversas ficam com o grupo.

## 03/11/2026 (terça): feedback da Entrega 2 e pedido da Etapa 3

**Pedido do Victor:** registrar o feedback da Entrega 2 e a aula de hoje, e responder como resolver os pontos de melhoria.

**O que o professor disse:** gostou da estrutura no GitHub, de os dados sintéticos não serem apresentados como reais, do dicionário, das fontes em produção, do cuidado com qualidade e vazamento e do viés de seleção declarado. Deixou três "pontos a se pensar": a ausência de dados reais limita demonstrar que os padrões representam hospitais e médicos; falta um exemplo concreto do dicionário (nome, tipo, descrição e valores possíveis); e vale explorar como os dados seriam coletados, atualizados e integrados. O texto comenta só a parte de dados.

**O que a Aula 4 pede:** documento de 8 a 12 páginas em seis áreas (resultado técnico, resultado para o negócio, experiência, segurança e ética, implantação e critérios de sucesso no centro), com métricas numéricas e sem achismos. A pergunta central é "como saberemos, depois de 6 meses, se esse projeto deu certo?".

**O que foi feito:** [feedback na íntegra](feedback/2026-11-03-etapa-2.md); rastreabilidade com FB2-1 a FB2-4 e A4-1 a A4-12; [plano](plano-etapa-3.md) ajustado às seis áreas. Até este registro, nada do protótipo tinha sido construído: ele esperava as contas novas.

**Leitura adotada para o FB2-1:** a regra "só dados sintéticos" continua valendo. A evidência do mundo real vem de agregados públicos, entrevistas com números e revisão por coordenadores, sem nenhum registro individual; a análise de sensibilidade mostra o quanto as conclusões dependem das premissas; e o piloto em modo sombra é o caminho para dados reais na implantação. A medição exploratória foi feita fora do repositório e só entra com código e teste.

**Uso de IA:** o trabalho segue em conjunto. O Claude Code (Opus 5.5) registrou o feedback, leu a aula, mediu de forma exploratória e propôs o caminho; a decisão é do Victor.

## 02/11/2026 (segunda): plano do protótipo e da Etapa 3

**Pedido do Victor:** iniciar a continuação do projeto. Depois de ver a proposta, aprovou o plano e pediu para só publicá-lo, sem construir nada até passar as contas novas.

**Decisões do Victor**

- Contas novas de Supabase, Vercel e Hostinger, só deste projeto; contas de outros projetos não são usadas nem tocadas.
- Nada é construído antes de as contas chegarem: até lá, continua valendo o [ADR 0004](adr/0004-prototipo-adiado.md).

**O que foi feito:** o [plano](plano-etapa-3.md), com arquitetura, marcos M0 a M4, frentes da Etapa 3, o que depende do Victor, custos, verificação e riscos. Só documentação: nenhuma migração, API, tela, clone novo ou instalação.

**O que o levantamento mostrou**

- `apps/web`, `supabase/migrations` e `n8n/workflows` só têm `.gitkeep`; o motor da PoC é o que se reaproveita.
- A máquina local segue sem Docker, WSL e Supabase CLI, e o disco está apertado. Por isso o plano não usa Docker local: o banco fica na nuvem e a CI do GitHub roda o Supabase CLI.
- Só o Victor tem acesso ao repositório hoje; os convites aos colegas ainda não viraram acesso. Na Etapa 3, as entrevistas dependem deles.

**Uso de IA:** o trabalho segue em conjunto. O Claude Code (a partir de hoje, modelo Opus 5.5) levantou o estado do projeto e redigiu o plano; as decisões foram do Victor.

## 31/10/2026 (sábado), versão 2 do documento da Entrega 2

**Pedido do Victor:** conferir o que o feedback do professor pediu e se o documento é coerente com o pedido da Entrega 2; depois, melhorar muito o documento, preparar a nova versão para a entrega de hoje e deixar descrito que a sugestão dos dados foi dele e que o trabalho foi feito em conjunto.

**O que o batimento achou**

- **Metas:** das seis metas da Entrega 1, duas (antecedência e aceitação pelo coordenador) tinham sumido da tabela; a linha de base da jornada estava "n/d" apesar de medida (1,3%); o recall estava "Reformulada" sem dizer para quê.
- **Dica 1 do professor:** o documento não citava nenhuma das quatro dores da Entrega 1 (a rastreabilidade dizia que sim).
- **Ética:** só duas das quatro perguntas de Direito e Ética estavam respondidas de forma explícita, e faltava dizer que diagnóstico e prontuário ficam fora.
- **Normas:** faltavam, no PDF, a vigência de cada uma e a lista de pendências para o jurídico.
- **Concentração:** o documento só comparava o modelo com o baseline heurístico (61,2%); o processo manual simulado tem 31,1%. O modelo concentra mais.
- **Afirmações sem lastro:** "LightGBM e scikit-learn não mostraram ganho" (nunca foram testados); "71,2% com e sem a carga recente" (o código diz 71,2% sem e 71,3% com); a legenda da figura do fluxo dizia que só as etapas 2 a 6 rodam (rodam as 8).

**O que foi feito**

- `app/flow.py` e `make flow`: o fluxo recomendado contra o processo manual simulado (tempo, ofertas, antecedência e concentração), com as mesmas premissas de tempo do gerador, testes (176 no total) e uma etapa na CI. Resultado em simulação: tempo médio de 110 para 47 min (57% a menos), com 72% do ganho vindo do filtro de regras; antecedência +4,1 pontos (a meta de +20 é inalcançável sem prever vagas); concentração **piora** (31,1% para 50,7%, e até 82% se a cascata seguir a ordem).
- Documento reescrito, com 7 páginas: resumo e cartões de resultado, quatro dores, mapa do feedback, variáveis, "da análise à decisão", "por que IA e onde não" com o que se mediu, normas com vigência, quatro perguntas de ética, metas com linha de base e autoria em conjunto. O conversor ganhou cartões, caixas de destaque, figuras lado a lado e rodapé com páginas.
- Corrigidas as afirmações sem lastro, em `docs/03`, `docs/solucao-ia.md` e na ficha do componente. Novas linhas de rastreabilidade (`PI-`) para o que o professor valoriza nas aulas de 06/10 e 20/10.

**Uso de IA:** o trabalho foi feito em conjunto. O Victor pediu o batimento e definiu o rumo (melhorar o documento e deixar clara a autoria); a sugestão dos dados partiu dele. O Claude Code mediu, testou, redigiu e corrigiu. Os números novos saem de `docs/resultados/metricas-fluxo.json`.

## 30/10/2026 (sexta), merge dos PRs e tag `etapa-2`

**Pedido do Victor:** "Merge e tag": mergear os PRs #1, #2 e #3, nessa ordem, com commit de merge (não squash), conferindo a CI de cada um, e criar a tag `etapa-2` na `main`.

**O que foi feito**

- PR #1 (`518a230`), PR #2 (`4129c58`) e PR #3 (`9bfb67a`) mergeados, cada um com a CI verde antes do merge (4, 4 e 5 verificações).
- Tag anotada `etapa-2` no commit `9bfb67a`. A árvore da `main` é idêntica à da branch do PR #3, que passou nos 5 checks.
- Este PR (`f2/status-pos-merge`) só corrige o texto de status que ficou desatualizado: `CLAUDE.md`, plano da Etapa 2 e guia de postagem.

**CI da `main`:** estava na fila logo após o merge; conferida depois, as três execuções (`518a230`, `4129c58` e `9bfb67a`) terminaram com sucesso.

**Pendências do Victor:** envio no Moodle; aceite dos 3 convites e convite dos 2 colegas restantes; proteção da `main` (só com o ok dele); validação jurídica das normas; teste do Gemini com chave; vídeo da aula não transcrito.

**Uso de IA:** o Claude Code (Sonnet 5.5) executou os merges e a tag a pedido explícito do Victor, conferindo a CI antes de cada merge.

## 30/10/2026 (sexta), execução: PoC mínima e documento da Etapa 2

**Pedido do Victor:** "faça os dois, execute e documente tudo para postagem da etapa 2" (PoC mínima executável e o material da opção sem executável).

**O que foi feito**

- PoC mínima em Python de biblioteca padrão: gerador de dados, regras de jornada, variáveis sem vazamento, baseline e regressão logística, explicação, extração com guardrails, trilha com hash e CLI (ADR 0005). Testes e lint passam; a CI roda a PoC em Linux e reproduz os checksums dos dados da máquina do autor.
- Material de especificação: solução de IA, exemplo trabalhado, wireframes, ameaças e ficha de risco, plano do teste manual do Gemini.
- Documento da Etapa 2 em Markdown e PDF de 6 páginas, com guia de postagem.
- Dicionário de dados passou a v0.2 (ajustado ao que foi construído).

**Resultados (simulação):** o modelo ganha 3,5 pontos percentuais sobre o baseline no top-5 (71,2% contra 67,7%; oráculo 75,8%); os 10% mais recomendados ocupam 50,7% dos lugares; zonas distantes quase não são recomendadas.

**Achados que mudaram decisões**

- A primeira simulação não tinha violações de jornada no histórico manual; foram acrescentadas as "dobras" e a taxa medida foi de 1,3%.
- O modelo dava peso positivo à carga recente (confundimento) e a explicação citava "fez 9 plantões" a favor do candidato. Experimento: sem a variável o top-5 não muda (71,2%). Ela virou alerta de jornada.
- O texto ambíguo do gerador errava o período; a extração não reconhecia "ter" como terça-feira.
- **Normas:** o texto oficial da Res. 2.462 traz aviso de suspensão judicial integral (a Entrega 1 a trata como em vigor); a Res. 2.460 cita plataformas digitais; a classificação de risco da 2.454 deve ser reavaliada de baixo para médio. Tudo a validar com jurídico.

**Pendências:** merge dos PRs #1 a #3 e tag `etapa-2` (Victor); envio no Moodle; teste do Gemini com chave; vídeo da aula não transcrito; convites dos colegas ainda pendentes.

**Uso de IA:** o Claude Code (Sonnet 5.5) escreveu código, testes e documentos; as decisões de escopo foram do Victor. O Gemini não foi exercitado.

## 30/10/2026 (sexta): segmento ajustado para pronto-socorro de hospitais privados

**Decisão do Victor:** o segmento da PoC passa de "UPA e pronto-socorro" para **pronto-socorro de hospitais privados**; seguem plantão noturno de 12 h, fim de semana, clínica médica e pediatria.

**O que mudou:** [ADR 0001](adr/0001-segmento-inicial.md), `CLAUDE.md`, plano da Etapa 2, rastreabilidade (FB-1), subagente `engenheiro-dados` e o [dicionário de dados](dados/dicionario-de-dados.md), que passa a v0.1 (rede de hospitais privados, unidades `PS` com `ownership = privado`, nomes e exemplo fictícios).

**Correção de honestidade:** o ADR dizia que noite e fim de semana "são os que mais ficam descobertos"; não há dado para afirmar isso. Passou a **hipótese a validar nas entrevistas**.

**A lembrar no `docs/03`:** a evidência pública da Entrega 1 (Canoas) é de unidade municipal; para hospitais privados a evidência é a da Flexzo (alegação da empresa) e as entrevistas, ainda por fazer. A contratação de médicos em hospital privado é ponto sensível: validar com jurídico.

**Estado do GitHub em 30/10:** PRs #1 e #2 abertos com a CI verde, `main` só com a Entrega 1, 3 convites pendentes de aceite. Não há decisão registrada para os portões G1 (dicionário) e G-P (forma da PoC) do plano.

**Uso de IA:** o Claude aplicou a troca nos documentos e apontou a frase sem base; o Victor decide.

## 28/10/2026 (quarta), G0 aprovado

**Decisão do Victor:** aprovou o plano v2 e os ADRs 0001 a 0004 (segmento inicial, escopo da PoC, Gemini e protótipo adiado) e pediu o dicionário de dados v0 na branch `f1/dicionario-dados`.

**Ainda pendente do G0 (ações do Victor):** merge do PR #1, convites aos colegas, proteção da `main`, usuários do GitHub e donos das frentes A1 a A5, chave do Gemini. Eu não faço merge nem mexo em configurações do GitHub sem o ok explícito.

**Feito:** [dicionário de dados v0](dados/dicionario-de-dados.md) na branch `f1/dicionario-dados`, aguardando o G1. Define 11 tabelas do núcleo, o papel de cada coluna (ranking, auditoria de viés, restrito econômico, dado pessoal simulado), as 9 variáveis do ranking idênticas ao `features.py`, as premissas do simulador, as regras de qualidade e 8 decisões para o Victor.

**Convites no GitHub (28/10):** 3 pendentes de aceite e 2 colegas ainda sem convite.

**Uso de IA:** o Claude redigiu o dicionário a partir de `docs/02`, do ADR 0001 e do `features.py`; os parâmetros do simulador são premissas dele, sem fonte, e o Victor decide no G1.

## 28/10/2026 (quarta), mais tarde: LLM vira Gemini e protótipo adiado (plano v2)

**Decisões do Victor**

- O LLM **do produto** passa a ser o **Gemini**, não o Claude ([ADR 0003](adr/0003-llm-do-produto-gemini.md)). O Claude Code segue como ferramenta de desenvolvimento do grupo.
- O **protótipo não será construído ainda** ([ADR 0004](adr/0004-prototipo-adiado.md)). A Etapa 2 começa por Dados, Análise e Solução de IA; a forma da PoC é decidida no portão G-P.

**O que foi feito**

- Modelos, preços, saída estruturada, SDK e termos de dados do Gemini conferidos nas páginas oficiais do Google (28/10/2026). Achado importante: na camada **gratuita** o Google usa o conteúdo para melhorar produtos e revisores humanos podem lê-lo; como a plateia digita texto livre na demo, a demo usa a camada **paga**.
- Atualizados `docs/02` (ferramentas, custo de US$ 36–42 para US$ 34–41, riscos, plano de construção), README, `.env.example` (`GEMINI_API_KEY` e IDs dos modelos), subagente `engenheiro-ia`, `CLAUDE.md` (regra "protótipo adiado" para os Claude Codes dos colegas), guia da equipe, rastreabilidade e a CI (padrão de chave `AIza...`).
- Plano da Etapa 2 reescrito (versão 2): frentes A1 a A5, portão G-P e três opções de PoC.

**Risco registrado:** a PoC é um dos 4 entregáveis do professor; sem artefato executável até 31/10 a nota da Etapa 2 sofre.

**Uso de IA:** o Claude conferiu a documentação do Gemini e redigiu os ADRs e o plano v2; o Victor decide. A leitura das páginas do Google foi feita por uma ferramenta de busca e resumo, então IDs e preços devem ser reconferidos ao implementar.

## 28/10/2026 (quarta), à noite: documentação contínua, equipe e plano da Etapa 2

**Pedido do Victor:** documentar tudo enquanto se faz (código, como foi feito, ferramentas), explicar cada passo antes de executar para ele aprovar, preparar a entrada dos 5 colegas (cada um com Claude Code) e montar o plano da Etapa 2.

**O que foi feito**

- A CI do PR #1 passou nas 4 verificações no GitHub (segredos, ruff e pytest, neutralidade econômica e Compose): é a primeira evidência real de pytest, ruff e `docker compose config`.
- Política de documentação contínua no `CLAUDE.md`, com ficha do componente ([modelo](templates/ficha-componente.md)) e itens novos no modelo de PR.
- [Guia de entrada da equipe](CONTRIBUINDO.md) e [plano da Etapa 2](plano-etapa-2.md) com 6 frentes, portões de aprovação (G0 a G4) e metas com linha de base. Plano é **proposta**, aguardando o Victor.
- Nome de branch passou de "uma por fase" para "uma por tarefa com prefixo da fase" (`f1/...`), porque seis pessoas trabalham em paralelo e o Git não aceita `fase-1` e `fase-1/x` juntos.
- Correção: o dia 28/10/2026 é quarta-feira (a entrada abaixo dizia terça).

**Estado do repositório no GitHub:** público; `main` sem proteção; só o Victor é colaborador. Pendências do Victor: convidar os colegas e proteger a `main`.

**Uso de IA:** o Claude redigiu o guia, o plano e a política de documentação; o Victor aprova ou ajusta.

## 28/10/2026 (quarta): Fase 0, base do repositório

**Quem fez:** Victor, com o Claude Code (modelo Sonnet 5.5) como parceiro de engenharia.

**O que aconteceu**

- Repositório clonado em `handson_plantaoseg`; branch `fase-0-base` aberta a partir da `main` (commit `d38ff27`).
- Lidos: README, Entrega 1, arquitetura, slides das aulas de 20/10 e 27/10, o prompt inicial e o kickoff.
- Feedback do professor sobre a Entrega 1 salvo na íntegra e transformado em linhas de rastreabilidade (FB-1 a FB-5), mais as exigências dos slides de 27/10 (A3-1 a A3-13).
- Criadas as decisões [ADR 0001](adr/0001-segmento-inicial.md) (segmento inicial) e [ADR 0002](adr/0002-escopo-da-poc.md) (escopo da PoC); ambas aguardam confirmação do grupo.

**Descobertas**

- O professor pede quatro entregáveis na Etapa 2: **Dados, Análise, Solução de IA e PoC**. O prompt inicial não previa "Análise" como seção própria; foi incluída.
- O professor exige uma seção curta de **Cybersecurity** (dados, dados pessoais, onde ficam, quem acessa, ameaças e proteções).
- Ambiente da máquina do Victor: sem Docker, Node, make, Supabase CLI e ffmpeg; o Python de `C:\Python312` está incompleto (sem biblioteca padrão nem pip). Nada disso pôde ser executado hoje. A CI do GitHub passa a ser a evidência de testes até o ambiente local ser instalado.
- O vídeo da aula de 27/10 não foi processado por falta de ferramentas.
- A Entrega 1 (seção 15) ficou com o marcador `[preencher papéis do grupo]` sem preencher; não alteramos o documento já entregue.

**Uso de IA no planejamento:** o Claude propôs o recorte do segmento (ADR 0001) e a divisão núcleo/apoio/evolução (ADR 0002) a partir do feedback; o grupo confirma ou ajusta.

**Pendências para o grupo**

- Confirmar os ADRs 0001 e 0002.
- Instalar Docker Desktop, Node LTS, Python 3.12, Supabase CLI e make (ver `make doctor`).
- Colar as anotações da aula de 27/10, ou liberar a instalação de ffmpeg e Python para transcrever o vídeo.
