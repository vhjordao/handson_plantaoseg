"use client";

import { CircleAlert } from "lucide-react";

/**
 * Um grupo de opções exclusivas, com `fieldset` e rádios nativos: o teclado (setas) e o leitor de
 * tela já funcionam sem nada a mais. O erro fica ligado ao grupo por `aria-describedby`.
 */
export function Opcoes<T extends string>({
  nome,
  legenda,
  opcoes,
  valor,
  aoMudar,
  erro,
}: {
  nome: string;
  legenda: string;
  opcoes: readonly { valor: T; rotulo: string }[];
  valor: T | null;
  aoMudar: (valor: T) => void;
  erro?: string | null;
}) {
  const erroId = erro ? `${nome}-erro` : undefined;
  return (
    <fieldset aria-describedby={erroId} className="grid gap-2">
      <legend className="mb-1 font-semibold">{legenda}</legend>
      {erro ? (
        <p id={erroId} className="flex items-start gap-1.5 text-sm font-semibold text-erro">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>
            <span className="sr-only">Erro: </span>
            {erro}
          </span>
        </p>
      ) : null}
      {opcoes.map((opcao) => {
        const id = `${nome}-${opcao.valor}`;
        return (
          <label
            key={opcao.valor}
            htmlFor={id}
            className="flex min-h-[var(--alvo-min)] cursor-pointer items-center gap-3 rounded-campo border border-campo bg-papel px-3.5 py-2 transition-[border-color,background-color] duration-150 hover:border-tinta-suave has-[:checked]:border-2 has-[:checked]:border-acento has-[:checked]:bg-acento-tom has-[:checked]:font-semibold"
          >
            <input
              id={id}
              type="radio"
              name={nome}
              value={opcao.valor}
              checked={valor === opcao.valor}
              onChange={() => aoMudar(opcao.valor)}
              className="size-5 shrink-0 accent-[var(--tinta)]"
            />
            {opcao.rotulo}
          </label>
        );
      })}
    </fieldset>
  );
}
