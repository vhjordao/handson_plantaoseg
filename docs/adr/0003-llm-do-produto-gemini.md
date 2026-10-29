# ADR 0003: LLM do produto é o Gemini

- **Status:** aceita por decisão do Victor em 28/10/2026.
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

## Pendências

- Na hora de implementar, confirmar a interface do SDK: a página de saída estruturada mostra `response_format` com `mime_type` e `schema` na API de interações, e vale checar se a chamada de geração tradicional segue disponível. Registrar a versão do `google-genai` na ficha do componente.
- Criar a chave e o projeto com faturamento antes da demo (Victor).

## Fontes (lidas em 28/10/2026)

- [Modelos do Gemini](https://ai.google.dev/gemini-api/docs/models)
- [Preços da Gemini API](https://ai.google.dev/gemini-api/docs/pricing)
- [Saída estruturada](https://ai.google.dev/gemini-api/docs/structured-output)
- [Termos adicionais da Gemini API](https://ai.google.dev/gemini-api/terms)
- [Bibliotecas e SDKs](https://ai.google.dev/gemini-api/docs/libraries)
