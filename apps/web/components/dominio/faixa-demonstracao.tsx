import { FlaskConical } from "lucide-react";
import { FAIXA_DEMONSTRACAO } from "@/lib/copy/comum";
import { cn } from "@/lib/utils";

/** O aviso permanente de que tudo aqui é simulação. Vem com ícone e texto, em toda a plataforma. */
export function FaixaDemonstracao({ className }: { className?: string }) {
  return (
    <div
      role="note"
      aria-label="Aviso de demonstração"
      className={cn(
        "flex items-center justify-center gap-2 bg-atencao-tom px-4 py-1.5 text-center text-sm font-medium text-atencao",
        className,
      )}
    >
      <FlaskConical aria-hidden="true" className="size-4 shrink-0" />
      <p>{FAIXA_DEMONSTRACAO}</p>
    </div>
  );
}
