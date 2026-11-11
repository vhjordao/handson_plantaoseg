"use client";

import * as React from "react";
import { lerDataHora } from "@/lib/api/demo/datas";
import { useApi } from "@/lib/api/provider";
import type { DataHora } from "@/lib/api/types";
import { AnelDeTracos } from "@/components/ui/anel-de-tracos";

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

/**
 * O prazo da oferta num anel de traços, como o mostrador do modelo visual: os traços cheios são o
 * tempo que ainda resta do prazo inteiro (`ttlMin`). O mesmo tempo já está em texto ao lado, então
 * o anel inteiro fica fora da leitura de tela.
 */
export function AnelDoPrazo({ expiraEm, ttlMin }: { expiraEm: DataHora; ttlMin: number }) {
  const agora = useRelogio();
  if (!agora) return null;
  const falta = tempoQueFalta(expiraEm, agora);
  const restanteS = falta ? falta.minutos * 60 + falta.segundos : 0;
  const proporcao = ttlMin > 0 ? restanteS / (ttlMin * 60) : 0;
  const pouco = proporcao < 0.25;
  return (
    <div aria-hidden="true">
      <AnelDeTracos proporcao={proporcao} tamanho={148} tracos={48} cor={pouco ? "atencao" : "acento"}>
        <p className="numero-destaque text-[2rem] leading-none text-tinta">
          {falta ? `${falta.minutos}:${String(falta.segundos).padStart(2, "0")}` : "0:00"}
        </p>
        <p className="mt-1 text-xs text-tinta-suave">{falta ? "para responder" : "prazo encerrado"}</p>
      </AnelDeTracos>
    </div>
  );
}
