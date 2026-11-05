import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Uma das três portas de `/entrar`. As três têm o mesmo peso: a pessoa escolhe quem quer ser,
 * e a que veio de um link para uma área específica (`?papel=`, como o QR do telão) recebe só um
 * contorno mais forte. Sem ícone: o título e a frase já dizem quem é quem. As ações ficam
 * sempre no pé do cartão, na mesma altura nas três portas.
 */
export function Porta({
  id,
  titulo,
  descricao,
  destaque = false,
  className,
  children,
}: {
  id: string;
  titulo: string;
  descricao: string;
  destaque?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={`${id}-titulo`}
      className={cn(
        "flex min-w-0 flex-col gap-4 rounded-cartao bg-papel p-5 sm:p-6",
        destaque ? "border-2 border-tinta" : "border border-divisor",
        className,
      )}
    >
      {/* Com a letra muito ampliada, até "Coordenador" quebra em vez de alargar a página. */}
      <h2 id={`${id}-titulo`} className="font-serif text-2xl font-semibold [overflow-wrap:anywhere]">
        {titulo}
      </h2>
      <p className="max-w-[40ch] text-tinta-suave [overflow-wrap:anywhere]">{descricao}</p>
      <div className="mt-auto grid gap-4 pt-2">{children}</div>
    </section>
  );
}

/** A persona fictícia que a pessoa vai ser: nome, o que faz e onde. Sempre dita como fictícia. */
export function CartaoPersona({
  nome,
  linhas,
  acao,
}: {
  nome: string;
  linhas: string[];
  /** Uma ação ao lado do nome, como "Sortear outra". */
  acao?: React.ReactNode;
}) {
  return (
    <div className="min-h-[8.75rem] rounded-campo border border-divisor bg-gaze px-3 py-2.5">
      <div className="flex flex-wrap items-start justify-between gap-x-2">
        <p className="min-w-0 font-semibold [overflow-wrap:anywhere]">{nome}</p>
        {acao}
      </div>
      {linhas.map((linha) => (
        <p key={linha} className="text-sm text-tinta-suave">
          {linha}
        </p>
      ))}
      <p className="mt-1 text-sm text-tinta-suave">Persona fictícia</p>
    </div>
  );
}
