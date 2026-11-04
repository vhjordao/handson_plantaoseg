import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Etiqueta curta de estado. Sempre leva ícone e texto: a cor nunca é o único sinal.
 * `ia` usa contorno tracejado e `humano`, contínuo, como as vozes da interface.
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-campo border px-2 py-0.5 text-sm leading-5 font-medium [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      tone: {
        neutro: "border-divisor bg-papel text-tinta-suave",
        // O texto usa o tom forte: no telão escuro o texto precisa de 7:1, e o tom comum só tem 6,5:1.
        ia: "border-dashed border-ia bg-ia-tom text-ia-forte",
        humano: "border-humano bg-humano-tom text-humano",
        regra: "border-campo bg-papel text-tinta-suave",
        atencao: "border-atencao bg-atencao-tom text-atencao",
        erro: "border-erro bg-erro-tom text-erro",
      },
    },
    defaultVariants: { tone: "neutro" },
  },
);

export interface BadgeProps extends React.ComponentProps<"span">, VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span data-slot="badge" className={cn(badgeVariants({ tone }), className)} {...props} />;
}
