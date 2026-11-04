import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";
import { Slot } from "radix-ui";
import { cn } from "@/lib/utils";

/**
 * O primário de navegação é tinta (neutro). O botão que cria uma decisão humana é verde
 * (`decision`): a cor do botão já diz quem decide.
 */
const buttonVariants = cva(
  // O rótulo pode quebrar em duas linhas (texto ampliado, espaçamento de texto: WCAG 1.4.4 e
  // 1.4.12); nunca passa da largura da tela. A altura mínima é a do alvo de toque.
  "inline-flex items-center justify-center gap-2 rounded-campo border py-2 text-center font-semibold select-none transition-colors duration-150 min-h-[var(--alvo-min)] disabled:pointer-events-none disabled:opacity-60 aria-disabled:pointer-events-none aria-disabled:opacity-60 [&_svg]:size-5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "border-tinta bg-tinta text-sobre-tinta hover:bg-tinta/90",
        decision: "border-humano bg-humano text-sobre-humano hover:bg-humano/90",
        secondary: "border-tinta bg-transparent text-tinta hover:bg-tinta/10",
        ghost: "border-transparent bg-transparent text-tinta hover:bg-tinta/10",
        link: "min-h-0 border-transparent bg-transparent p-0 text-tinta underline underline-offset-4 hover:no-underline",
      },
      size: {
        sm: "px-3 text-sm",
        md: "px-4 text-base",
        lg: "min-h-12 px-6 text-lg",
        icon: "w-[var(--alvo-min)] px-0",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  /** Renderiza o filho (por exemplo um `Link`) com a aparência do botão. */
  asChild?: boolean;
  /** Mostra o andamento sem trocar o texto, para a largura não pular. */
  loading?: boolean;
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      // Sem isto, todo <button> dentro de um formulário seria "submit" sem querer.
      {...(asChild ? {} : { type: props.type ?? "button" })}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : null}
          {children}
        </>
      )}
    </Comp>
  );
}

export { buttonVariants };
