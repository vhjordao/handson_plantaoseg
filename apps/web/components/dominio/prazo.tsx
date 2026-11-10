"use client";

import * as React from "react";
import { lerDataHora } from "@/lib/api/demo/datas";
import { useApi } from "@/lib/api/provider";
import type { DataHora } from "@/lib/api/types";

/** O relógio do sistema, de segundo em segundo, para o prazo da oferta andar na tela. */
export function useRelogio(): DataHora | null {
  const api = useApi();
  // O contador só força o redesenho a cada segundo; a hora vem do relógio do adaptador.
  const [, setTique] = React.useState(0);
  React.useEffect(() => {
    if (!api) return;
    const id = window.setInterval(() => setTique((t) => t + 1), 1_000);
    return () => window.clearInterval(id);
  }, [api]);
  return api ? api.agora() : null;
}

/** Minutos e segundos que faltam até `expiraEm`; `null` se o prazo acabou. */
export function tempoQueFalta(
  expiraEm: DataHora,
  agora: DataHora,
): { minutos: number; segundos: number } | null {
  const restante = Math.floor((lerDataHora(expiraEm) - lerDataHora(agora)) / 1_000);
  if (restante <= 0) return null;
  return { minutos: Math.floor(restante / 60), segundos: restante % 60 };
}

/**
 * O tempo que falta, dito em texto. Não é região viva: anunciar a cada segundo atrapalharia quem
 * usa leitor de tela. A mudança de estado (aceita, recusada, expirada) aparece no status da oferta.
 */
export function TempoQueFalta({
  expiraEm,
  texto,
  encerrado,
  className,
}: {
  expiraEm: DataHora;
  texto: (minutos: number, segundos: number) => string;
  encerrado: string;
  className?: string;
}) {
  const agora = useRelogio();
  if (!agora) return null;
  const falta = tempoQueFalta(expiraEm, agora);
  return (
    <span className={className}>{falta ? texto(falta.minutos, falta.segundos) : encerrado}</span>
  );
}
