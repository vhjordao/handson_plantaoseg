# Direção de arte da plataforma PlantãoSeguro

- **Responsável:** Victor Jordão com o Claude Code · **Branch:** `f3/web-plataforma` · **Data:** 03/11/2026, revisada em 04/11/2026
- **Status:** plano de 03/11, com revisão contra o padrão genérico (seção 3). **Revisado em 10/11/2026 na fase E (seção 6):** cores, raios, sombras e tipografia mudaram; as três vozes continuam. Onde a seção 6 diverge das anteriores, vale a seção 6. Valores de cor e de tipo são os **finais** quando constam em `apps/web/lib/tokens/cores.ts`; o script `npm run check:contraste` confere os contrastes.
- **Fontes:** [prompt v2](prompt-frontend.md) (regras), [referências](referencias.md) (o que foi visto e por quê) e a skill `frontend-design` (processo de duas passagens).

## 1. Conceito: rascunho a lápis, decisão a carimbo

A plataforma tem um trabalho que nenhum painel de saúde genérico tem: **mostrar, em cada tela, quem falou**. A IA escreve a lápis, e uma pessoa carimba. É a supervisão humana da Res. CFM 2.454 (a validar com jurídico) transformada em forma visível.

| Voz | Forma | Cor | Rótulo e ícone | Exemplo |
| --- | --- | --- | --- | --- |
| **Sugestão da IA** | Contorno **tracejado** de 2 px (traço 6, vão 4) | Cobalto, fundo cobalto claríssimo | "Sugestão da IA", anel tracejado | Campo lido do texto, item da ordem sugerida, frase do motivo |
| **Decisão humana** | Contorno **contínuo** de 2 px e **selo** | Verde | "Decidido por Marina Alves, coordenadora, 9h12", anel fechado | Vaga aprovada, oferta aceita, campo corrigido por você |
| **Regra do sistema** | Linha fina contínua, sem destaque | Cinza | "Regra: jornada máxima de 24 h", régua ou cadeado | Filtro, limite de descanso, política do hospital |

**O momento memorável** é um só: quando a pessoa aprova, o tracejado do cartão **fecha** (as lacunas do traço se fecham em cerca de 450 ms), a cor passa de cobalto a verde e o selo assenta. Tudo o mais é calmo. A mesma gramática vale na landing, no app, no telão e na marca.

**Marca.** Um anel com metade tracejada (a IA sugere) e metade em arco contínuo (a pessoa decide). Wordmark em Source Serif 4 semibold. Sem cruz médica e sem escudo.

## 2. Plano (primeira passagem)

### 2.1 Cores base (nomeadas)

| Nome | Claro | Papel |
| --- | --- | --- |
| **Gaze** | `#F4F6F5` | Fundo da página: um branco frio e levemente esverdeado, de gaze hospitalar |
| **Papel** | `#FFFFFF` | Superfície de cartões, campos e diálogos |
| **Tinta** | `#12202B` | Texto e botão primário de navegação |
| **Cobalto** | `#2C4FD6` (tom `#EAEFFD`) | Voz da IA |
| **Verde-carimbo** | `#0B6B4D` (tom `#E4F3EC`) | Voz da decisão humana e botão que cria decisão |
| **Âmbar** | `#8A5300` (tom `#FFF1D6`) | Atenção: jornada, carga, prazo |

Escuro (telão e `prefers-color-scheme`): fundo `#0C141C`, papel `#142230`, tinta `#EAF0F5`, cobalto `#8EA6FF`, verde `#5FD3A3`, âmbar `#F2B33D`. Tabela completa na seção 4.

### 2.2 Tipografia

- **Atkinson Hyperlegible Next** para interface e texto. Já está em produção desde o PR #11, e a razão continua valendo: foi desenhada para a leitura de quem está cansado, depois de um plantão, e tem letras que não se confundem (I, l, 1, O, 0).
- **Source Serif 4** (400 e 600) para títulos, números de destaque e o wordmark. Dá o tom de periódico médico e de escala impressa, sem cair no geométrico de tecnologia.
- Escala 13, 14, 16, 18, 22, 28, 36, 48 px; título do hero até 72 px. Corpo 16/24, tabela 14/20, telão × 1,75.
- Esquerda para texto; **direita para números em tabelas**; sem itálico; sem justificado; linhas de até ~70 caracteres.

### 2.3 Layout

- Grade de 4 px. Contêiner público de 1200 px; área do coordenador fluida com barra lateral de 248 px; área do médico em coluna de 640 px.
- **Sem sombra** (borda e tom de superfície). Raios por hierarquia: 6 px (campos, botões, selos), 10 px (cartões), 16 px (diálogos).
- **Estrutura é informação:** tabelas e listas com divisores no lugar de cartões idênticos; numeração só onde há sequência real (as 8 etapas); nenhum rótulo acima de título.
- O hero é a **própria interface em miniatura**, viva, feita com os componentes da plataforma.

### 2.4 Wireframes

**Landing, 1440 px**

```
┌───────────────────────────────────────────────────────────────────────────────┐
│ Ambiente de demonstração: dados sintéticos, sem validade médica ou legal       │ faixa (32)
├───────────────────────────────────────────────────────────────────────────────┤
│ ◐ PlantãoSeguro    Como funciona  Compromissos  Evidência  Perguntas  Ajuda [Entrar]│ cabeçalho (64)
├───────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  A IA sugere.                        ┌ Vaga em texto livre ───────────────┐    │
│  Você decide.                        │ "Preciso de um pediatra para o     │    │
│                                      │  plantão noturno de sexta, 19h …"  │    │
│  O PlantãoSeguro lê o pedido,        ├ Campos lidos ──────────────────────┤    │
│  ordena quem pode aceitar, explica   │ Unidade ▢  Especialidade ▢  Início ▢│   │
│  cada nome e só envia a oferta       │ ┌┄ Ordem sugerida: 3 de 65 ┄┄┄┄┄┄┐ │    │
│  depois que você aprova.             │ ┆ 1 Felipe Ferraz Siqueira       ┆ │    │
│                                      │ ┆   Mora a 1,4 km, prefere …     ┆ │    │
│  [Entrar na demonstração]            │ ┆ [Pular]  [Aprovar e oferecer]  ┆ │    │
│                                      │ └┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┘ │    │
│  Como ler:  ┄ IA sugere              └────────────────────────────────────┘    │
│             ━ pessoa decide                                                    │
│             ▭ regra do sistema                                                 │
├───────────────────────────────────────────────────────────────────────────────┤
│ O que queremos resolver          (tabela: dor | o que a demonstração faz | situação)
│ ─────────────────────────────────────────────────────────────────────────────  │
│ Vaga descoberta tarde   Lê, filtra e ordena em segundos          ✓ Construído  │
│ Seleção opaca           Motivo por nome, regra por excluído      ✓ Construído  │
│ Fadiga sem controle     Filtro de jornada e alerta de carga      ✓ Construído  │
│ Pagamento sem rastro    Fica para depois                         ○ Não construído
├───────────────────────────────────────────────────────────────────────────────┤
│ Como funciona (8 etapas, sequência real; cada etapa com a forma da sua voz)    │
│ 1 Vaga ┄ 2 Leitura ┄ 3 Filtro ━ 4 Ordem ┄ 5 Motivos ┄ 6 VOCÊ DECIDE ━ 7 Oferta ▭ 8 Aceite ━
├───────────────────────────────────────────────────────────────────────────────┤
│ Compromissos (linhas com divisor; cada uma com "Como conferir")                │
│ Evidência, com as ressalvas (barras horizontais + "o que piorou")              │
│ Perguntas (abas por tema: Como funciona | CFM e jurídico | Segurança e LGPD | Dados)
│ Fim: "Veja a ordem sugerida e decida."  [Entrar na demonstração]     rodapé    │
└───────────────────────────────────────────────────────────────────────────────┘
```

**Landing, 390 px.** Faixa, cabeçalho compacto (marca, **Ajuda**, **Entrar**), título, apoio, botão em largura total, legenda das vozes e, **abaixo**, a demonstração em largura total. As etapas viram linha do tempo vertical; a tabela das dores vira lista com a situação sob cada item; as abas de perguntas viram uma faixa rolável com foco visível.

**Entrar, 1440 px**

```
┌───────────────────────────────────────────────────────────────────────────────┐
│ ◐ PlantãoSeguro                                                       Ajuda     │
│                                                                                │
│  Entrar na demonstração                                                        │
│  Sem senha: você entra com uma pessoa fictícia. Não digite dados reais.        │
│                                                                                │
│ ┌ Coordenador ──────────┐ ┌ Médico ────────────────┐ ┌ Telão ───────────────┐  │
│ │ Publique uma vaga,    │ │ Receba ofertas com o   │ │ Para projetar numa   │  │
│ │ confira o que a IA    │ │ motivo, aceite, recuse │ │ sala: acompanha as   │  │
│ │ leu e decida.         │ │ ou conteste.           │ │ vagas ao vivo, só    │  │
│ │ Marina Alves,         │ │ Olívia Dias Jardim,    │ │ com pseudônimos.     │  │
│ │ coordenadora          │ │ Pediatria, SIM-SP-…    │ │                      │  │
│ │ Hospital Modelo Centro│ │ [Sortear outra]        │ │                      │  │
│ │ [Entrar como coord.]  │ │ [Entrar como médico]   │ │ [Abrir o telão]      │  │
│ └───────────────────────┘ └────────────────────────┘ └──────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────────┘
```

Com `?papel=medico` (um link direto) a porta do médico vem primeiro e em destaque.

**Casca do coordenador e Sugestões, 1440 px**

```
┌───────────────────────────────────────────────────────────────────────────────┐
│ Ambiente de demonstração: dados sintéticos, sem validade médica ou legal       │
├─────────────┬─────────────────────────────────────────────────────────────────┤
│ ◐ Plantão…  │ Hospital Modelo Centro, fictício     Quinta 01/10, 9h (simulado)  Ajuda  Marina ▾
│             ├─────────────────────────────────────────────────────────────────┤
│ Vagas       │ Pediatria                                          [Editar vaga] │
│ Nova vaga   │ Hospital Modelo Centro, sexta 02/10, 19h às 7h, urgência alta    │
│ Contestações│ ┌ Ordem sugerida: 5 de 65 elegíveis ────────┐ ┌ Quem ficou de fora ┐
│ Auditoria   │ ┆ Chances parecidas (66% a 69%): a ordem    ┆ │ 131 outra especialid.│
│ Equidade    │ ┆ entre estes cinco é uma sugestão fraca.   ┆ │  64 sem disponibil.  │
│             │ ┆ 1  Felipe Ferraz Siqueira      chance média┆ │  25 fora do raio     │
│             │ ┆    Mora a 1,4 km, prefere o período …     ┆ │  15 CRM inativo      │
│             │ ┆    [Ver motivos]  [Pular]  [Aprovar …]    ┆ │ [Ver as regras]      │
│             │ ┆ 4  Ana Ramos Tavares     ⚠ carga alta     ┆ └──────────────────────┘
│ Ajuda       │ └┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┘                       │
└─────────────┴─────────────────────────────────────────────────────────────────┘
```

**Sugestões, 390 px.** Cabeçalho da vaga recolhível; nota de "chances parecidas"; cartões em largura total, com **Aprovar e oferecer** (verde) em largura total e **Ver motivos** e **Pular** abaixo; "Quem ficou de fora" vira um bloco recolhível ao fim.

**Médico, ofertas, 390 px**

```
┌─ 390 ────────────────────────┐
│ Ambiente de demonstração     │
│ ◐ PlantãoSeguro        Ajuda │
│ Olívia, você tem 2 ofertas   │
│ ┌ Pediatria ───────────────┐ │
│ │ Hospital Modelo Centro   │ │
│ │ Sexta 02/10, 19h às 7h   │ │
│ │ A 3,2 km de você         │ │
│ │ Responda em 41 min       │ │
│ │ ┌┄ Por que você ┄┄┄┄┄┄┐ │ │
│ │ ┆ Mora a 3,2 km, tem  ┆ │ │
│ │ ┆ taxa de aceite …    ┆ │ │
│ │ └┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┘ │ │
│ │ [ Aceitar ]  [ Recusar ] │ │
│ │ Contestar a recomendação │ │
│ └──────────────────────────┘ │
├──────────────────────────────┤
│ Ofertas  Contestações  Conta │
└──────────────────────────────┘
```

**Telão, 1920 × 1080** (ver o desenho do [prompt](prompt-frontend.md), seção 9.5): escuro, tipo × 1,75, etapas em linha com a etapa "Você decide" em verde e contorno contínuo, números ao vivo, QR com `?papel=medico`. *(Desde 06/11, números ao vivo e QR saíram do MVP: a apresentação é guiada, e a página do telão fica provisória.)*

### 2.5 Princípios

1. **A forma diz quem falou**: tracejado, contínuo, cinza.
2. **Uma ousadia só**: o fechamento do tracejado; o resto calmo.
3. **Estrutura é informação**: sem rótulo decorativo, sem número fora de sequência, sem cartão igual repetido.
4. **Honestidade visível**: todo número leva "simulação"; o que não existe diz "não construído".
5. **Cansaço em primeiro lugar**: fonte legível, alvo grande, contraste alto, uma ação por tela.

## 3. Revisão contra o padrão (segunda passagem)

Pergunta feita a cada parte do plano: "isto serve a qualquer produto de saúde?". O que serviria foi trocado.

| O que o padrão faria | O que o plano fazia ou poderia fazer | O que mudou e por quê |
| --- | --- | --- |
| Paleta teal e branca de saúde | A primeira ideia era usar o verde do corredor da página provisória como cor dominante | O verde passou a ser **só** a voz da decisão humana. O fundo é gaze frio e a tinta é azul-petróleo escuro. Cobalto e verde **significam algo**; não decoram |
| Hero com foto, hélice de DNA ou degradê e três métricas | Um painel de números ao lado do título | O hero é a **demonstração viva**. Não há métrica de cliente (não temos clientes). A evidência real vem depois, com barras e ressalvas |
| Cartões idênticos com sombra suave | Quatro dores em grade 2 × 2 e seis compromissos em seis cartões | Dores viram **tabela** (dor, resposta, situação); compromissos viram **linhas com divisor** e o link "Como conferir". Sem sombra; raios por hierarquia |
| Rótulo em caixa-alta espaçada acima de cada título | Era o padrão do site de referência | **Removido.** O título diz a ideia, e a estrutura vem do espaço e dos divisores |
| Numeração 01, 02, 03 em blocos | As "quatro frentes" da referência | Só as **8 etapas** são numeradas, porque são uma sequência |
| Texto de metadados unido por ponto médio ("A · B · C") | O título da vaga no prompt v1 era "Pediatria · UPA Centro · sex 19h–7h" | O título é a **especialidade**; abaixo, uma linha em prosa curta ("Hospital Modelo Centro, sexta 02/10, 19h às 7h, urgência alta") |
| Seta no fim de botões e links | Padrão da referência ("Falar com um especialista →") | Botões e links são só verbo e objeto. Setas só indicam direção (voltar, próxima etapa) |
| Serifa de exibição, fundo creme e acento terracota | "Tom de periódico" poderia cair nisso | Serifa **só** em títulos e números (Source Serif 4, 400 e 600), fundo **frio**, nenhum terracota. A interface é em sans-serif legível |
| Escuro quase preto com um acento neon | O telão | Azul-petróleo escuro `#0C141C`; os dois acentos (cobalto claro e verde-menta) **são as duas vozes**, e o âmbar é o alerta. Não há acento decorativo |
| Aprovar em botão primário colorido igual aos demais | Um primário azul para tudo | Primário de **navegação** é tinta; o botão que **cria uma decisão humana** é verde. A cor do botão já diz quem decide |
| Instrument Sans mais Source Serif (v1) | Par "editorial" | **Atkinson Hyperlegible Next** fica (continuidade com o PR #11 e a razão de legibilidade); o par com a Source Serif segue distinto o bastante |
| Porcentagem de confiança em cada campo lido | Estava no prompt v1 | O backend **não fornece** esse número, e um percentual inventado seria falsa precisão. Entra "achei no texto", "deduzi" ou "não achei", com o trecho destacado |
| Chance em percentual exato | Score 0,69 no cartão | Faixa (alta, média, baixa) no cartão; o número só em "Ver motivos". E, quando as chances são muito próximas (a demo real: 66% a 69%), a tela **diz** que a ordem entre elas é fraca |

**O acessório que sai** (regra de Chanel): na primeira montagem, a legenda das três vozes ficaria em três lugares (landing, ajuda e telão). Fica em **um componente** (`LegendaVozes`) usado onde ensina a ler, e a landing o mostra uma vez, junto ao hero.

## 4. Tokens

Os valores abaixo são o **ponto de partida**, com os contrastes já calculados no prompt. Os finais e o relatório do script ficam em `apps/web/lib/tokens/cores.ts` e na seção 5 deste documento.

| Token CSS | Utilitário Tailwind | Claro | Escuro |
| --- | --- | --- | --- |
| `--gaze` | `bg-gaze` | `#F4F6F5` | `#0C141C` |
| `--papel` | `bg-papel` | `#FFFFFF` | `#142230` |
| `--tinta` | `text-tinta` | `#12202B` | `#EAF0F5` |
| `--tinta-suave` | `text-tinta-suave` | `#4A5967` | `#9FB0BF` |
| `--ia` | `text-ia`, `border-ia` | `#2C4FD6` | `#8EA6FF` |
| `--ia-tom` | `bg-ia-tom` | `#EAEFFD` | `#1A2547` |
| `--ia-forte` | `bg-ia-forte` | `#2340B0` | `#8EA6FF` |
| `--humano` | `text-humano`, `border-humano` | `#0B6B4D` | `#5FD3A3` |
| `--humano-tom` | `bg-humano-tom` | `#E4F3EC` | `#12372B` |
| `--atencao` | `text-atencao` | `#8A5300` | `#F2B33D` |
| `--atencao-tom` | `bg-atencao-tom` | `#FFF1D6` | `#3A2C10` |
| `--atencao-fundo` | `bg-atencao-fundo` | `#F2B33D` | `#F2B33D` |
| `--erro` | `text-erro` | `#B42318` | `#FF8A80` |
| `--erro-tom` | `bg-erro-tom` | `#FDECEA` | `#3D1A17` |
| `--campo` | `border-campo` | `#76858F` | `#5C7186` |
| `--divisor` | `border-divisor` | `#D5DCE1` | `#24384A` |

| Forma | Valor |
| --- | --- |
| Raio de campo, botão e selo | 6 px (`rounded-campo`) |
| Raio de cartão | 10 px (`rounded-cartao`) |
| Raio de diálogo | 16 px (`rounded-dialogo`) |
| Contorno das vozes | 2 px; IA tracejado 6/4; humano contínuo; regra 1 px |
| Foco | 2 px na cor da tinta, recuo de 2 px |
| Alvo mínimo | 40 px no computador, 44 px com ponteiro grosseiro (`pointer: coarse`) |
| Movimento | 120 a 200 ms nas reações; 450 ms no fechamento do tracejado; 60 ms de intervalo na revelação |

## 5. Contraste, tipos e o que mudou na construção

**Contraste.** A fonte única das cores é `apps/web/app/globals.css`, e `npm run check:contraste` lê esse arquivo e confere 26 pares em cada tema (roda na CI). Todos passam. Faixas medidas em 03/11/2026:

| Grupo de pares | Mínimo exigido | Tema claro | Tema escuro (telão) |
| --- | --- | --- | --- |
| Texto principal (tinta sobre gaze e papel) | 7:1 | 15,3 a 16,6:1 | 14,1 a 16,1:1 |
| Texto secundário (tinta suave) | 4,5:1 | 6,6 a 7,2:1 | 7,3 a 8,3:1 |
| Texto nas vozes (IA, humano, atenção, erro) | 4,5:1 | 5,7 a 7,5:1 | 6,5 a 10,0:1 |
| Rótulo de botão (primário, decisão, atenção) | 4,5:1 | 6,5 a 16,6:1 | 8,9 a 16,1:1 |
| Borda de campo | 3:1 | 3,5 e 3,8:1 | 3,2 e 3,7:1 |
| Contorno tracejado e contínuo, e anel de foco | 3:1 | 6,0 a 16,6:1 | 7,0 a 16,1:1 |

O divisor (1,28:1 no claro, 1,54:1 no escuro) é decorativo, não carrega informação sozinho e fica fora da conta. O escuro do sistema e o escuro forçado do telão têm os mesmos valores, e o script confere isso.

**Tipos.** Medido no navegador: a Atkinson Hyperlegible Next **tem** numerais tabulares (com `tabular-nums`, todos os dígitos medem 80,91 px a 32 px; sem isso o "1111" mede 52 px e o "0000", 83 px), então `.tnum` vale para tabelas e contadores. A Source Serif 4 já traz dígitos tabulares por padrão.

**O que mudou entre o plano e a construção** (autocrítica com as capturas):

| Mudança | Por quê |
| --- | --- |
| A leitura da vaga passou de "sugestão da IA" para **regra do sistema** (cinza, "Leitura por regras") | Sem a chave do Gemini, que só entra no servidor no ensaio e no dia, o backend lê por regras (o Gemini foi testado à parte em 05/11). A voz segue a origem real, e só a ordem e os motivos do modelo são tracejados |
| No celular, a legenda das vozes desceu para **depois** da demonstração | Ela empurrava o hero para baixo; título, ação e demonstração ficam juntos |
| Etapa 6 como o único bloco **cheio** | Entre cartões tracejados, contínuos e cinzas, o bloco cheio é a "decisão carimbada" e a única exceção de forma |
| Mensagem "Chances parecidas (66% a 69%)" no hero | Vem da demonstração real e mostra, em vez de dizer, que o sistema não finge precisão |
| A demonstração do hero mostra **2** sugestões ("2 dos 5 primeiros"), e a linha de campos diz de onde veio cada um ("Está no texto", "Calculado do texto") | Cinco sugestões empurravam o selo para fora da tela no celular; "achei" e "deduzi" eram códigos nossos, e a tela fala como a pessoa pensa |
| "Como funciona" ganhou um trilho à esquerda (tracejado, contínuo, fino) e perdeu a legenda | A legenda já está no hero; o trilho mostra a voz de cada etapa sem repetir a explicação |
| `/entrar` ganhou casca própria: cabeçalho só com a marca e a Ajuda, e as três portas sem ícone, na mesma altura, com a ação no pé | Quem chegou ali já decidiu entrar, então "Entrar" e as âncoras da landing atrapalhavam; o título e a frase de cada porta já dizem quem é quem. A Ajuda continua no mesmo canto (WCAG 3.2.6) |
| A tela de Vagas começa pela **lista**, com o resumo "Exigem a sua ação"; os indicadores vêm depois | A tarefa do coordenador é decidir; os números respondiam a uma pergunta que ele não fez ao abrir a tela. As vagas "aguardando" usam o contorno tracejado da IA |
| Os indicadores levam "simulado" ao lado de cada valor e um link para a fonte dos tempos | Número de simulação nunca aparece sem o rótulo |
| Telão provisório com corpo de 28 px e a legenda das vozes em escala de sala | É lido a 15 m, com a sala escura |
| Sugestões: um único contorno tracejado em volta da lista, com divisórias entre os nomes, em vez de um contorno por nome | Cinco contornos tracejados viravam ruído. O momento memorável fica maior: é a lista inteira que fecha |
| Sugestões: caixa "Incluir na oferta" em cada nome e um só "Aprovar e oferecer" no fim, em vez de um botão por nome (como no esboço de 390 px) | A API recebe uma lista em ordem, e a cascata precisa de mais de um nome. Nenhuma caixa vem marcada, para a escolha ser sempre um gesto da pessoa |
| Barras de "Ver motivos" com duas cores só delas (`--fator-favor` e `--fator-contra`, conferidas com o validador de paleta nos dois temas) | O cinza e o azul da IA ficavam parecidos no escuro, e o âmbar, o vermelho e o verde já têm significado. O sentido também vem na posição e na palavra |

**Que acessório saiu** (a regra de Chanel): o menu de âncoras no celular (a página é uma rolagem só); a animação de entrada de cada seção (sobrou a revelação do hero e o fechamento do tracejado); o botão "Pular" do hero (só o "Aprovar e oferecer" funciona, e um botão que não faz nada é pior do que nenhum); e a faixa de demonstração fixa no celular (ela some na rolagem e volta a cada página).

**Capturas** de 04/11/2026, tiradas do build de produção no Edge com `node scripts/capturar.mjs`, ficam em [`capturas/`](capturas/): a landing em 1440 px (tema claro, escuro e página inteira), 768 px (topo) e 390 px (topo e página inteira); `/entrar` em 1440 e 390 px; Vagas em 1440 px (claro e escuro), 768 e 390 px; Minha conta e Ofertas do médico em 390 px; o telão em 1920 por 1080 px no tema escuro; e a Ajuda em 1440 px. O que **não** foi capturado: telas de erro e de carregamento, e o celular real (só o tamanho emulado).

## 6. Revisão da fase E (10/11/2026): o visual novo

**Pedido do Victor (F.1):** uma evolução visual com uma tela de painel médico como referência de linguagem (fundo claro azulado, cartões brancos e arredondados, sombras muito suaves, azul como cor de interação, tipografia moderna sem serifa, números grandes e leves). Ele pediu para **não** copiar a tela, os componentes, os indicadores nem as funções da referência, e para manter as funções, as rotas e as regras do produto. Nenhum menu, página ou indicador novo entrou por causa da referência.

**O que fica:** a gramática das três vozes (seção 1) e o momento memorável (o tracejado que fecha). A forma do traço, o rótulo e o ícone continuam carregando o significado.

**O que mudou e por quê:**

| Antes | Agora | Por quê |
| --- | --- | --- |
| Fundo gaze esverdeado `#F4F6F5`, sem sombra, "borda e tom" | Fundo cinza-azulado `#EDF1F6` com uma luz difusa azul e anil no alto da janela; cartões de papel com borda discreta e sombra larga e suave (`superficie`, `shadow-cartao`) | É a profundidade da referência: separa o cartão do fundo sem linha dura. A luz no alto faz o papel da imagem de fundo da referência sem pôr uma figura decorativa |
| Raios 6, 10 e 16 px | 10, 18 e 24 px; etiquetas em pílula | Mais macio, ainda por hierarquia (campo, cartão, diálogo) |
| Primário de navegação em tinta | Primário em **azul de ação** (`--acento`, `#1D62D6`), com sombra azulada; secundário em papel com borda | O pedido do Victor: azul nas ações principais, nas seleções e nos elementos interativos. O botão que cria decisão humana **continua verde**: a cor ainda diz quem decide |
| Voz da IA em cobalto `#2C4FD6` | Voz da IA em **anil** `#4046C4` (tom `#EEEFFD`) | Com o azul virando a cor da interação, o cobalto ficaria igual ao botão. O anil separa "isto é da IA" de "isto é clicável" |
| Item atual: borda de tinta | Item atual: fundo azul-claro, texto azul forte e um traço de 3 px (barra lateral e barra do celular); nas abas, nos filtros e no topo do médico, um bloco de papel elevado sobre uma calha | Segue a referência sem depender só da cor: mudam fundo, peso e forma. No alto contraste do sistema, o sublinhado grosso continua |
| Títulos em Source Serif 4 | **Uma família só**: Atkinson Hyperlegible Next, títulos em 600 com o espaçamento um pouco fechado (`font-titulo`) e números de painel em 300 (`numero-destaque`) | A referência é toda sem serifa; a Atkinson fica pela razão de legibilidade, e a hierarquia vem do peso e do tamanho. Uma fonte a menos para baixar |
| Cabeçalhos opacos | Cabeçalhos translúcidos com desfoque (`vidro`) | O conteúdo passa por baixo, como na referência, sem perder o contraste do texto |
| Campos com borda simples | Campos com sombra interna leve e, no foco, borda azul e um halo azul-claro; anel de foco global em azul | O foco fica visível (3:1 conferido) e com o mesmo azul da interação |
| Número da ordem sugerida solto | Número dentro de um marcador redondo | Reforça a sequência (é uma ordem de verdade) |

**Tokens novos** em `apps/web/app/globals.css`: `--acento`, `--acento-tom`, `--acento-forte`, `--sobre-acento`, `--recuo` (fundo de calhas e áreas recuadas), `--sombra-cartao`, `--sombra-flutuante`, `--sombra-botao` e as duas luzes (`--brilho-a` e `--brilho-b`). Utilitários: `superficie`, `vidro`, `font-titulo` e `numero-destaque`. O `check:contraste` ganhou 8 pares (azul de ação e recuo), e todos passam nos dois temas; no claro, o azul de ação dá 5,6:1 sobre papel e 4,9:1 sobre a página.

**Escuro:** fundo `#0A121B`, papel `#111C28`, azul de ação `#72AAFF`, anil `#A9ADFF`. As sombras viram quase só um fio de luz, porque sombra escura sobre fundo escuro não aparece.

**O acessório que saiu:** a Source Serif 4.
