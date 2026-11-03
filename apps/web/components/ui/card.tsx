import * as React from "react";
import { cn } from "@/lib/utils";

/** Superfície neutra: borda e tom, sem sombra. As vozes da IA e da pessoa usam `SuperficieVoz`. */
export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn("rounded-cartao border border-divisor bg-papel", className)}
      {...props}
    />
  );
}
