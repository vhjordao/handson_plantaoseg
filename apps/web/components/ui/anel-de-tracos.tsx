import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Um anel de traços curtos, como um mostrador: os traços cheios mostram a proporção, e o centro
 * traz o número em texto. O desenho é só reforço (o leitor de tela lê o centro).
 */
export function AnelDeTracos({
  proporcao,
  tracos = 60,
  tamanho = 200,
  cor = "acento",
  children,
  className,
}: {
  proporcao: number;
  tracos?: number;
  tamanho?: number;
  cor?: "acento" | "humano" | "atencao" | "ia";
  children?: React.ReactNode;
  className?: string;
}) {
  const cheios = Math.round(Math.min(1, Math.max(0, proporcao)) * tracos);
  const raioFora = 48;
  const raioDentro = 39;
  const corCheia = {
    acento: "var(--acento)",
    humano: "var(--humano)",
    atencao: "var(--atencao)",
    ia: "var(--ia)",
  }[cor];
  return (
    <div className={cn("relative grid place-items-center", className)} style={{ width: tamanho, height: tamanho }}>
      <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false" className="absolute inset-0 size-full -rotate-90">
        {Array.from({ length: tracos }, (_, i) => {
          const angulo = (i / tracos) * Math.PI * 2;
          // Os traços cheios ficam um pouco mais longos, como no mostrador do modelo.
          const dentro = i < cheios ? raioDentro - 2 : raioDentro;
          return (
            <line
              key={i}
              x1={50 + Math.cos(angulo) * dentro}
              y1={50 + Math.sin(angulo) * dentro}
              x2={50 + Math.cos(angulo) * raioFora}
              y2={50 + Math.sin(angulo) * raioFora}
              stroke={i < cheios ? corCheia : "var(--grafico-trilho)"}
              strokeWidth={1.6}
              strokeLinecap="round"
            />
          );
        })}
      </svg>
      <div className="relative grid place-items-center text-center">{children}</div>
    </div>
  );
}
