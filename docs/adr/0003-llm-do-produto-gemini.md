# ADR 0003: LLM do produto é o Gemini

- **Status:** aceita por decisão do Victor em 28/10/2026.
- **Atualização de 05/11/2026:** por decisão do Victor, o projeto **não gasta** com o Gemini: fica na camada gratuita, o que substitui a consequência 1. Detalhes na seção "Atualização de 05/11/2026".
- **Atualização de 06/11/2026:** a apresentação passou a ser guiada, e só o Victor escreve pedidos, sempre sintéticos. As menções à plateia na seção de 05/11 ficam como registro; as salvaguardas continuam valendo para quem tiver o link.
- **Origem:** o Victor decidiu usar o Gemini, e não o Claude, como modelo de linguagem do produto. O Claude Code continua sendo apenas a ferramenta de desenvolvimento do grupo e não faz parte do produto.

## Contexto

O PlantãoSeguro usa um LLM em duas etapas estreitas: extrair campos da vaga em texto livre e redigir a explicação de cada recomendação a partir dos fatores do ranking. Antes desta decisão, a Entrega 1 e a arquitetura citavam Claude Haiku 5.5 e Sonnet 5.5. As regras do projeto não mudam: código decide e o LLM redige, sem ferramentas e sem segredos; nome, CRM e telefone nunca vão ao modelo; saída em JSON Schema validada com Pydantic; fallback em template se o LLM falhar.

## Decisão

- **Provedor:** Gemini API (Google), pelo SDK oficial `google-genai`.
- **Extração e explicação:** `gemini-3.5-flash-lite`.
- **Casos ambíguos:** `gemini-3.8-flash`.
- **Variáveis de ambiente:** `GEMINI_API_KEY`, `LLM_MODEL_EXTRACAO` e `LLM_MODEL_AMBIGUO` (`.env.example`).
- **Isolamento do provedor:** a chamada ao LLM fica atrás de uma interface própria, para trocar de provedor ou cair no template sem mexer no resto. É desenho; nada disso é construído agora (ADR 0004).

## Fatos conferidos na documentação oficial (28/10/2026)

Páginas do Google, com a data "Last updated 2026-10-28 UTC" nas de modelos e preços. Valores em dólar, por 1 milhão de tokens, camada paga, texto.

| Modelo | Código | Entrada | Saída (inclui raciocínio) | Observação |
| --- | --- | --- | --- | --- |
| Gemini 3.5 Flash-Lite | `gemini-3.5-flash-lite` | US$ 0,30 | US$ 2,50 | Estável; a documentação recomenda para projetos novos |
| Gemini 3.8 Flash | `gemini-3.8-flash` | US$ 0,75 até 31/12/2026, depois US$ 1,50 | US$ 3,75 até 31/12/2026, depois US$ 7,50 | Estável; a documentação recomenda para projetos novos |
| Gemini 4 Argon | `gemini-4-argon` | US$ 2,00 até 30/11/2026, depois US$ 4,00 | US$ 10,00 até 30/11/2026, depois US$ 20,00 | Carro-chefe; sem camada gratuita; desnecessário para a PoC |

- **SDK:** `google-genai` é o SDK oficial; o `google-generativeai` está marcado como legado e descontinuado desde 30/11/2025.
- **Saída estruturada:** a documentação consultada descreve JSON Schema e o uso de modelos Pydantic (`model_json_schema()` para gerar o esquema e `model_validate_json()` para validar). Ela avisa que o JSON é sintaticamente válido, mas os valores ainda precisam ser validados na aplicação, e que palavras-chave como `minLength` e `maxLength` não são aplicadas.
- **Camada gratuita × paga:** os modelos Flash e Flash-Lite têm camada gratuita. Na gratuita, o conteúdo enviado e as respostas são usados para melhorar produtos do Google e **revisores humanos podem ler** a entrada e a saída; os termos dizem para não enviar informação sensível, confidencial ou pessoal. Na paga, o Google afirma que não usa os prompts nem as respostas para melhorar produtos, mas registra por tempo limitado para detectar abusos.
- **Local de processamento (camada paga):** os termos dizem que prompts e respostas podem ser armazenados ou colocados em cache em qualquer país onde o Google ou seus agentes tenham instalações.

## Consequências

1. **Dados e privacidade.** Os testes e experimentos usam só dados sintéticos, então a camada gratuita serve ao desenvolvimento. Mas na apresentação de 17/11 a **plateia digita texto livre**, e isso pode conter dado pessoal real. Por isso a demo usa a **camada paga** (projeto com faturamento ativo) e a tela avisa "não digite dados reais". Alerta de orçamento no Google Cloud; conferir se há limite rígido de gasto.
2. **Validação obrigatória.** Como JSON válido não é conteúdo válido, a saída passa sempre por Pydantic, e a explicação só pode citar fatores recebidos; falha cai no template.
3. **Custo.** Estimativa de 200 chamadas de 2.000 tokens de entrada e 500 de saída: cerca de US$ 0,37 com o Flash-Lite e US$ 0,68 com o 3.8 Flash (premissa minha; a saída inclui tokens de raciocínio e pode ser maior). Os preços do 3.8 Flash dobram em 01/01/2027 e os do Argon sobem em 01/12/2026; nada disso afeta a apresentação de 17/11.
4. **LGPD.** Com dados reais, o tratamento fora do Brasil e o acordo de tratamento de dados exigiriam base legal e análise jurídica (validar com jurídico). Na PoC não há dado real.
5. **Documentos.** Atualizados no mesmo commit: `docs/02` (ferramentas, custo, riscos), README, `.env.example`, subagente `engenheiro-ia` e plano da Etapa 2. A Entrega 1 já entregue não cita o modelo e não foi alterada.

## Alternativas descartadas

- **Claude (Haiku 5.5 e Sonnet 5.5):** era a opção da Entrega 1; descartada por decisão do Victor.
- **Gemini 4 Argon:** mais caro, sem camada gratuita e desnecessário para extração e explicação curtas.
- **LLM sem provedor externo (só regras e templates):** não resolve o texto livre das vagas, que é a razão de usar IA nessa etapa.

## Atualização de 05/11/2026: sem gastos, e o primeiro teste real

**Decisão do Victor: o projeto não gasta com o Gemini, e ele só é ligado para a demonstração.** A chave fica num projeto sem conta de faturamento, na camada gratuita, e a consequência 1 acima deixa de valer. O Victor conferiu em 05/11 que o projeto está sem faturamento (coluna "Billing Tier" da página de Projetos do AI Studio). A assinatura de consumidor (Gemini Plus) não aparece na página de cobrança da API: não contamos com ela.

**Como isso fica em custo zero:**

- **Sem conta de faturamento, não há para onde cobrar.** Passando da cota, o Gemini recusa, e a leitura cai nas regras. Ninguém clica em "Set up billing" nesse projeto.
- **A chamada nunca vai ao Google Cloud:** o cliente diz `vertexai=False` por escrito, para uma variável de ambiente esquecida não mudar o caminho. Há teste para isso.
- **O servidor fica sem a chave até o dia** ([passo a passo](../../infra/README.md)). Depois da apresentação, a linha sai do `.env`, e a chave é apagada no AI Studio.

**O que isso exige.** Na camada gratuita, o Google pode usar o conteúdo para melhorar produtos, e revisores humanos podem lê-lo. Por isso:

- **Só texto sintético vai ao Gemini.** A plateia não alcança o LLM: a leitura e a recomendação só aceitam login de coordenador (`test_token_de_medico_que_se_diz_coordenador_nao_passa`), e quem usa esse login na apresentação é o grupo, com pedidos sintéticos. O modo `demo` da web nem chama a API.
- **Se a plateia passar a escrever pedidos, a chave sai do servidor antes.** Sem a chave, a API segue pelas regras.
- **A cota é limitada** e fica na página de limites do AI Studio. Passando dela, o Gemini recusa, e a leitura cai nas regras.

**O que o teste real e a documentação de hoje mudaram no código**

| Ponto | Decisão | Por quê |
| --- | --- | --- |
| Chamada | Fica a `generateContent` (SDK 2.32.0), não a Interactions | O Google recomenda a Interactions para projetos novos, mas diz que a `generateContent` segue com suporte total, sem data para acabar. A Interactions guarda a conversa no servidor por padrão (`store=true`), e aqui cada chamada é avulsa |
| Esquema | `nullable` saiu; nulo virou tipo (`["string", "null"]` e `anyOf`) | `nullable` não está na lista de palavras que o SDK documenta |
| Modelo | `gemini-3.1-flash-lite`, não o `gemini-3.5-flash-lite` | Os dois têm camada gratuita e são estáveis. Na mesma medição, o 3.1 acertou 6 de 6, e o 3.5, 0 de 6 ([registro](../teste-manual-gemini.md)) |
| Prazo | A tela espera até 6 s; o pedido declara 10 s ao serviço | Com 8 s ou 9 s, o serviço recusa: "Minimum allowed deadline is 10s". Com o serviço cheio, a demora mediana foi de 8 s |
| `503` de alta demanda | Uma repetição, só se a falha veio em até 3 s | Volta rápido e costuma passar. Tempo estourado não se repete, para a tela não esperar em dobro |
| Depois de uma falha | 60 s sem tentar | Os próximos pedidos seguem direto pelas regras, sem esperar o limite um a um |
| Motivos | A reescrita fica desligada (`LLM_REESCREVER_MOTIVOS=1` liga) | Cinco chamadas em fila atrasam a tela e gastam a cota, e o texto montado por regra já diz o mesmo. O Gemini fica só na leitura da vaga |

O resultado do teste está em [`docs/teste-manual-gemini.md`](../teste-manual-gemini.md). **O serviço pode falhar na hora da apresentação:** uma chamada de conferência (`--rapido`) diz como ele está. Se estiver fora, tira-se a chave do `.env` do servidor, e a API volta às regras.

## Atualização de 06/11/2026: ligado no sistema real, ainda em custo zero

**Decisão do Victor:** "Quero deixar o Gemini ligado na main, mas sempre sem gerar custos." A chave deixa de entrar só no ensaio e no dia: vai para o `.env` do servidor e fica até o fim do projeto (passo 3.8 do [roteiro](../roteiro-ate-o-mvp.md)). Tudo o que garante o custo zero acima continua valendo.

- **Onde a chave fica:** só no `.env` do servidor, com permissão 600, lido pelo contêiner da API. Não vai para a Vercel, para o navegador, para o Git nem para a resposta da API. A web fala com a API pela rota do próprio site ([ADR 0016](0016-modo-real-pela-rota-do-site.md)), e o modo de demonstração nem chama a API.
- **Quem alcança o Gemini:** só a leitura da vaga, que pede login de coordenador. Os logins da demonstração estão só com o Victor.
- **Por que segue sem custo:** o projeto da chave não tem conta de faturamento, e o Victor confere isso antes de ligar e antes do ensaio. Passando da cota, o Gemini recusa, e a leitura segue pelas regras.
- **O que muda no código:** um teto diário de chamadas na API, abaixo da cota gratuita, para um uso fora do roteiro não gastar a cota do dia da apresentação. A reescrita dos motivos continua desligada. *Feito em 10/11 (imagem 0.5.0):* `LLM_TETO_DIARIO`, 200 por padrão. Cada pedido ao serviço conta, inclusive a repetição da alta demanda. O dia é o de UTC, e a conta fica na memória da API (um reinício zera), por isso o teto fica abaixo da metade da cota. Passando dele, a leitura sai pelas regras, sem abrir a pausa de falha, e o registro avisa uma vez por dia, sem o texto.
- **Uso econômico (10/11, imagem 0.5.1).** O AI Studio acusou o limite **por minuto** da camada gratuita (15 pedidos por minuto; a cota diária do 3.1 Flash Lite é de 500 e estava em 21). O Victor pediu: "Vamos usar o gemini de forma econômica, vamos reduzir as chamadas nele, para ter como usar no dia". Mudou: o teto diário caiu de 200 para 100; um teto por minuto (`LLM_TETO_POR_MINUTO`, 10) numa janela móvel de 60 s; e o mesmo pedido, com as mesmas instruções (que levam a data), responde da memória da API sem ir ao Gemini, inclusive durante a pausa de falha (até 64 respostas, só JSON válido). Os tetos não abrem a pausa. A leitura continua a única chamada; a reescrita dos motivos segue desligada.
- **Ao fim do projeto:** a linha sai do `.env` do servidor, e a chave é apagada no AI Studio (10.1).

## Pendências

- ~~Confirmar a interface do SDK~~: conferida em 05/11, contra o SDK 2.32.0 e o serviço real.
- ~~Criar a chave e o projeto com faturamento~~: a chave existe, e não haverá faturamento.
- A medição é de uma manhã só. No ensaio, repetir a conferência e medir a memória da API com o pacote carregado.

## Fontes (lidas em 28/10/2026)

- [Modelos do Gemini](https://ai.google.dev/gemini-api/docs/models)
- [Preços da Gemini API](https://ai.google.dev/gemini-api/docs/pricing)
- [Saída estruturada](https://ai.google.dev/gemini-api/docs/structured-output)
- [Termos adicionais da Gemini API](https://ai.google.dev/gemini-api/terms)
- [Bibliotecas e SDKs](https://ai.google.dev/gemini-api/docs/libraries)
