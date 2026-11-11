/**
 * Textos da landing e da ajuda. Os fatos vêm do repositório e cada afirmação tem evidência
 * (docs/design/prompt-frontend.md, seção 11). Nada de cliente, depoimento ou número sem
 * rótulo de simulação.
 */
import type { ChaveVoz } from "./comum";

export const HERO = {
  titulo: ["A IA sugere.", "Você decide."],
  apoio:
    "O PlantãoSeguro lê o pedido de plantão, ordena quem pode aceitar, explica cada nome e só envia a oferta depois que você aprova.",
  nota: "Projeto acadêmico, com dados 100% sintéticos.",
  /** O selo do alto: fatos da simulação, no lugar de uma nota de clientes (não há clientes). */
  selo: "Testado em 392 vagas e 300 médicos sintéticos",
  construidoCom: "Construído com",
} as const;

/**
 * Saída real da demonstração da PoC (`python -m app.cli demo`, dados sintéticos, simulação):
 * mesmo texto, mesmos nomes fictícios e mesmas frases de motivo do backend (`app/explain.py`).
 */
export const HERO_DEMO = {
  texto:
    "Preciso de um pediatra para o plantão noturno de sexta, 19h às 7h, Hospital Modelo Centro, urgência alta",
  campos: [
    { rotulo: "Hospital", valor: "Hospital Modelo Centro", origem: "no texto" },
    { rotulo: "Especialidade", valor: "Pediatria", origem: "no texto" },
    { rotulo: "Início", valor: "sexta, 02/10, 19h", origem: "calculado de “sexta”" },
    { rotulo: "Fim", valor: "sábado, 03/10, 7h", origem: "calculado de “19h às 7h”" },
    { rotulo: "Urgência", valor: "alta", origem: "no texto" },
  ],
  razaoLeitura: "Nesta demonstração a leitura é por regras, não pela IA.",
  resumo: "65 elegíveis entre 300 médicos. Aqui estão 2 dos 5 primeiros.",
  notaChances:
    "Os cinco primeiros têm chances parecidas (66% a 69%): a ordem entre eles é uma sugestão fraca. Confira os motivos.",
  sugestoes: [
    {
      posicao: 1,
      nome: "Felipe Ferraz Siqueira",
      crm: "SIM-SP-000083",
      motivo:
        "Recomendado porque mora a 1,4 km do hospital, prefere o período desta vaga e tem taxa de aceite estimada de 45% nos últimos 90 dias.",
    },
    {
      posicao: 2,
      nome: "Felipe Barros Tavares",
      crm: "SIM-SP-000289",
      motivo:
        "Recomendado porque mora a 3,0 km do hospital, tem taxa de aceite estimada de 56% nos últimos 90 dias e prefere o período desta vaga.",
    },
  ],
  depoisDeAprovar:
    "A oferta sai para esta pessoa (simulado). Se ela recusar ou o prazo de 60 min acabar, passa ao próximo que você aprovar.",
} as const;

export interface EtapaDoFluxo {
  numero: number;
  titulo: string;
  texto: string;
  voz: ChaveVoz;
  /** Texto do rótulo da voz; sem ele vale o nome da voz. */
  quem?: string;
  destaque?: boolean;
  nota?: string;
}

/** O fluxo de 8 etapas e 1 decisão humana (docs/diagrams/fluxo-recomendacao.mmd). */
export const ETAPAS: EtapaDoFluxo[] = [
  {
    numero: 1,
    titulo: "Vaga",
    texto: "Você escreve o pedido do jeito que escreveria no dia a dia, em texto livre.",
    voz: "humano",
    quem: "Você escreve",
  },
  {
    numero: 2,
    titulo: "Leitura",
    texto:
      "O sistema lê o texto e propõe hospital, especialidade, horário e urgência. Você confere e corrige.",
    voz: "regra",
    quem: "Leitura por regras",
    nota: "Nesta demonstração a leitura é por regras. O modelo de linguagem (Gemini) foi testado à parte, com textos sintéticos, e não roda nesta demonstração.",
  },
  {
    numero: 3,
    titulo: "Filtro",
    texto:
      "Regras barram quem não pode: CRM inativo, outra especialidade, fora do raio, sem agenda ou além do limite de jornada.",
    voz: "regra",
  },
  {
    numero: 4,
    titulo: "Ordem",
    texto: "Um modelo estima a chance de cada elegível aceitar e sugere os cinco primeiros.",
    voz: "ia",
  },
  {
    numero: 5,
    titulo: "Motivos",
    texto:
      "Cada nome vem com o motivo e os alertas de jornada. Quem ficou de fora vem com a regra que o barrou.",
    voz: "ia",
  },
  {
    numero: 6,
    titulo: "Você decide",
    texto: "Você aprova quem recebe a oferta ou pula. Sem o seu clique, nada sai.",
    voz: "humano",
    quem: "Você decide",
    destaque: true,
  },
  {
    numero: 7,
    titulo: "Oferta",
    texto:
      "O sistema oferece ao primeiro aprovado. Se ele recusar ou o prazo acabar, passa ao próximo.",
    voz: "regra",
    nota: "Simulada nesta demonstração. A cascata automática já roda no servidor, com o n8n, e chega à tela com a tela do médico.",
  },
  {
    numero: 8,
    titulo: "Aceite",
    texto:
      "O médico aceita ou recusa e pode contestar a recomendação. Tudo fica na trilha de auditoria.",
    voz: "humano",
    quem: "O médico decide",
    nota: "Em construção: chega com a tela do médico.",
  },
];

export type SituacaoDor = "construido" | "nao-construido";

export interface DorDaEntrega1 {
  dor: string;
  resposta: string;
  situacao: SituacaoDor;
  rotuloSituacao: string;
  detalhe?: string;
}

/** As quatro dores da Entrega 1 e a situação honesta de cada uma (docs/03, seção 1). */
export const DORES: DorDaEntrega1[] = [
  {
    dor: "Vaga descoberta, percebida tarde",
    resposta: "Lê o pedido, filtra e ordena em segundos.",
    situacao: "construido",
    rotuloSituacao: "Construído",
    detalhe: "Prever vagas em risco fica para depois.",
  },
  {
    dor: "Seleção opaca",
    resposta:
      "Um motivo por nome, a regra que barrou cada excluído e uma trilha que não se altera sem deixar rastro.",
    situacao: "construido",
    rotuloSituacao: "Construído",
  },
  {
    dor: "Fadiga sem controle",
    resposta: "Filtro de jornada (24 h contínuas, 11 h de descanso) e alerta de carga recente.",
    situacao: "construido",
    rotuloSituacao: "Construído",
    detalhe: "Os limites são configuração do projeto, não norma verificada.",
  },
  {
    dor: "Pagamento sem rastro",
    resposta: "Fora do núcleo desta versão.",
    situacao: "nao-construido",
    rotuloSituacao: "Não construído",
    detalhe: "O PDF da Res. CFM 2.462, que o motivava, a dá como suspensa; situação atual a validar com jurídico.",
  },
];

export interface Compromisso {
  titulo: string;
  texto: string;
  /** Caminho no repositório que prova a afirmação. */
  evidencia: string;
  rotuloEvidencia: string;
}

export const COMPROMISSOS: Compromisso[] = [
  {
    titulo: "Só dados sintéticos.",
    texto:
      "Nenhum médico, paciente ou hospital é real. Nomes e CRMs, como SIM-SP-000083, são gerados.",
    evidencia: "docs/dados/relatorio-de-qualidade.md",
    rotuloEvidencia: "Relatório de qualidade dos dados",
  },
  {
    titulo: "Sem o seu clique, nenhuma oferta sai.",
    texto: "A aprovação do coordenador é um passo obrigatório e fica registrada.",
    evidencia: "services/matching-api/tests/test_pipeline.py",
    rotuloEvidencia: "Teste da aprovação",
  },
  {
    titulo: "O valor do plantão não entra na ordem.",
    texto:
      "A ordem sugerida usa uma lista fechada de sete variáveis. Um teste automático falha se alguém acrescentar pagamento ou valor.",
    evidencia: "services/matching-api/tests/test_neutralidade_economica.py",
    rotuloEvidencia: "Teste de neutralidade econômica",
  },
  {
    titulo: "Gênero, idade e outros atributos protegidos ficam de fora.",
    texto: "A mesma lista fechada de variáveis impede que eles cheguem à ordem sugerida.",
    evidencia: "services/matching-api/app/ranking/features.py",
    rotuloEvidencia: "Lista de variáveis da ordem sugerida",
  },
  {
    titulo: "Nome, CRM e telefone não vão para a IA.",
    texto:
      "O texto enviado ao modelo de linguagem não leva dados pessoais, e a trilha guarda só pseudônimos.",
    evidencia: "services/matching-api/tests/test_llm.py",
    rotuloEvidencia: "Teste do modelo de linguagem",
  },
  {
    titulo: "Toda decisão fica na trilha.",
    texto:
      "A trilha só aceita inserção, e cada linha guarda o hash da anterior: alterar uma linha quebra a cadeia.",
    evidencia: "services/matching-api/app/audit.py",
    rotuloEvidencia: "Código da trilha de auditoria",
  },
];

/** Tempo médio até preencher a vaga, em minutos (docs/resultados/metricas-fluxo.md, simulação). */
export const EVIDENCIA = {
  titulo: "O que a simulação mostra, e o que ela não mostra",
  grafico: {
    titulo: "Tempo médio até preencher a vaga, em minutos (simulação)",
    barras: [
      { rotulo: "Processo manual simulado", minutos: 110, destaque: false },
      { rotulo: "Regras e sorteio entre elegíveis", minutos: 65, destaque: false },
      { rotulo: "Regras e ordem simples", minutos: 51, destaque: false },
      { rotulo: "Regras e modelo", minutos: 47, destaque: true },
    ],
  },
  achados: [
    {
      titulo: "O tempo cai 57%, em simulação.",
      texto:
        "De 110 para 47 minutos nas mesmas 392 vagas de teste. Cerca de 72% desse ganho vem do filtro de regras, isto é, de não chamar quem não poderia aceitar.",
    },
    {
      titulo: "A concentração piora.",
      texto:
        "Os 10% de médicos mais recomendados ocupam 50,7% dos lugares entre os cinco primeiros, contra 31,1% das ofertas do processo manual simulado. Em simulação, o rodízio entre médicos de chance parecida baixa essa parcela para 28,5%, com 1,8 ponto a menos de chance de sucesso; ainda não está no sistema.",
      atencao: true,
    },
    {
      titulo: "Isto não é evidência real.",
      texto:
        "Os dados são sintéticos e as premissas de tempo são do grupo. O resultado mostra de onde vem o ganho dentro do simulador, não quanto um hospital real economizaria.",
    },
  ],
  fonte: "docs/resultados/metricas-fluxo.md",
} as const;

export interface PerguntaFrequente {
  pergunta: string;
  resposta: string;
  link?: { texto: string; caminho: string };
}

export interface TemaDePerguntas {
  id: string;
  titulo: string;
  itens: PerguntaFrequente[];
}

export const PERGUNTAS: TemaDePerguntas[] = [
  {
    id: "como-funciona",
    titulo: "Como funciona",
    itens: [
      {
        pergunta: "A IA aprova alguma coisa sozinha?",
        resposta:
          "Não. O sistema lê o texto, ordena e explica; quem aprova é o coordenador. Sem o clique dele, nenhuma oferta sai, e a aprovação fica na trilha de auditoria.",
      },
      {
        pergunta: "O que é a faixa de chance?",
        resposta:
          "É a estimativa do modelo de que a pessoa aceite a oferta, mostrada como alta, média ou baixa. Quando os cinco primeiros têm chances parecidas, a tela avisa que a ordem entre eles é uma sugestão fraca.",
      },
      {
        pergunta: "E se o sistema ler a vaga errado?",
        resposta:
          "Você confere cada campo antes de seguir e pode corrigi-lo. Campo ambíguo vira pergunta, não palpite, e, se a leitura falhar, aparece um formulário para preencher. Nesta demonstração, a leitura é feita por regras. O modelo de linguagem (Gemini) foi testado à parte, com textos sintéticos.",
      },
    ],
  },
  {
    id: "cfm-e-juridico",
    titulo: "CFM e jurídico",
    itens: [
      {
        pergunta: "O PlantãoSeguro está em conformidade com o CFM?",
        resposta:
          "O desenho considera as resoluções 2.454 (IA na medicina) e 2.460 (vantagens econômicas) de 2026, mas isso é uma leitura de engenharia, não um parecer. A conformidade precisa ser validada com jurídico.",
        link: { texto: "Ler a análise das resoluções", caminho: "docs/conformidade/README.md" },
      },
      {
        pergunta: "E a Resolução 2.462?",
        resposta:
          "O PDF oficial que lemos traz o aviso de que ela está suspensa por decisão judicial, e a situação atual não foi verificada. Por isso o rastro de pagamentos não é apresentado como obrigação e não está construído.",
      },
      {
        pergunta: "A IA pode usar o valor do plantão para escolher?",
        resposta:
          "Não. O valor do plantão e o pagamento ficam fora da ordem sugerida, por desenho e por um teste automático que roda a cada mudança.",
        link: {
          texto: "Ver o teste",
          caminho: "services/matching-api/tests/test_neutralidade_economica.py",
        },
      },
    ],
  },
  {
    id: "seguranca-e-lgpd",
    titulo: "Segurança e LGPD",
    itens: [
      {
        pergunta: "Que dados pessoais existem aqui?",
        resposta:
          "Nenhum real. Nomes, CRMs e telefones são sintéticos. Mesmo assim, nome, CRM e telefone nunca vão ao modelo de linguagem, e a trilha só guarda pseudônimos.",
      },
      {
        pergunta: "E se alguém tentar enganar a IA pelo texto da vaga?",
        resposta:
          "O texto da vaga é tratado como entrada hostil. Trechos que parecem instruções são detectados e, nesse caso, o modelo de linguagem nem é chamado. Em testes com dados sintéticos, as 60 tentativas de injeção foram sinalizadas, sem falso alarme em 340 pedidos normais.",
      },
      {
        pergunta: "Que nível de risco o sistema tem?",
        resposta:
          "Médio, de forma preliminar, pela Res. CFM 2.454/2026: ele ordena pessoas e apoia uma decisão operacional importante, mas não executa nada sozinho, porque sem a aprovação do coordenador nenhuma oferta sai. A classificação formal é do hospital, e a análise está no repositório (docs/conformidade).",
      },
      {
        pergunta: "Posso contestar uma recomendação?",
        resposta:
          "Sim. Em cada oferta, o médico contesta a recomendação, o coordenador responde por escrito, e a contestação e a resposta ficam na trilha de auditoria.",
      },
    ],
  },
  {
    id: "dados-e-simulacao",
    titulo: "Dados e simulação",
    itens: [
      {
        pergunta: "De onde vêm os números?",
        resposta:
          "De um mundo simulado: três hospitais fictícios, 300 médicos e 12 meses de vagas e ofertas, gerados com semente fixa. Os números mostram como o sistema se comporta nesse mundo; não provam quanto tempo um hospital real economizaria.",
        link: { texto: "Ver o dicionário de dados", caminho: "docs/dados/dicionario-de-dados.md" },
      },
      {
        pergunta: "Por que mostram um resultado que piorou?",
        resposta:
          "Porque mostrar só o que melhorou seria propaganda. A ordem sugerida concentra mais ofertas em poucos médicos do que o processo manual simulado, e isso entra como risco a mitigar.",
      },
      {
        pergunta: "Posso digitar dados reais?",
        resposta:
          "Não. Tudo aqui é simulação, e o texto livre não deve ter nomes, CRMs ou telefones reais.",
      },
    ],
  },
];

export const FIM = {
  titulo: "Veja a ordem sugerida e decida.",
  texto: "Entre com o seu login, como coordenador ou como médico. Os dados são todos fictícios.",
} as const;

export const RODAPE = {
  projeto:
    "Projeto acadêmico da disciplina Hands On: Aplicação de IA nos negócios, da pós-graduação do Mackenzie. Nada aqui tem validade médica ou legal.",
} as const;
