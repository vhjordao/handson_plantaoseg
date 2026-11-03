/**
 * Datas e horas "locais" da demonstração, sem fuso: "2026-10-01T09:00:00".
 *
 * Todas as contas são feitas em UTC só como régua (nunca como horário de verdade), para que o
 * horário de verão e o fuso do navegador não mudem o resultado. A semana segue o Python:
 * `diaDaSemana` devolve 0 para segunda-feira e 6 para domingo, como `date.weekday()`.
 */
import type { DataHora } from "../types";

const PADRAO = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;
const MS_POR_MINUTO = 60_000;
const MS_POR_DIA = 86_400_000;

export interface Dia {
  ano: number;
  mes: number;
  dia: number;
}

/** "AAAA-MM-DDTHH:MM[:SS]" em milissegundos desde a época (régua em UTC). */
export function lerDataHora(valor: string): number {
  const partes = PADRAO.exec(valor);
  if (!partes) throw new RangeError(`Data e hora inválida: "${valor}".`);
  const [ano, mes, dia, hora, minuto, segundo] = partes.slice(1).map((p) => Number(p ?? 0));
  return Date.UTC(ano ?? 0, (mes ?? 1) - 1, dia, hora, minuto, segundo);
}

/** Milissegundos (régua em UTC) para "AAAA-MM-DDTHH:MM:SS". */
export function formatarDataHora(ms: number): DataHora {
  return new Date(ms).toISOString().slice(0, 19);
}

/** Acrescenta os segundos que faltam ("2026-10-02T19:00" vira "2026-10-02T19:00:00"). */
export function normalizarDataHora(valor: string): DataHora {
  return formatarDataHora(lerDataHora(valor));
}

export function somarMinutos(valor: string, minutos: number): DataHora {
  return formatarDataHora(lerDataHora(valor) + Math.round(minutos * MS_POR_MINUTO));
}

/** Minutos de `menor` até `maior` (negativo se `maior` for anterior). */
export function minutosEntre(maior: string, menor: string): number {
  return (lerDataHora(maior) - lerDataHora(menor)) / MS_POR_MINUTO;
}

/** O dia de uma data e hora, como "AAAA-MM-DD". */
export function diaDe(valor: string): string {
  return normalizarDataHora(valor).slice(0, 10);
}

export function lerDia(valor: string): Dia {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
  if (!partes) throw new RangeError(`Dia inválido: "${valor}".`);
  return { ano: Number(partes[1]), mes: Number(partes[2]), dia: Number(partes[3]) };
}

export function formatarDia({ ano, mes, dia }: Dia): string {
  return new Date(Date.UTC(ano, mes - 1, dia)).toISOString().slice(0, 10);
}

/** O dia existe no calendário? (29/02 só em ano bissexto, 31/04 nunca.) */
export function diaValido(ano: number, mes: number, dia: number): boolean {
  if (mes < 1 || mes > 12 || dia < 1) return false;
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia;
}

export function somarDias({ ano, mes, dia }: Dia, dias: number): Dia {
  const data = new Date(Date.UTC(ano, mes - 1, dia) + dias * MS_POR_DIA);
  return { ano: data.getUTCFullYear(), mes: data.getUTCMonth() + 1, dia: data.getUTCDate() };
}

/** Negativo se `a` vem antes de `b`, zero se são o mesmo dia. */
export function compararDias(a: Dia, b: Dia): number {
  return a.ano - b.ano || a.mes - b.mes || a.dia - b.dia;
}

/** 0 = segunda-feira ... 6 = domingo, como `date.weekday()` do Python. */
export function diaDaSemana({ ano, mes, dia }: Dia): number {
  return (new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay() + 6) % 7;
}

/** O dia e a hora cheia, como "AAAA-MM-DDTHH:00:00". */
export function juntar(dia: Dia, hora: number): DataHora {
  return formatarDataHora(Date.UTC(dia.ano, dia.mes - 1, dia.dia, hora));
}
