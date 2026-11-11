import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * O cabeçalho de uma página da plataforma: título grande e leve à esquerda e, na mesma linha,
 * as ações da página à direita (a principal em botão escuro), como no modelo visual. No celular
 * as ações descem para baixo do título.
 */
export function CabecalhoDePagina({
  titulo,
  descricao,
  acoes,
  id,
  antes,
  className,
}: {
  titulo: React.ReactNode;
  descricao?: React.ReactNode;
  acoes?: React.ReactNode;
  id?: string;
  /** Algo antes do título, como o link de volta ou uma etiqueta. */
  antes?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-wrap items-end justify-between gap-x-6 gap-y-3", className)}>
      <div className="min-w-0">
        {antes}
        <h1 id={id} className="font-titulo text-[1.75rem] leading-9 font-medium sm:text-[2rem] sm:leading-10">
          {titulo}
        </h1>
        {descricao ? <p className="mt-1 max-w-[62ch] text-tinta-suave">{descricao}</p> : null}
      </div>
      {acoes ? <div className="flex flex-wrap items-center gap-2">{acoes}</div> : null}
    </header>
  );
}
