import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Esqueleto com as mesmas medidas do conteúdo, para a página não pular. É estático de propósito:
 * quem avisa que está carregando é o texto (`role="status"`) do componente que o usa.
 */
export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      data-slot="skeleton"
      className={cn("rounded-campo bg-divisor", className)}
      {...props}
    />
  );
}
