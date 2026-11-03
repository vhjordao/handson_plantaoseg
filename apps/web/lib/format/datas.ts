/**
 * Datas, horas e números em português do Brasil.
 *
 * O backend guarda data e hora locais, sem fuso ("2026-10-02T19:00:00"). Para que o servidor
 * e o navegador escrevam exatamente o mesmo texto (sem erro de hidratação), o valor é lido
 * como UTC e formatado como UTC: o relógio de parede nunca é deslocado.
 */
import type { DataHora } from "@/lib/api/types";

const DIA_SEMANA = new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: "UTC" });
const DIA_MES = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "UTC",
});

function paraData(valor: DataHora): Date {
  return new Date(valor.length === 16 ? `${valor}:00Z` : `${valor}Z`);
}

/** "19h", "7h", "9h12". Sem zero à esquerda e sem minutos quando são zero. */
export function formatarHora(valor: DataHora): string {
  const data = paraData(valor);
  const hora = data.getUTCHours();
  const minuto = data.getUTCMinutes();
  return minuto === 0 ? `${hora}h` : `${hora}h${String(minuto).padStart(2, "0")}`;
}

/** "sexta, 02/10". Sem o "-feira": é como se escreve e se fala na escala. */
export function formatarDia(valor: DataHora): string {
  const data = paraData(valor);
  return `${DIA_SEMANA.format(data).replace("-feira", "")}, ${DIA_MES.format(data)}`;
}

/** "sexta, 02/10, 19h". */
export function formatarDiaHora(valor: DataHora): string {
  return `${formatarDia(valor)}, ${formatarHora(valor)}`;
}

/** "sexta, 02/10, 19h às 7h". Se o plantão passa da meia-noite, só a hora final muda. */
export function formatarIntervalo(inicio: DataHora, fim: DataHora): string {
  return `${formatarDia(inicio)}, ${formatarHora(inicio)} às ${formatarHora(fim)}`;
}

/** "quinta, 01/10, 9h". */
export function formatarAgora(valor: DataHora): string {
  return formatarDiaHora(valor);
}

const NUMERO = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const INTEIRO = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

/** "1,4". */
export function formatarNumero(valor: number, casas = 1): string {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  }).format(valor);
}

export function formatarInteiro(valor: number): string {
  return INTEIRO.format(valor);
}

/** 0,69 vira "69%". */
export function formatarPercentual(fracao: number): string {
  return `${INTEIRO.format(fracao * 100)}%`;
}

/** Espaço não separável entre número e unidade: "1,4 km", "12 h". */
export function comUnidade(valor: number, unidade: string, casas = 1): string {
  return `${NUMERO.format(Number(valor.toFixed(casas)))} ${unidade}`;
}

/** Duas datas no mesmo texto ficam coladas ao ponto de quebra de linha, não no meio da hora. */
export function semQuebra(texto: string): string {
  return texto.replace(/ (?=\d+h)/g, " ");
}
