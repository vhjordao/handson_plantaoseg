import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Uma das três portas de `/entrar`. As três têm o mesmo peso: a pessoa escolhe quem quer ser,
 * e a que veio de um link para uma área específica (`?papel=`) recebe só um contorno mais forte.
 */
export function Porta({
  id,
  icone: Icone,
  titulo,
  descricao,
  destaque = false,
  className,
  children,
}: {
  id: string;
  icone: LucideIcon;
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
        "flex flex-col gap-4 rounded-cartao bg-papel p-5 sm:p-6",
        destaque ? "border-2 border-tinta" : "border border-divisor",
        className,
      )}
    >
      <Icone aria-hidden="true" className="size-7 text-tinta-suave" />
      <h2 id={`${id}-titulo`} className="font-serif text-2xl font-semibold">
        {titulo}
      </h2>
      <p className="max-w-[40ch] text-tinta-suave">{descricao}</p>
      <div className="grid gap-4 pt-2">{children}</div>
    </section>
  );
}

/** A persona fictícia que a pessoa vai ser: nome, o que faz e onde. Sempre dita como fictícia. */
export function CartaoPersona({
  nome,
  linhas,
}: {
  nome: string;
  linhas: string[];
}) {
  return (
    <div className="rounded-campo border border-divisor bg-gaze px-3 py-2.5">
      <p className="font-semibold">{nome}</p>
      {linhas.map((linha) => (
        <p key={linha} className="text-sm text-tinta-suave">
          {linha}
        </p>
      ))}
      <p className="mt-1 text-sm text-tinta-suave">Persona fictícia</p>
    </div>
  );
}
