"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

/**
 * Diálogo acessível (Radix): trava o foco, fecha com Esc e devolve o foco ao gatilho.
 * Sem animação de entrada: só o fechamento do tracejado conta como movimento da interface.
 */
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

const dialogContentVariants = cva(
  "fixed z-50 flex max-h-[90dvh] flex-col overflow-y-auto border border-divisor bg-papel text-tinta outline-none",
  {
    variants: {
      side: {
        // Gaveta de baixo no celular; caixa centralizada nas telas maiores.
        center:
          "inset-x-0 bottom-0 rounded-t-dialogo p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:inset-auto md:top-1/2 md:left-1/2 md:w-full md:max-w-lg md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-dialogo md:p-6",
        // Menu de navegação do celular.
        left: "inset-y-0 left-0 w-[88vw] max-w-sm rounded-r-dialogo p-5 pt-[max(1.25rem,env(safe-area-inset-top))]",
      },
    },
    defaultVariants: { side: "center" },
  },
);

export interface DialogContentProps
  extends React.ComponentProps<typeof DialogPrimitive.Content>,
    VariantProps<typeof dialogContentVariants> {
  /** Nome do botão de fechar para leitor de tela. */
  closeLabel?: string;
}

export function DialogContent({
  className,
  side,
  closeLabel = "Fechar",
  children,
  ...props
}: DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-tinta/55" />
      <DialogPrimitive.Content
        data-slot="dialog"
        className={cn(dialogContentVariants({ side }), className)}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          aria-label={closeLabel}
          className="absolute top-3 right-3 inline-flex size-[var(--alvo-min)] items-center justify-center rounded-campo text-tinta hover:bg-tinta/10"
        >
          <X aria-hidden="true" className="size-5" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn("pr-12 font-serif text-xl leading-tight font-semibold", className)}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn("mt-2 text-base text-tinta-suave", className)}
      {...props}
    />
  );
}
