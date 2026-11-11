import { VOZES, type ChaveVoz } from "@/lib/copy/comum";
import { cn } from "@/lib/utils";
import { VozTag } from "./voz-tag";

const ORDEM: ChaveVoz[] = ["ia", "humano", "regra"];

/**
 * Ensina a ler a interface: o que o azul da IA, o verde da decisão e o cinza da regra querem dizer.
 */
export function LegendaVozes({ className }: { className?: string }) {
  return (
    <ul aria-label="Como ler as telas" role="list" className={cn("grid gap-2", className)}>
      {ORDEM.map((voz) => (
        <li key={voz} className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <VozTag voz={voz} />
          <span className="text-sm text-tinta-suave">
            {VOZES[voz].legenda}: {VOZES[voz].explicacao.charAt(0).toLowerCase()}
            {VOZES[voz].explicacao.slice(1)}
          </span>
        </li>
      ))}
    </ul>
  );
}
