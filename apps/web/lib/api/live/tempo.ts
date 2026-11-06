/**
 * O relógio do sistema real, em hora local de São Paulo e sem fuso, como a API e a tela usam.
 * São Paulo não tem horário de verão desde 2019: a diferença para o UTC é sempre de 3 horas.
 */
import { formatarDataHora, normalizarDataHora } from "../demo/datas";
import type { DataHora } from "../types";

const SAO_PAULO_MS = -3 * 60 * 60 * 1000;

/** Agora, em São Paulo (3.5 do roteiro: o relógio vem do sistema, não de um valor fixo). */
export function agoraLocal(agoraMs: number = Date.now()): DataHora {
  return formatarDataHora(agoraMs + SAO_PAULO_MS);
}

/** Um instante do banco ("2026-11-07T22:00:00+00:00") em hora local de São Paulo. */
export function localDoBanco(instante: string): DataHora {
  const ms = Date.parse(instante);
  if (Number.isNaN(ms)) throw new RangeError(`Instante inválido: "${instante}".`);
  return formatarDataHora(ms + SAO_PAULO_MS);
}

/** Uma hora local da API ("2026-11-07T19:00:00" ou com fração) no formato da tela. */
export function localDaApi(valor: string): DataHora {
  return normalizarDataHora(valor.slice(0, 19));
}

/** Um instante em ISO com fuso, para filtrar no banco ("publicada nos últimos 30 dias"). */
export function instanteAntes(dias: number, agoraMs: number = Date.now()): string {
  return new Date(agoraMs - dias * 24 * 60 * 60 * 1000).toISOString();
}
