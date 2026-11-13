/**
 * A trilha de auditoria do sistema real, lida do banco sob RLS e verificada no navegador.
 *
 * No banco, o hash de cada registro é calculado pelo próprio Postgres (`private.audit_log_hash`,
 * migração `trilha_de_auditoria`): o SHA-256 do texto de um `jsonb_build_object(...)`. Esse texto
 * tem regras do `jsonb`, diferentes do `json.dumps` do Python que o modo de demonstração segue:
 *
 * - as chaves saem ordenadas **pelo tamanho** e, entre iguais, pelos bytes;
 * - `", "` entre os itens e `": "` entre chave e valor;
 * - o horário é `to_char(... at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;
 * - os números de `details` saem como foram gravados (por isso a leitura pede `details::text`).
 *
 * A cadeia é uma só para o banco inteiro, e o coordenador só vê as linhas da organização dele. A
 * verificação recalcula o hash de **cada** linha visível e confere o elo entre vizinhas; onde há
 * um salto de `seq` (linhas de outra organização), o elo não pode ser conferido daqui, e isso é
 * dito como lacuna, não como quebra.
 */
import type { DataHora, RegistroAuditoria, VerificacaoCadeia } from "../types";
import { sha256Hex } from "../demo/sha256";
import { localDoBanco } from "./tempo";

/** Uma linha de `audit_log` como a tela pede ao banco. */
export interface RegistroDoBanco {
  seq: number;
  occurred_at: string;
  organization_id: string | null;
  actor_role: "coordinator" | "doctor" | "system";
  actor_pseudo_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  model_version: string | null;
  details: Record<string, unknown>;
  /** `details::text`: o texto exato do `jsonb`, que entra no hash. */
  details_texto: string;
  prev_hash: string;
  hash: string;
}

export const COLUNAS_DA_TRILHA =
  "seq,occurred_at,organization_id,actor_role,actor_pseudo_id,action,entity_type,entity_id,model_version,details,details_texto:details::text,prev_hash,hash";

/**
 * O horário no formato do hash: UTC, com seis casas de microssegundo e "Z". Aceita o texto do
 * Postgres ("2026-11-04 19:50:49.004102+00") e o do PostgREST ("2026-11-04T19:50:49.004102+00:00").
 * Os microssegundos não passam pelo `Date` do JavaScript, que só guarda milissegundos.
 */
export function horarioDoHash(texto: string): string {
  const m = texto
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?\s*(Z|[+-]\d{2}(?::?\d{2})?)?$/);
  if (!m) throw new Error(`Horário fora do formato esperado: ${texto}`);
  const [, ano, mes, dia, hora, minuto, segundo, fracao = "", fuso = "Z"] = m;
  let deslocamentoMin = 0;
  if (fuso !== "Z") {
    const sinal = fuso.startsWith("-") ? -1 : 1;
    const digitos = fuso.slice(1).replace(":", "");
    deslocamentoMin = sinal * (Number(digitos.slice(0, 2)) * 60 + Number(digitos.slice(2) || "0"));
  }
  const utc = new Date(
    Date.UTC(Number(ano), Number(mes) - 1, Number(dia), Number(hora), Number(minuto), Number(segundo)) -
      deslocamentoMin * 60_000,
  );
  const p = (n: number, t = 2) => String(n).padStart(t, "0");
  const data = `${utc.getUTCFullYear()}-${p(utc.getUTCMonth() + 1)}-${p(utc.getUTCDate())}`;
  const horaUtc = `${p(utc.getUTCHours())}:${p(utc.getUTCMinutes())}:${p(utc.getUTCSeconds())}`;
  return `${data}T${horaUtc}.${fracao.padEnd(6, "0")}Z`;
}

/** Um texto em JSON, com as mesmas fugas do `jsonb` (que coincidem com as do `JSON.stringify`). */
const texto = (valor: string | null) => (valor === null ? "null" : JSON.stringify(valor));

/** O texto que o Postgres resume no hash, com as chaves já na ordem do `jsonb`. */
export function textoDoHash(r: RegistroDoBanco): string {
  // Ordem do jsonb: pelo tamanho da chave e, entre iguais, pelos bytes.
  return (
    `{"seq": ${r.seq}, "action": ${texto(r.action)}, "details": ${r.details_texto}, ` +
    `"entity_id": ${texto(r.entity_id)}, "prev_hash": ${texto(r.prev_hash)}, ` +
    `"actor_role": ${texto(r.actor_role)}, "entity_type": ${texto(r.entity_type)}, ` +
    `"occurred_at": ${texto(horarioDoHash(r.occurred_at))}, "model_version": ${texto(r.model_version)}, ` +
    `"actor_pseudo_id": ${texto(r.actor_pseudo_id)}, "organization_id": ${texto(r.organization_id)}}`
  );
}

export function hashDoRegistro(r: RegistroDoBanco): Promise<string> {
  return sha256Hex(textoDoHash(r));
}

/**
 * O horário do registro na hora local de São Paulo, sem fuso, como a tela usa em toda parte. O
 * banco devolve o instante com fuso ("2026-11-04T19:50:49.004102+00:00", ou "+00" no texto do
 * Postgres); passado cru, a tela acrescentava um "Z" e a data ficava inválida, e a formatação
 * derrubava a página da auditoria (13/11/2026).
 */
export function horarioDaTela(occurredAt: string): DataHora {
  const utc = horarioDoHash(occurredAt); // "2026-11-04T19:50:49.004102Z"
  return localDoBanco(`${utc.slice(0, 23)}Z`);
}

/** A linha do banco no formato da tela. */
export function registroDoBanco(r: RegistroDoBanco): RegistroAuditoria {
  return {
    seq: r.seq,
    ocorridoEm: horarioDaTela(r.occurred_at),
    papelAtor: r.actor_role,
    atorPseudoId: r.actor_pseudo_id,
    acao: r.action as RegistroAuditoria["acao"],
    entidadeTipo: r.entity_type,
    entidadeId: r.entity_id,
    modeloVersao: r.model_version,
    detalhes: r.details ?? {},
    hashAnterior: r.prev_hash,
    hash: r.hash,
  };
}

/**
 * Confere as linhas visíveis, em ordem de `seq`: o hash de cada uma e, entre vizinhas sem salto,
 * o elo (`prev_hash` igual ao `hash` da anterior). A primeira linha do banco (`seq` 1) também
 * confere o início da cadeia. Os saltos de `seq` viram `lacunas`.
 */
export async function verificarTrilhaDoBanco(linhas: readonly RegistroDoBanco[]): Promise<VerificacaoCadeia> {
  const ordenadas = [...linhas].sort((a, b) => a.seq - b.seq);
  let lacunas = 0;
  let anterior: RegistroDoBanco | null = null;
  for (const linha of ordenadas) {
    const elo =
      anterior === null
        ? linha.seq !== 1 || linha.prev_hash === "0".repeat(64)
        : linha.seq !== anterior.seq + 1 || linha.prev_hash === anterior.hash;
    if (anterior !== null && linha.seq !== anterior.seq + 1) lacunas += linha.seq - anterior.seq - 1;
    if (anterior === null && linha.seq > 1) lacunas += linha.seq - 1;
    const confere = elo && (await hashDoRegistro(linha)) === linha.hash;
    if (!confere) return { integra: false, registros: ordenadas.length, primeiroInvalido: linha.seq, lacunas };
    anterior = linha;
  }
  return { integra: true, registros: ordenadas.length, primeiroInvalido: null, lacunas };
}
