import { cn } from "@/lib/utils";

/**
 * O símbolo: um anel cuja metade é tracejada (a IA sugere) e a outra, um arco contínuo (a
 * pessoa decide). `fechado` é o anel inteiro e contínuo: a decisão já foi tomada.
 */
export function SimboloPlantao({
  variante = "dividido",
  className,
}: {
  variante?: "dividido" | "fechado" | "mono";
  className?: string;
}) {
  const ia = variante === "mono" ? "currentColor" : "var(--ia)";
  const humano = variante === "mono" ? "currentColor" : "var(--humano)";
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
      className={cn("size-8 shrink-0", className)}
    >
      {variante === "fechado" ? (
        <circle cx="16" cy="16" r="10" fill="none" stroke={humano} strokeWidth="3" />
      ) : (
        <>
          <path
            d="M16 26 A10 10 0 0 1 16 6"
            fill="none"
            stroke={ia}
            strokeWidth="3"
            strokeDasharray="3.4 2.6"
          />
          <path d="M16 6 A10 10 0 0 1 16 26" fill="none" stroke={humano} strokeWidth="3" />
        </>
      )}
    </svg>
  );
}

/**
 * Símbolo e nome. O nome fica em uma só fonte e um só peso: é uma marca, não um título.
 *
 * Com `compacta`, num contêiner (`@container`) mais estreito que 22 rem sobra só o símbolo, para
 * o cabeçalho caber numa linha; o nome continua para o leitor de tela. A conta é em `rem` de
 * propósito: com a letra ampliada, 22 rem ficam mais largos, e a marca encolhe antes.
 */
export function MarcaPlantao({
  className,
  compacta = false,
}: {
  className?: string;
  compacta?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <SimboloPlantao />
      <span
        className={cn(
          "font-titulo text-xl font-bold text-tinta",
          compacta && "@max-[22rem]:sr-only",
        )}
        translate="no"
      >
        PlantãoSeguro
      </span>
    </span>
  );
}
