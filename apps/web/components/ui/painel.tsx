import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * O tom do ícone em círculo. Cada tom já tem significado na plataforma: `acao` é o azul da
 * interação, `ia` a voz da IA, `humano` a decisão de uma pessoa, `atencao` o alerta e `neutro`
 * o resto. O ícone nunca é o único sinal: o título do painel diz o que ele é.
 */
const TONS = {
  neutro: "text-tinta-suave",
  acao: "text-acento",
  ia: "text-ia",
  humano: "text-humano",
  atencao: "text-atencao",
  erro: "text-erro",
} as const;

export type TomDoIcone = keyof typeof TONS;

/** O ícone num círculo de papel, como no cabeçalho de cada painel. */
export function IconeEmCirculo({
  icone: Icone,
  tom = "neutro",
  tamanho = "md",
  className,
}: {
  icone: LucideIcon;
  tom?: TomDoIcone;
  tamanho?: "sm" | "md";
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full border border-divisor/70 bg-papel shadow-cartao",
        tamanho === "md" ? "size-9 [&_svg]:size-[18px]" : "size-7 [&_svg]:size-4",
        TONS[tom],
        className,
      )}
    >
      <Icone />
    </span>
  );
}

/** O painel do modelo: papel translúcido, raio de cartão e sombra suave (`superficie`). */
export function Painel({
  as: Tag = "section",
  className,
  ...props
}: React.ComponentProps<"section"> & { as?: "section" | "div" | "article" | "li" | "aside" }) {
  const Componente = Tag as React.ElementType;
  return <Componente data-slot="painel" className={cn("superficie p-4 sm:p-5", className)} {...props} />;
}

/**
 * O cabeçalho de um painel: ícone em círculo, título e, à direita, um acessório opcional (uma
 * etiqueta ou um link). O título é um cabeçalho de verdade, no nível que a página pede.
 */
export function CabecalhoDoPainel({
  icone,
  tom,
  titulo,
  id,
  nivel = "h2",
  acessorio,
  className,
}: {
  icone: LucideIcon;
  tom?: TomDoIcone;
  titulo: React.ReactNode;
  id?: string;
  nivel?: "h2" | "h3";
  acessorio?: React.ReactNode;
  className?: string;
}) {
  const Titulo = nivel;
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <IconeEmCirculo icone={icone} tom={tom} />
      <Titulo id={id} className="min-w-0 flex-1 font-titulo text-base leading-6 font-semibold">
        {titulo}
      </Titulo>
      {acessorio ? <div className="shrink-0">{acessorio}</div> : null}
    </div>
  );
}
