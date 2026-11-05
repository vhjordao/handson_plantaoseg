import * as React from "react";
import { CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return <label className={cn("text-base font-semibold text-tinta", className)} {...props} />;
}

const controle =
  "w-full rounded-campo border border-campo bg-papel px-3 py-2 text-base text-tinta placeholder:text-tinta-suave disabled:opacity-60 aria-[invalid=true]:border-2 aria-[invalid=true]:border-erro";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      data-slot="input"
      className={cn(controle, "min-h-[var(--alvo-min)]", className)}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(controle, "min-h-28 resize-y", className)}
      {...props}
    />
  );
}

export interface FieldProps {
  id: string;
  label: React.ReactNode;
  /** Ajuda curta, ligada ao campo por `aria-describedby`. */
  hint?: React.ReactNode;
  /** Mensagem de erro: a mesma que aparece no resumo de erros. */
  error?: string | null;
  className?: string;
  children: (aria: {
    id: string;
    "aria-describedby": string | undefined;
    "aria-invalid": true | undefined;
  }) => React.ReactNode;
}

/** Rótulo, ajuda e erro ligados ao controle, sem a pessoa precisar lembrar de nenhum `id`. */
export function Field({ id, label, hint, error, className, children }: FieldProps) {
  const hintId = hint ? `${id}-ajuda` : undefined;
  const errorId = error ? `${id}-erro` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      {hint ? (
        <p id={hintId} className="text-sm text-tinta-suave">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="flex items-start gap-1.5 text-sm font-semibold text-erro">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>
            <span className="sr-only">Erro: </span>
            {error}
          </span>
        </p>
      ) : null}
      {children({
        id,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
      })}
    </div>
  );
}
