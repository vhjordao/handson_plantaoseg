import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { CircleAlert, CircleCheck, Info, TriangleAlert, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "flex items-start gap-3 rounded-cartao border p-4 text-base text-tinta [&_svg]:mt-0.5 [&_svg]:size-5 [&_svg]:shrink-0",
  {
    variants: {
      tone: {
        info: "border-painel-borda bg-painel shadow-cartao backdrop-blur-xl [&_svg]:text-acento",
        atencao: "border-atencao bg-atencao-tom [&_svg]:text-atencao",
        erro: "border-erro bg-erro-tom [&_svg]:text-erro",
        sucesso: "border-humano bg-humano-tom [&_svg]:text-humano",
      },
    },
    defaultVariants: { tone: "info" },
  },
);

const ICONES: Record<NonNullable<VariantProps<typeof alertVariants>["tone"]>, LucideIcon> = {
  info: Info,
  atencao: TriangleAlert,
  erro: CircleAlert,
  sucesso: CircleCheck,
};

export interface AlertProps
  extends Omit<React.ComponentProps<"div">, "title">,
    VariantProps<typeof alertVariants> {
  title?: React.ReactNode;
}

/** Aviso com ícone e texto. Só o erro é anunciado na hora (`role="alert"`). */
export function Alert({ className, tone = "info", title, children, ...props }: AlertProps) {
  const Icone = ICONES[tone ?? "info"];
  return (
    <div
      data-slot="alert"
      role={tone === "erro" ? "alert" : undefined}
      className={cn(alertVariants({ tone }), className)}
      {...props}
    >
      <Icone aria-hidden="true" />
      {/* Com a letra muito ampliada, uma palavra longa quebra em vez de passar da tela. */}
      <div className="grid min-w-0 grid-cols-1 gap-1 [overflow-wrap:anywhere]">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className="text-tinta">{children}</div> : null}
      </div>
    </div>
  );
}
