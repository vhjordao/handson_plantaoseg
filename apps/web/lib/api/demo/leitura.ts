/**
 * "Ler a vaga" no navegador: porte, para TypeScript, da extração por regras do backend.
 *
 * Reproduz `app/llm/extraction.py` (`extract_by_rules`, `_find_unit`, `_find_date`) e
 * `app/llm/guardrails.py` (`normalize`, `sanitize_text`, `detect_injection`), na mesma ordem
 * e com as mesmas expressões regulares, contra o "hoje" do relógio da demonstração. O teste de
 * paridade (`leitura.test.ts`) compara a saída com a do `extract()` do Python em dezenas de
 * textos gravados em `mundo.json`.
 *
 * O `re` do Python (texto Unicode) e o `RegExp` do JavaScript diferem em `\s`, `\w`, `\d` e
 * `\b`; por isso as classes abaixo são escritas à mão e foram conferidas, ponto de código a
 * ponto de código, contra o Python 3.12. Diferenças conhecidas, só fora do português:
 * as marcas de combinação sem "classe de combinação" (escritas indianas) o Python não remove
 * e aqui são removidas (exceto o U+034F), e letras e dígitos criados em versões do Unicode
 * mais novas que a 15.0 contam como letras e dígitos aqui.
 *
 * Quando há sinais de injeção, a IA nem lê o texto: só as regras rodam e os sinais voltam em
 * `Leitura.sinais`, como no backend. Não existe percentual de confiança.
 */
import type {
  CampoLido,
  ChaveCampo,
  Especialidade,
  Leitura,
  Unidade,
  Urgencia,
} from "../types";
import {
  compararDias,
  diaDaSemana,
  diaValido,
  juntar,
  lerDia,
  somarDias,
  type Dia,
} from "./datas";

/** `guardrails.MAX_TEXT_CHARS`. */
export const MAX_TEXTO = 500;

// --- Classes do `re` do Python, escritas para o `RegExp` do JavaScript ------------------------

/** `\s` do Python (`str.isspace()`). */
const ESP = "[\\t-\\r\\x1c-\\x20\\x85\\xa0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000]";
/** `\w` do Python: letras, dígitos e sublinhado. */
const PAL = "[\\p{L}\\p{N}_]";
/** `\d` do Python: qualquer dígito decimal Unicode. */
const DIG = "\\p{Nd}";
/** `\b` do Python: fronteira entre `\w` e não-`\w`. */
const B = `(?:(?<=${PAL})(?!${PAL})|(?<!${PAL})(?=${PAL}))`;

const rx = (fonte: string): RegExp => new RegExp(fonte, "u");

const CONTROLE = "[\\x00-\\x08\\x0b-\\x1f\\x7f\\u200b-\\u200f\\u2028-\\u202e\\u2060\\ufeff]";
const TEM_CONTROLE = rx(CONTROLE);
const TODOS_OS_CONTROLES = new RegExp(CONTROLE, "gu");
/** Marcas de combinação, menos o U+034F (o Python não o remove: a classe dele é zero). */
const MARCAS = /(?!͏)\p{M}/gu;
const ESPACOS_NO_INICIO = new RegExp(`^${ESP}+`, "u");
const ESPACOS_NO_FIM = new RegExp(`${ESP}+$`, "u");
const SO_DIGITO = /^\p{Nd}$/u;

/** `guardrails.INJECTION_PATTERNS`: (código, padrão aplicado ao texto sem acento e minúsculo). */
const PADROES_DE_INJECAO: ReadonlyArray<readonly [string, RegExp]> = [
  [
    "ignorar_instrucoes",
    rx(
      `(ignor${PAL}*|desconsider${PAL}*|esqueca)${ESP}+(todas${ESP}+)?(as${ESP}+)?(regras|instrucoes|anteriores|previous|prior)`,
    ),
  ],
  [
    "vazar_segredo",
    rx(`${B}(chave|api[ _-]?key|senha|token|segredo|secret)${B}|variaveis? de amb`),
  ],
  [
    "pagamento",
    rx("r\\$|valor do plantao|menor valor|ordene por valor|pagamento|remuneracao"),
  ],
  [
    "forjar_campos",
    rx(`\\{${ESP}*"|"${ESP}*(unit|specialty|starts_at|approved)${ESP}*"${ESP}*:`),
  ],
  ["papel_falso", rx("voce agora e|you are now|aja como|finja ser|administrador do sistema")],
  ["sem_revisao", rx("sem (revisao|aprovacao)|aprove (todas|tudo)")],
  ["dados_pessoais", rx(`(liste|mostre|informe)${ESP}+(o${ESP}+)?(nome|crm|telefone)`)],
  ["vazar_prompt", rx("system prompt|prompt do sistema|instrucoes iniciais")],
  ["idioma_trocado", rx("answer in english|reveal |disregard|ignore previous")],
];

/** `extraction.WEEKDAYS`, na mesma ordem (a ordem decide qual alternativa casa primeiro). */
const DIAS_DA_SEMANA: ReadonlyArray<readonly [string, number]> = [
  ["segunda", 0],
  ["terca", 1],
  ["quarta", 2],
  ["quinta", 3],
  ["sexta", 4],
  ["sesta", 4],
  ["sabado", 5],
  ["domingo", 6],
  ["seg", 0],
  ["qua", 2],
  ["qui", 3],
  ["sex", 4],
  ["sab", 5],
  ["dom", 6],
];
const INDICE_DO_DIA = new Map(DIAS_DA_SEMANA);
const URGENCIAS: Readonly<Record<string, Urgencia>> = {
  alta: "high",
  media: "medium",
  baixa: "low",
};

const RE_UNIDADE_COM_NOME = rx(`modelo${ESP}+(centro|norte|sul)`);
const RE_UNIDADE_SO_ZONA = rx(`${B}(centro|norte|sul)${B}`);
const RE_HOJE = rx(`${B}hoje${B}`);
const RE_AMANHA = rx(`${B}amanha${B}`);
const RE_DATA = rx(`${B}(${DIG}{1,2})/(${DIG}{1,2})${B}`);
const RE_DIA_DA_SEMANA = rx(`${B}(${DIAS_DA_SEMANA.map(([nome]) => nome).join("|")})${B}`);
const RE_TER_ANTES_DE_HORARIO = rx(`${B}ter(?=${ESP}+${DIG})`);
const RE_PEDIATRIA = rx("pediat");
const RE_CLINICA = rx("clinic");
const RE_HORAS = rx(
  `${B}(${DIG}{1,2})${ESP}*h?${ESP}*(?:as|a|ate|-)${ESP}*(${DIG}{1,2})${ESP}*h?${B}`,
);
const RE_NOTURNO = rx("noturn|noite");
const RE_DIURNO = rx("diurn|de dia|manha|tarde");
const RE_URGENCIA_DITA = rx(`(?:urgencia|urg)${ESP}+(alta|media|baixa)`);
const RE_URGENTE = rx("urgente|critic");
const PALAVRA_ANTES = rx(`${PAL}*$`);
const PALAVRA_DEPOIS = rx(`^${PAL}*`);

// --- Normalização, limpeza e sinais de injeção (guardrails) ----------------------------------

/** `guardrails.normalize`: minúsculas e sem acentos (decompõe, tira as marcas, põe em minúsculas). */
export function normalizar(texto: string): string {
  return texto.normalize("NFKD").replace(MARCAS, "").toLowerCase();
}

/** `str.strip()` do Python (os espaços Unicode, não só os do JavaScript). */
export function aparar(texto: string): string {
  return texto.replace(ESPACOS_NO_INICIO, "").replace(ESPACOS_NO_FIM, "");
}

/** `guardrails.sanitize_text`: sem caracteres de controle nem marcadores do prompt, até 500. */
export function sanitizar(texto: string): string {
  const limpo = texto
    .replace(TODOS_OS_CONTROLES, "")
    .replaceAll("<pedido>", "")
    .replaceAll("</pedido>", "");
  // O Python corta por caractere (ponto de código), não por unidade UTF-16.
  const cortado =
    limpo.length > MAX_TEXTO ? Array.from(limpo).slice(0, MAX_TEXTO).join("") : limpo;
  return aparar(cortado);
}

/** `guardrails.detect_injection`: códigos dos sinais de injeção de prompt no texto bruto. */
export function detectarInjecao(bruto: string): string[] {
  const sinais: string[] = [];
  const tamanho = bruto.length > MAX_TEXTO ? Array.from(bruto).length : bruto.length;
  if (tamanho > MAX_TEXTO) sinais.push("texto_longo");
  if (TEM_CONTROLE.test(bruto)) sinais.push("caracteres_controle");
  const normalizado = normalizar(bruto);
  for (const [codigo, padrao] of PADROES_DE_INJECAO) {
    if (padrao.test(normalizado)) sinais.push(codigo);
  }
  return sinais;
}

// --- Extração por regras ----------------------------------------------------------------------

/** Posição no texto normalizado (índices UTF-16, como `String.prototype.slice`). */
interface Trecho {
  inicio: number;
  fim: number;
}

type Origem = "achei" | "deduzi";

interface DataAchada {
  dia: Dia;
  origem: Origem;
  trecho: Trecho;
}

interface HorasAchadas {
  /** Hora de início (0 a 23) e de fim (0 a 23; "24" vira 0). */
  inicio: number;
  fim: number;
  origem: Origem;
  trecho: Trecho;
}

/** Os cinco campos como o `ShiftFields` do Python (nomes do backend). */
export interface CamposDoBackend {
  unit_id: string | null;
  specialty: Especialidade | null;
  starts_at: string | null;
  ends_at: string | null;
  urgency: Urgencia | null;
}

export interface ExtracaoPorRegras {
  campos: CamposDoBackend;
  /** De onde veio cada campo, e onde está no texto normalizado. */
  unidade: { trecho: Trecho } | null;
  especialidade: { trecho: Trecho } | null;
  data: DataAchada | null;
  horas: HorasAchadas | null;
  urgencia: { origem: Origem; trecho: Trecho } | null;
}

/** Valor de um dígito decimal Unicode (o `int()` do Python aceita todos eles). */
function valorDoDigito(digito: string): number {
  const ponto = digito.codePointAt(0) ?? 0;
  if (ponto >= 0x30 && ponto <= 0x39) return ponto - 0x30;
  // Os dígitos decimais vêm em blocos de dez consecutivos, começando no zero.
  let inicio = ponto;
  while (inicio > 0 && SO_DIGITO.test(String.fromCodePoint(inicio - 1))) inicio--;
  return (ponto - inicio) % 10;
}

function inteiro(digitos: string): number {
  let valor = 0;
  for (const digito of digitos) valor = valor * 10 + valorDoDigito(digito);
  return valor;
}

function trechoDe(achado: RegExpExecArray): Trecho {
  // O fim do padrão de horas pode incluir os espaços que sobram; o trecho não os leva.
  const util = aparar(achado[0]).length;
  return { inicio: achado.index, fim: achado.index + util };
}

/** Amplia o achado até a palavra inteira ("pediat" vira "pediatra"). */
function palavraInteira(normalizado: string, achado: RegExpExecArray): Trecho {
  const fim = achado.index + achado[0].length;
  const antes = PALAVRA_ANTES.exec(normalizado.slice(0, achado.index));
  const depois = PALAVRA_DEPOIS.exec(normalizado.slice(fim));
  return {
    inicio: achado.index - (antes?.[0].length ?? 0),
    fim: fim + (depois?.[0].length ?? 0),
  };
}

/** `extraction._find_unit`. */
function acharUnidade(
  normalizado: string,
  unidades: readonly Unidade[],
): { id: string; trecho: Trecho } | null {
  const achado = RE_UNIDADE_COM_NOME.exec(normalizado) ?? RE_UNIDADE_SO_ZONA.exec(normalizado);
  if (!achado) return null;
  const unidade = unidades.find((u) => u.zona === achado[1]);
  return unidade ? { id: unidade.id, trecho: trechoDe(achado) } : null;
}

/**
 * `extraction._find_date`. "hoje", "amanhã" e os dias da semana viram data por dedução; só
 * `dd/mm` é lido como está escrito. O Python levantaria `ValueError` em `date(ano + 1, ...)`
 * quando a data do ano seguinte não existe; aqui o resultado é "não achei".
 */
function acharData(normalizado: string, hoje: Dia): DataAchada | null {
  let achado = RE_HOJE.exec(normalizado);
  if (achado) return { dia: hoje, origem: "deduzi", trecho: trechoDe(achado) };
  achado = RE_AMANHA.exec(normalizado);
  if (achado) return { dia: somarDias(hoje, 1), origem: "deduzi", trecho: trechoDe(achado) };
  achado = RE_DATA.exec(normalizado);
  if (achado) {
    const dia = inteiro(achado[1]!);
    const mes = inteiro(achado[2]!);
    if (!diaValido(hoje.ano, mes, dia)) return null;
    let data: Dia = { ano: hoje.ano, mes, dia };
    if (compararDias(data, hoje) < 0) {
      if (!diaValido(hoje.ano + 1, mes, dia)) return null;
      data = { ano: hoje.ano + 1, mes, dia };
    }
    return { dia: data, origem: "achei", trecho: trechoDe(achado) };
  }
  let indice: number | undefined;
  achado = RE_DIA_DA_SEMANA.exec(normalizado);
  if (achado) indice = INDICE_DO_DIA.get(achado[1]!);
  if (indice === undefined) {
    // "ter" sozinho é verbo; só vale como terça-feira quando vem antes de um horário.
    achado = RE_TER_ANTES_DE_HORARIO.exec(normalizado);
    if (achado) indice = 1;
  }
  if (indice === undefined || !achado) return null;
  const adiante = (((indice - diaDaSemana(hoje)) % 7) + 7) % 7 || 7;
  return { dia: somarDias(hoje, adiante), origem: "deduzi", trecho: trechoDe(achado) };
}

/** `extraction.extract_by_rules`, sobre o texto já limpo e normalizado. */
export function extrairPorRegras(
  normalizado: string,
  hoje: Dia,
  unidades: readonly Unidade[],
): ExtracaoPorRegras {
  let especialidade: Especialidade | null = null;
  let trechoEspecialidade: Trecho | null = null;
  let achado = RE_PEDIATRIA.exec(normalizado);
  if (achado) {
    especialidade = "pediatria";
    trechoEspecialidade = palavraInteira(normalizado, achado);
  } else if ((achado = RE_CLINICA.exec(normalizado))) {
    especialidade = "clinica_medica";
    trechoEspecialidade = palavraInteira(normalizado, achado);
  }

  let horas: HorasAchadas | null = null;
  const explicitas = RE_HORAS.exec(normalizado);
  if (explicitas && inteiro(explicitas[1]!) < 24 && inteiro(explicitas[2]!) <= 24) {
    horas = {
      inicio: inteiro(explicitas[1]!),
      fim: inteiro(explicitas[2]!) % 24,
      origem: "achei",
      trecho: trechoDe(explicitas),
    };
  } else if ((achado = RE_NOTURNO.exec(normalizado))) {
    horas = { inicio: 19, fim: 7, origem: "deduzi", trecho: palavraInteira(normalizado, achado) };
  } else if ((achado = RE_DIURNO.exec(normalizado))) {
    horas = { inicio: 7, fim: 19, origem: "deduzi", trecho: palavraInteira(normalizado, achado) };
  }

  const data = acharData(normalizado, hoje);
  let startsAt: string | null = null;
  let endsAt: string | null = null;
  if (data && horas) {
    const duracao = (((horas.fim - horas.inicio) % 24) + 24) % 24;
    if (duracao > 0) {
      startsAt = juntar(data.dia, horas.inicio);
      endsAt = juntar(data.dia, horas.inicio + duracao);
    }
  }

  let urgency: Urgencia | null = null;
  let urgencia: ExtracaoPorRegras["urgencia"] = null;
  const dita = RE_URGENCIA_DITA.exec(normalizado);
  if (dita) {
    urgency = URGENCIAS[dita[1]!] ?? null;
    urgencia = { origem: "achei", trecho: trechoDe(dita) };
  } else if ((achado = RE_URGENTE.exec(normalizado))) {
    urgency = "high";
    urgencia = { origem: "deduzi", trecho: palavraInteira(normalizado, achado) };
  }

  const unidade = acharUnidade(normalizado, unidades);
  return {
    campos: {
      unit_id: unidade?.id ?? null,
      specialty: especialidade,
      starts_at: startsAt,
      ends_at: endsAt,
      urgency,
    },
    unidade: unidade ? { trecho: unidade.trecho } : null,
    especialidade: trechoEspecialidade ? { trecho: trechoEspecialidade } : null,
    data,
    horas,
    urgencia,
  };
}

/**
 * O que o `extract()` do Python devolve com `client=None`: campos, fonte e sinais. É o que o
 * teste de paridade compara.
 */
export function extrairComoBackend(
  texto: string,
  hoje: string,
  unidades: readonly Unidade[],
): { campos: CamposDoBackend; source: "regras"; flags: string[] } {
  const flags = detectarInjecao(texto);
  const normalizado = normalizar(sanitizar(texto));
  return {
    campos: extrairPorRegras(normalizado, lerDia(hoje), unidades).campos,
    source: "regras",
    flags,
  };
}

// --- A leitura que a tela mostra ---------------------------------------------------------------

/**
 * Leva a posição do texto limpo e normalizado de volta ao texto original, quando isso é exato:
 * o texto limpo aparece inteiro no original e nenhum caractere muda de tamanho ao normalizar.
 * Fora disso (marcas soltas, controle no meio, ligaduras) devolve `null` em vez de errar.
 */
function mapeadorDePosicao(
  original: string,
  limpo: string,
): (trecho: Trecho | null | undefined) => Trecho | null {
  const deslocamento = original.indexOf(limpo);
  const coincide =
    deslocamento >= 0 && Array.from(limpo).every((c) => normalizar(c).length === c.length);
  return (trecho) =>
    coincide && trecho
      ? { inicio: deslocamento + trecho.inicio, fim: deslocamento + trecho.fim }
      : null;
}

const OBRIGATORIOS: readonly ChaveCampo[] = ["unidade", "especialidade", "inicio", "fim"];

/**
 * "Ler a vaga": os cinco campos do texto livre, cada um com a origem ("achei", "deduzi" ou
 * "nao_achei") e o trecho do texto original, mais os campos obrigatórios que ficaram em
 * branco. `hoje` é o dia do relógio da demonstração ("AAAA-MM-DD").
 */
export function lerTexto(texto: string, hoje: string, unidades: readonly Unidade[]): Leitura {
  const sinais = detectarInjecao(texto);
  const limpo = sanitizar(texto);
  const normalizado = normalizar(limpo);
  const extracao = extrairPorRegras(normalizado, lerDia(hoje), unidades);
  const noOriginal = mapeadorDePosicao(texto, limpo);
  const { campos } = extracao;

  // Início e fim saem da data e das horas juntas; só são "achei" se as duas estavam escritas.
  const horarioEscrito = extracao.data?.origem === "achei" && extracao.horas?.origem === "achei";
  const origemDoHorario = campos.starts_at === null ? "nao_achei" : horarioEscrito ? "achei" : "deduzi";

  const campo = (
    chave: ChaveCampo,
    valor: string | null,
    origem: CampoLido["origem"],
    trecho: Trecho | null | undefined,
  ): CampoLido => ({
    chave,
    valor,
    origem: valor === null ? "nao_achei" : origem,
    trecho: valor === null ? null : noOriginal(trecho),
  });

  const lidos: CampoLido[] = [
    campo("unidade", campos.unit_id, "achei", extracao.unidade?.trecho),
    campo("especialidade", campos.specialty, "achei", extracao.especialidade?.trecho),
    campo("inicio", campos.starts_at, origemDoHorario, extracao.data?.trecho),
    campo("fim", campos.ends_at, origemDoHorario, extracao.horas?.trecho),
    campo("urgencia", campos.urgency, extracao.urgencia?.origem ?? "achei", extracao.urgencia?.trecho),
  ];
  return {
    texto,
    campos: lidos,
    faltando: OBRIGATORIOS.filter((chave) => lidos.find((c) => c.chave === chave)?.valor === null),
    fonte: "regras", // sem LLM no modo demo; com sinais de injeção, nem no `live` a IA leria
    sinais,
    erroIA: null,
  };
}
