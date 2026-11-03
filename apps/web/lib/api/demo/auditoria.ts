/**
 * A trilha de auditoria do modo `demo`: somente inserção, encadeada por hash, no mesmo formato
 * do `AuditLog` do backend (`app/audit.py`).
 *
 * O hash de cada registro é o SHA-256 do JSON canônico do registro **sem** `hash`, com as
 * chaves originais do backend (snake_case) e o mesmo texto que o Python gera:
 * `json.dumps(corpo, ensure_ascii=False, sort_keys=True)`, isto é, chaves em ordem alfabética,
 * `", "` entre os itens, `": "` entre chave e valor e nenhum caractere escapado além dos
 * obrigatórios do JSON. Assim os hashes gravados pelo Python verificam aqui, e os criados aqui
 * verificariam no Python. A trilha só guarda pseudônimos: nunca nome, CRM ou telefone.
 */
import {
  ACOES_AUDITORIA_BACKEND,
  ACOES_AUDITORIA_DESENHO,
  type AcaoAuditoria,
  type RegistroAuditoria,
  type VerificacaoCadeia,
} from "../types";
import { normalizarDataHora } from "./datas";
import { sha256Hex } from "./sha256";

/** Hash anterior do primeiro registro (`audit.GENESIS`). */
export const GENESIS = "0".repeat(64);

/** `audit.FORBIDDEN_DETAIL_KEYS`: chaves de dado pessoal que `details` nunca aceita. */
export const CHAVES_PROIBIDAS: ReadonlySet<string> = new Set([
  "name",
  "name_sim",
  "crm",
  "crm_sim",
  "phone",
  "phone_sim",
  "email",
  "cpf",
]);

const ACOES_VALIDAS: ReadonlySet<string> = new Set([
  ...ACOES_AUDITORIA_BACKEND,
  ...ACOES_AUDITORIA_DESENHO,
]);
const PAPEIS_VALIDOS: ReadonlySet<string> = new Set(["coordinator", "doctor", "system"]);

/** Ordem de `sorted()` do Python: por ponto de código, não por unidade UTF-16. */
function compararPorPontoDeCodigo(a: string, b: string): number {
  const ia = a[Symbol.iterator]();
  const ib = b[Symbol.iterator]();
  for (;;) {
    const x = ia.next();
    const y = ib.next();
    if (x.done && y.done) return 0;
    if (x.done) return -1;
    if (y.done) return 1;
    const diferenca = (x.value.codePointAt(0) ?? 0) - (y.value.codePointAt(0) ?? 0);
    if (diferenca !== 0) return diferenca;
  }
}

/**
 * O texto de `json.dumps(valor, ensure_ascii=False, sort_keys=True)` do Python. Aceita nulo,
 * booleano, inteiro seguro, texto, lista e objeto. Número fracionário não entra: o Python
 * escreve `1.0` e o JavaScript não distingue `1.0` de `1`, e o hash divergiria em silêncio.
 */
export function jsonCanonico(valor: unknown): string {
  if (valor === null) return "null";
  switch (typeof valor) {
    case "boolean":
      return valor ? "true" : "false";
    case "number":
      if (!Number.isSafeInteger(valor)) {
        throw new TypeError("A trilha de auditoria só aceita números inteiros em `details`.");
      }
      return String(valor);
    case "string":
      return JSON.stringify(valor); // o mesmo escape do Python com ensure_ascii=False
    case "object": {
      if (Array.isArray(valor)) return `[${valor.map(jsonCanonico).join(", ")}]`;
      const objeto = valor as Record<string, unknown>;
      const itens = Object.keys(objeto)
        .sort(compararPorPontoDeCodigo)
        .map((chave) => `${JSON.stringify(chave)}: ${jsonCanonico(objeto[chave])}`);
      return `{${itens.join(", ")}}`;
    }
    default:
      throw new TypeError(`Valor sem equivalente em JSON na trilha: ${typeof valor}.`);
  }
}

/** O registro sem `hash` e com as chaves do backend: o que entra no cálculo do hash. */
export function corpoDoRegistro(registro: RegistroAuditoria): Record<string, unknown> {
  return {
    seq: registro.seq,
    occurred_at: registro.ocorridoEm,
    actor_role: registro.papelAtor,
    actor_pseudo_id: registro.atorPseudoId,
    action: registro.acao,
    entity_type: registro.entidadeTipo,
    entity_id: registro.entidadeId,
    model_version: registro.modeloVersao,
    details: registro.detalhes,
    prev_hash: registro.hashAnterior,
  };
}

export function calcularHash(registro: RegistroAuditoria | Record<string, unknown>): Promise<string> {
  const corpo = "ocorridoEm" in registro ? corpoDoRegistro(registro as RegistroAuditoria) : registro;
  return sha256Hex(jsonCanonico(corpo));
}

/** Procura, em qualquer nível, uma chave de dado pessoal (o backend olha só o primeiro nível). */
function acharChaveProibida(valor: unknown): string | null {
  if (Array.isArray(valor)) {
    for (const item of valor) {
      const achada = acharChaveProibida(item);
      if (achada) return achada;
    }
  } else if (valor !== null && typeof valor === "object") {
    for (const [chave, interno] of Object.entries(valor)) {
      if (CHAVES_PROIBIDAS.has(chave.toLowerCase())) return chave;
      const achada = acharChaveProibida(interno);
      if (achada) return achada;
    }
  }
  return null;
}

export interface EntradaDeRegistro {
  ocorridoEm: string;
  papelAtor: RegistroAuditoria["papelAtor"];
  atorPseudoId: string;
  acao: AcaoAuditoria;
  entidadeTipo: string;
  entidadeId: string;
  modeloVersao?: string | null;
  detalhes?: Record<string, unknown>;
}

/**
 * O próximo registro da trilha (`AuditLog.append`): numera, encadeia no hash do anterior e
 * calcula o próprio hash. Recusa ação ou papel desconhecido e `details` com dado pessoal.
 */
export async function criarRegistro(
  anterior: RegistroAuditoria | undefined,
  entrada: EntradaDeRegistro,
): Promise<RegistroAuditoria> {
  if (!ACOES_VALIDAS.has(entrada.acao)) {
    throw new RangeError(`Ação de auditoria desconhecida: ${entrada.acao}.`);
  }
  if (!PAPEIS_VALIDOS.has(entrada.papelAtor)) {
    throw new RangeError(`Papel desconhecido: ${entrada.papelAtor}.`);
  }
  const detalhes = entrada.detalhes ?? {};
  if (acharChaveProibida(detalhes)) {
    throw new TypeError("A trilha de auditoria não aceita dado pessoal.");
  }
  const semHash: RegistroAuditoria = {
    seq: (anterior?.seq ?? 0) + 1,
    ocorridoEm: normalizarDataHora(entrada.ocorridoEm),
    papelAtor: entrada.papelAtor,
    atorPseudoId: entrada.atorPseudoId,
    acao: entrada.acao,
    entidadeTipo: entrada.entidadeTipo,
    entidadeId: entrada.entidadeId,
    modeloVersao: entrada.modeloVersao ?? null,
    detalhes: structuredClone(detalhes),
    hashAnterior: anterior?.hash ?? GENESIS,
    hash: "",
  };
  return { ...semHash, hash: await calcularHash(semHash) };
}

/**
 * Refaz a cadeia inteira (`AuditLog.verify`): cada registro tem de apontar para o hash do
 * anterior, ter o `seq` da sua posição e o hash que o próprio conteúdo produz. Devolve a
 * posição do primeiro que não confere.
 */
export async function verificarRegistros(
  registros: readonly RegistroAuditoria[],
): Promise<VerificacaoCadeia> {
  let anterior = GENESIS;
  for (const [indice, registro] of registros.entries()) {
    const posicao = indice + 1;
    const confere =
      registro.hashAnterior === anterior &&
      registro.seq === posicao &&
      registro.hash === (await calcularHash(registro));
    if (!confere) return { integra: false, registros: registros.length, primeiroInvalido: posicao };
    anterior = registro.hash;
  }
  return { integra: true, registros: registros.length, primeiroInvalido: null };
}
