import { VOZES, type ChaveVoz } from "@/lib/copy/comum";
import { cn } from "@/lib/utils";
import { VozTag } from "./voz-tag";

const ORDEM: ChaveVoz[] = ["ia", "humano", "regra"];

/**
 * Ensina a ler a interface: o que o traço tracejado, o contínuo e o cinza querem dizer.
 * `tamanho="telao"` leva a escala da sala (corpo de 28 px ou mais), para ler a 15 m.
 */
export function LegendaVozes({
  className,
  tamanho = "normal",
}: {
  className?: string;
  tamanho?: "normal" | "telao";
}) {
  const telao = tamanho === "telao";
  return (
    <ul aria-label="Como ler as telas" role="list" className={cn("grid", telao ? "gap-4" : "gap-2", className)}>
      {ORDEM.map((voz) => (
        <li key={voz} className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <VozTag
            voz={voz}
            className={telao ? "px-3 py-1 text-[1.5rem] leading-8 [&_svg]:size-6" : undefined}
          />
          <span className={cn("text-tinta-suave", telao ? "text-[1.75rem] leading-9" : "text-sm")}>
            {VOZES[voz].legenda}: {VOZES[voz].explicacao.charAt(0).toLowerCase()}
            {VOZES[voz].explicacao.slice(1)}
          </span>
        </li>
      ))}
    </ul>
  );
}
