import * as React from "react";
import type { ChaveVoz } from "@/lib/copy/comum";
import { cn } from "@/lib/utils";

type Etiqueta = "div" | "li" | "article" | "section";

export interface SuperficieVozProps extends React.ComponentProps<"div"> {
  voz: ChaveVoz;
  /** Elemento HTML a renderizar (por exemplo `li` dentro de uma lista). */
  as?: Etiqueta;
}

/**
 * A superfície de uma voz. A IA tem fundo em degradê azul e anil, com borda suave e um brilho
 * no alto (como o cartão de "insights" do modelo visual); a pessoa, fundo verde e borda verde;
 * a regra, papel com uma linha fina cinza. Quando `voz` muda de "ia" para "humano", o fundo
 * passa ao verde e o selo assenta. O rótulo e o ícone de cada voz carregam o significado; a cor
 * só o reforça (WCAG 1.4.1). Os estilos ficam em globals.css (`.voz-ia`, `.voz-humano`).
 */
export function SuperficieVoz({
  voz,
  as: Etiqueta = "div",
  className,
  children,
  ...props
}: SuperficieVozProps) {
  const Tag = Etiqueta as React.ElementType;
  return (
    <Tag
      data-voz={voz}
      className={cn(
        "relative rounded-cartao",
        voz === "ia" && "voz-ia",
        voz === "humano" && "voz-humano",
        voz === "regra" && "border border-campo/60 bg-painel shadow-cartao backdrop-blur-xl",
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}
