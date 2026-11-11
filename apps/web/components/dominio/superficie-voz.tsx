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
 * A superfície de uma voz. A IA tem contorno tracejado de cobalto; a pessoa, contínuo e verde;
 * a regra, uma linha fina cinza. Quando `voz` muda de "ia" para "humano", as lacunas do traço
 * se fecham (ver `.contorno-rect` em globals.css). A forma do traço, o rótulo e o ícone carregam
 * o significado; a cor só o reforça.
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
        voz === "ia" && "bg-ia-tom",
        voz === "humano" && "bg-humano-tom",
        voz === "regra" && "border border-campo bg-papel",
        className,
      )}
      {...props}
    >
      {voz !== "regra" ? (
        <svg className="contorno" aria-hidden="true" focusable="false">
          <rect className="contorno-rect" x="0" y="0" width="100%" height="100%" rx="18" ry="18" />
        </svg>
      ) : null}
      {children}
    </Tag>
  );
}
