# Roteiro da demonstração (5 minutos, ao vivo)

Fase F do [roteiro até o MVP](../roteiro-ate-o-mvp.md) (itens 5.1 a 5.4). É o slide 7 da apresentação de 17/11/2026: o Victor conduz sozinho, no papel de coordenador e de médico, e a plateia assiste. **Tudo é simulação com dados sintéticos.**

> **O que está conferido e o que não está.** A vaga escolhida e a ordem dos médicos foram calculadas com o mesmo motor, os mesmos dados e os mesmos pesos da API, com o banco limpo (script [`vaga-da-demonstracao.py`](../../scripts/vaga-da-demonstracao.py)), e a ordem se manteve em todos os horários testados de 14 a 17/11. Os rótulos dos botões vêm do código da web. **Não foi percorrido no sistema real**, porque os logins são só do Victor: o primeiro ensaio (seção 8) é quem confirma.

## 1. A cola de bolso

| | |
| --- | --- |
| **A vaga** | `Preciso de um pediatra para o plantão noturno de quarta, 19h às 7h, Hospital Modelo Centro, urgência alta.` |
| **Quem aprovar** | Os três médicos com login, **que aparecem em 2º, 4º e 5º**: Felipe Ferraz Siqueira, Felipe Barros Tavares e Olívia Ibarra Nogueira. Não marcar o 1º nem o 3º. |
| **Quem faz o quê** | O **1º da cascata (Felipe Ferraz) recusa** com "Agenda". O **2º (Felipe Barros) aceita**. A Olívia fica na fila, sem receber. |
| **Janelas** | Navegador normal: coordenador. Janela anônima do mesmo navegador: Felipe Ferraz. Outro navegador (ou o celular): Felipe Barros. **Duas abas do mesmo navegador viram o mesmo papel.** |
| **Tempo** | 5:00, sem esperar prazo nenhum: o prazo da oferta é de 2 minutos, e a recusa e o aceite chamam o próximo na hora. |
| **Se falhar** | Mais de 10 segundos sem resposta: **troque para o modo de demonstração e siga**. Não conserte ao vivo (seção 6). |
| **Antes do dia** | `limpar-demonstracao` (seção 2). Sem isso, o rodízio muda a ordem. |

## 2. O estado de partida (5.2)

O rodízio entre equivalentes ([ADR 0017](../adr/0017-rodizio-entre-equivalentes-na-api.md)) conta quantas vezes cada médico apareceu no top-5 nos últimos 7 dias. Os ensaios e as conferências das fases C e D contam, e **mudam a ordem da vaga do roteiro**. Por isso o banco começa limpo.

**Na véspera (16/11) e na manhã de 17/11, depois do último ensaio:**

```
py -3.12 scripts/usuarios-de-teste.py limpar-demonstracao --env C:\dev\handson_plantaoseg\.env
```

Apaga só o que o coordenador da demonstração publicou (vagas, recomendações, ofertas e contestações). **A trilha de auditoria fica**: ela é só de inserção. Por isso, na demonstração, a auditoria se abre **filtrada pela vaga** (`?vaga=`), e não a trilha inteira.

Em seguida, conferir que a ordem é a esperada, com o agora do dia:

```
py -3.12 scripts/vaga-da-demonstracao.py --agora 2026-11-17T09:00
```

A saída esperada é `serve` e `2: Felipe Ferraz Siqueira | 4: Felipe Barros Tavares | 5: Olívia Ibarra Nogueira`. Se não for, use `--buscar`: entre os próximos 7 dias, as vagas em que os três aparecem no top-5 são a **sexta, 20/11** (nas posições 2, 4 e 5), o **domingo, 22/11** (3, 4 e 5) e a **segunda, 23/11** (1, 3 e 4), todas no Hospital Modelo Centro. Troque só o dia no texto da vaga ("sexta", "domingo" ou "segunda") e **marque sempre os três nomes com login, seja qual for a posição**.

**Por que essa vaga:** o Centro é onde os três moram perto, e só ali eles aparecem entre os cinco primeiros (em 84 combinações de unidade, especialidade, dia e período testadas, são 4). Nos outros hospitais, a cascata cairia em médicos sem login, e a demonstração esperaria 2 minutos de prazo.

**Checagens de véspera e do dia:**

- [ ] A API responde (`/health`), o n8n está ativo e a página abre no link público.
- [ ] Os quatro logins entram (o coordenador e os três médicos). As senhas ficam com o Victor.
- [ ] A chamada única ao Gemini responde (`avaliacao --rapido`, em [teste-manual-gemini.md](../teste-manual-gemini.md)). Se demorar, o roteiro segue: a leitura sai pelas regras.
- [ ] O prazo da oferta é de 2 minutos na rede simulada (a migração de 06/11 já o fixou; o comando `prazo` só mexe na organização de teste).
- [ ] O modo de demonstração abre e percorre o caminho. **Não há vídeo gravado do plano B** (a fase G foi dispensada em 13/11): o plano B é o modo de demonstração.

## 3. A janela de cada pessoa (5.3)

O cookie de sessão vale para o **navegador inteiro**, e não por aba. Três papéis pedem três sessões separadas:

| Papel | Onde | Como |
| --- | --- | --- |
| **Coordenador** | Edge, janela normal, no computador projetado | `/entrar` com o e-mail e a senha do coordenador |
| **Felipe Ferraz Siqueira** (recusa) | Edge, **janela InPrivate** | `/entrar` com o login do médico 1 |
| **Felipe Barros Tavares** (aceita) | **Outro navegador** (Chrome) ou o celular | `/entrar` com o login do médico 2 |

**Faça os três logins 10 minutos antes** e deixe cada um na tela inicial do seu papel. As janelas ficam abertas lado a lado na barra de tarefas; use `Win+1`, `Win+2`, `Win+3` para alternar, e **nunca clique em "Sair"**. No celular, a tela só é projetada se o grupo tiver espelhamento testado; se não tiver, use o Chrome no computador, que é mais seguro.

Antes de começar: notificações do sistema desligadas, zoom do navegador em 110%, barra de favoritos escondida, e os dois temas conferidos (o claro projeta melhor).

## 4. O passo a passo, com tempos (5.1)

Cada passo mostra o **clique exato**, **o que dizer** (uma frase) e **o que a plateia vê**.

| Tempo | Janela | O que fazer | O que dizer | O que a plateia vê |
| --- | --- | --- | --- | --- |
| **0:00** | Coordenador | No menu, **Nova vaga**. Colar o pedido e clicar em **Ler a vaga**. | "A coordenadora escreve do jeito que fala." | Os cinco campos, cada um com a origem: **Está no texto**, **Calculado do texto** ou **Não está no texto**, e a marca "Leitura pela IA" (Gemini) ou a de regras. |
| **0:45** | Coordenador | Conferir os campos e clicar em **Confirmar e ver as sugestões**. | "A IA lê, e a pessoa confere antes de seguir." | Nada é publicado sem esse clique. |
| **1:00** | Coordenador | Na lista: abrir **Ver motivos** no 2º nome, mostrar **Quem ficou de fora** (a regra de cada excluído) e a faixa de chance. | "Cada nome tem um motivo, e cada excluído mostra a regra que o barrou." | Contorno **tracejado** (a IA sugere), motivos legíveis e a regra do excluído, com pseudônimo. |
| **1:45** | Coordenador | **Marcar** o 2º, o 4º e o 5º nome (os três com login) e clicar em **Aprovar e oferecer**. No diálogo, conferir e confirmar. | "Eu escolho quem eu quero chamar. O sistema sugere, não decide, e sem esse clique nenhuma oferta sai." | O diálogo de conferência; ao confirmar, o tracejado fecha, o selo assenta e a vaga vai para **Oferta em andamento**. |
| **2:15** | Felipe Ferraz | **Ofertas**: a oferta com o **prazo andando** e o **"Por que você"**. Clicar em **Recusar**, escolher **Agenda** e confirmar. | "O médico também entende por que foi chamado, e recusa com um motivo, sem texto livre." | O prazo em segundos, o motivo e os quatro motivos de recusa. |
| **2:55** | Coordenador | Voltar à vaga: a seção **Cascata de ofertas**. | "A recusa já chamou o próximo, sem ninguém olhar o relógio." | Felipe Ferraz **recusada (Agenda)**, Felipe Barros **oferta aberta**, Olívia **na fila**. A tela se atualiza a cada 3 s. |
| **3:10** | Felipe Barros | **Ofertas**: abrir a oferta e clicar em **Aceitar o plantão**, depois confirmar. | "Aceitou, a vaga fecha." | A oferta aceita. No coordenador, a vaga **preenchida**. |
| **3:40** | Coordenador | **Auditoria**, aberta pela vaga (`?vaga=`). Clicar em **Verificar a cadeia**. | "Cada passo ficou numa trilha encadeada por hash: a IA, a aprovação, a recusa, o aceite." | A trilha da vaga, do mais novo ao mais antigo, e o resultado "íntegra". |
| **4:10** | Felipe Ferraz, depois Coordenador | (**cortável**) Na oferta recusada: **Contestar a recomendação**, motivo **A ordem me parece injusta**, uma frase de texto. No coordenador: **Contestações** → responder. | "O médico pode pedir revisão humana, e a resposta fica registrada." | O protocolo `CT-…`, o relato, a resposta e a linha nova na trilha. |
| **4:50** | Coordenador | (**se sobrar**) **Equidade**, só mostrar. | "Concentração e disparidade, medidas em dados sintéticos." | Os rótulos de simulação. |

**Total: 5:00.** Se o relógio do slide 7 passar de 5 minutos, **corte a contestação e a equidade**. Nunca corte a recusa nem o aceite: são eles que mostram a cascata.

**O que dizer se perguntarem por que o 1º nome ficou de fora:** "A decisão é do coordenador. Ele pode saber de algo que o sistema não sabe. É por isso que a aprovação é humana." (Os nomes 1 e 3 não têm login; nunca diga isso.)

**O "deixa passar" só existe no plano B.** No sistema real, deixar a oferta vencer custa 2 minutos de espera. Diga a frase em voz alta ("se o médico não responde em 2 minutos, o n8n chama o próximo") e mostre o caso no modo de demonstração, se perguntarem.

## 5. O que o Gemini pode fazer nesse passo

O primeiro passo chama o Gemini. Em 13/11, de 56 respostas, 16 passaram de 6 s ([avaliação](../resultados/metricas-extracao.md)). **Isso não derruba o roteiro**: a tela desiste em 6 s e lê o pedido pelas regras, e o pedido do roteiro é um texto que as regras leem certo. O que muda é a marca de origem (regras em vez de IA). Não comente a demora: diga "a leitura pode sair por regras quando a IA demora, e o coordenador confere do mesmo jeito".

## 6. Se algo falhar (5.4)

**Regra de ouro:** passou de **10 segundos** sem resposta, ou a tela mostrou erro, **troque para o modo de demonstração e siga**. Não tente consertar ao vivo, não peça desculpas, não explique a infraestrutura. Uma frase: "Vamos pelo plano B, que faz o mesmo caminho sem o servidor."

| O que acontece | O que fazer |
| --- | --- |
| `/entrar` não abre, ou o login falha | Plano B desde o início (abaixo). |
| **Ler a vaga** sem resposta em 10 s | Usar o formulário rápido que a tela mostra, ou ir ao plano B. |
| A lista não traz os três nomes onde se esperava (a ordem mudou) | **Não aprove outros nomes**: as ofertas cairiam em quem não tem login. Plano B. |
| A oferta não aparece para o médico em 10 s (a tela consulta a cada 3 s) | Recarregar a página do médico uma vez. Se não aparecer, plano B. |
| A recusa não chama o próximo | Plano B. (O n8n só entra quando o prazo vence, então uma falha nele **não** afeta este roteiro.) |
| A verificação da cadeia mostra lacuna | Dizer "a trilha é uma só para o banco inteiro; os registros de outra organização viram lacuna, dita na tela" e seguir. |
| A contestação falha | Pular. Ela é opcional. |
| Uma janela virou o papel errado | Foi o cookie: usar outra janela anônima ou outro navegador e refazer o login. |

**O plano B no modo de demonstração (numa aba só):**

1. Em `/entrar`, clicar no link discreto **Usar o modo de demonstração**.
2. Na porta do coordenador, **Nova vaga**: **use um dos exemplos** (por exemplo, **Informal, com erros de digitação**) e não o texto digitado. Em demonstração, a lista vem de uma grade já calculada, e um texto fora dela pode não ter sugestão.
3. **Aprovar e oferecer**, como no roteiro.
4. Entrar como o médico que tem a oferta (a porta o mostra primeiro, com "Tem oferta esperando resposta") e recusar. No coordenador, a cascata chama o próximo.
5. **Passar o prazo desta oferta** faz o papel do n8n: serve para mostrar o "deixa passar".
6. O relógio da demonstração é quinta, 01/10/2026, 9h, e a vaga é outra; **os nomes e o caminho são os mesmos do real**. Diga: "A demonstração roda sem o servidor, com os mesmos dados."

**Não há vídeo do plano B.** O modo de demonstração roda no navegador, sem o servidor, mas ainda precisa que o site abra: sem internet nenhuma, não há plano B. Leve o roteiro no papel e, se for preciso, conte o caminho em voz alta.

## 7. O que ainda não foi feito

- **O ensaio no sistema real** (seção 8): precisa dos logins do Victor.
- **A limpeza do banco no dia** (fase H). Sem vídeo do plano B: a fase G foi dispensada em 13/11.
- **A conferência das fases C e D** com o login, que continua pendente: a cascata e a auditoria só foram vistas por teste, e o roteiro depende das duas.

## 8. O ensaio

**Primeiro ensaio (sem relógio):** percorrer a seção 4 uma vez, conferindo cada rótulo contra a tela. Anotar qualquer clique que não bata e qualquer frase que não saia natural. É aqui que se confirma que os três nomes aparecem em 2º, 4º e 5º **no sistema real**. Depois, `limpar-demonstracao`.

**Segundo e terceiro ensaios (com relógio):** 5:00 no total, em voz alta, com a janela projetada e alguém do grupo fazendo uma pergunta no meio. Depois de cada um, `limpar-demonstracao` e a conferência do script.

**O que registrar a cada ensaio:** o tempo de cada passo, o ponto em que algo falhou e se o plano B foi acionado a tempo.

**Pronto quando:** o Victor percorre o roteiro inteiro, sozinho, sem consultar ninguém, e o relógio fecha em 5 minutos.
