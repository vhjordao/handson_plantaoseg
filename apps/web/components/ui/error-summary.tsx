"use client";

import * as React from "react";
import { CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ErroDeCampo {
  /** `id` do campo com problema: o link do resumo leva o foco até ele. */
  id: string;
  /** A mesma mensagem que aparece ao lado do campo. */
  mensagem: string;
}

/**
 * Resumo de erros no padrão do GOV.UK: fica acima do `h1`, recebe o foco quando uma validação
 * falha, lista cada problema com um link para o campo e anuncia por `role="alert"`.
 * Os textos vêm do mesmo objeto de erros que alimenta os campos.
 */
export function ErrorSummary({
  erros,
  titulo = "Há um problema",
  className,
}: {
  erros: ErroDeCampo[];
  titulo?: string;
  className?: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const quantidade = erros.length;

  React.useEffect(() => {
    if (quantidade > 0) ref.current?.focus();
  }, [quantidade]);

  if (quantidade === 0) return null;

  return (
    <div
      ref={ref}
      tabIndex={-1}
      className={cn("rounded-cartao border-2 border-erro bg-erro-tom p-4 text-tinta", className)}
    >
      <div role="alert">
        <h2 className="flex items-center gap-2 font-serif text-xl font-semibold text-erro">
          <CircleAlert aria-hidden="true" className="size-5 shrink-0" />
          {titulo}
        </h2>
        <ul className="mt-2 grid gap-1 pl-7">
          {erros.map((erro) => (
            <li key={erro.id}>
              <a
                href={`#${erro.id}`}
                className="font-semibold text-erro underline underline-offset-4 hover:no-underline"
                onClick={(evento) => {
                  evento.preventDefault();
                  document.getElementById(erro.id)?.focus();
                }}
              >
                {erro.mensagem}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
