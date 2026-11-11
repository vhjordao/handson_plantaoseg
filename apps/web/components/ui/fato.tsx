import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconeEmCirculo, type TomDoIcone } from "./painel";

/**
 * Um par rótulo e valor dentro de um `<dl>`, com o ícone em círculo do modelo visual à esquerda.
 * O ícone fica num `<dd>` escondido do leitor de tela, para a lista de definição continuar
 * válida (só `dt` e `dd` dentro do grupo).
 */
export function Fato({
  icone,
  tom = "acao",
  tamanho = "md",
  rotulo,
  rotuloOculto = false,
  children,
  className,
}: {
  icone: LucideIcon;
  tom?: TomDoIcone;
  tamanho?: "sm" | "md";
  rotulo: string;
  /** O rótulo fica só para o leitor de tela (o valor já se explica sozinho). */
  rotuloOculto?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid min-w-0 content-start items-start gap-x-3 gap-y-0.5",
        tamanho === "md" ? "grid-cols-[2.25rem_minmax(0,1fr)]" : "grid-cols-[1.75rem_minmax(0,1fr)]",
        className,
      )}
    >
      <dt className={cn("col-start-2 text-sm text-tinta-suave", rotuloOculto && "sr-only")}>{rotulo}</dt>
      <dd className="col-start-2 break-words">{children}</dd>
      <dd aria-hidden="true" className="col-start-1 row-span-2 row-start-1 self-start">
        <IconeEmCirculo icone={icone} tom={tom} tamanho={tamanho} />
      </dd>
    </div>
  );
}
