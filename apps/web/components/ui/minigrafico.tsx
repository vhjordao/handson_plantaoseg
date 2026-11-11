import { cn } from "@/lib/utils";

const CORES = {
  rosa: "bg-grafico-rosa",
  verde: "bg-grafico-verde",
  azul: "bg-grafico-azul",
  laranja: "bg-grafico-laranja",
  coral: "bg-grafico-coral",
} as const;

export type CorDoGrafico = keyof typeof CORES;

export interface Barra {
  rotulo: string;
  valor: number;
  /** A barra em destaque fica cheia; as outras, no trilho. */
  destaque?: boolean;
}

/**
 * Barras verticais pequenas, para comparar poucos valores lado a lado (por exemplo, o tempo do
 * processo manual contra o do modelo). Os números também ficam em texto, então o gráfico é um
 * reforço visual e se esconde do leitor de tela.
 */
export function BarrasComparadas({
  barras,
  cor = "azul",
  altura = 56,
  className,
}: {
  barras: Barra[];
  cor?: CorDoGrafico;
  altura?: number;
  className?: string;
}) {
  const maximo = Math.max(...barras.map((b) => b.valor), 1);
  return (
    <div aria-hidden="true" className={cn("flex items-end gap-1.5", className)} style={{ height: altura }}>
      {barras.map((barra) => (
        <div key={barra.rotulo} className="flex h-full flex-1 flex-col justify-end" title={barra.rotulo}>
          <div
            className={cn(
              "w-full rounded-t-[5px] rounded-b-[2px]",
              barra.destaque ? CORES[cor] : "bg-grafico-trilho",
            )}
            style={{ height: `${Math.max(8, (barra.valor / maximo) * 100)}%` }}
          />
        </div>
      ))}
    </div>
  );
}

/**
 * Uma faixa de traços finos, como uma régua: a parte cheia mostra a proporção. É o "progresso"
 * do modelo, usado para proporções que também aparecem em texto.
 */
export function ReguaDeProgresso({
  proporcao,
  tracos = 48,
  className,
  cor = "acento",
}: {
  proporcao: number;
  tracos?: number;
  className?: string;
  cor?: "acento" | "humano" | "atencao";
}) {
  const cheios = Math.round(Math.min(1, Math.max(0, proporcao)) * tracos);
  const corCheia = cor === "humano" ? "bg-humano" : cor === "atencao" ? "bg-atencao" : "bg-acento";
  return (
    <div aria-hidden="true" className={cn("flex h-7 items-stretch gap-[3px]", className)}>
      {Array.from({ length: tracos }, (_, i) => (
        <span
          key={i}
          className={cn("w-full min-w-px flex-1 rounded-full", i < cheios ? corCheia : "bg-grafico-trilho")}
        />
      ))}
    </div>
  );
}
