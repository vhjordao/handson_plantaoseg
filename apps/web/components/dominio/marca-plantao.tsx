import { cn } from "@/lib/utils";

/**
 * O logo: uma cruz em dois tons sobre um quadrado anil (escolhido pelo Victor em 11/11/2026).
 * A barra vertical é verde clara e a horizontal, branca. O fundo vem do token `--logo-fundo`,
 * mais claro no tema escuro para não sumir no papel escuro. É imagem decorativa: o nome da
 * marca vem sempre em texto ao lado, ou no rótulo do link.
 */
export function LogoPlantao({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
      className={cn("size-8 shrink-0", className)}
    >
      <rect width="32" height="32" rx="9" fill="var(--logo-fundo)" />
      <rect x="7.5" y="13" width="17" height="6" rx="3" fill="#ffffff" />
      <rect x="13" y="7.5" width="6" height="17" rx="3" fill="#8fe3bf" />
    </svg>
  );
}

/**
 * O símbolo das vozes: um anel cuja metade é tracejada (a IA sugere) e a outra, um arco contínuo
 * (a pessoa decide). `fechado` é o anel inteiro e contínuo: a decisão já foi tomada. Não é mais o
 * logo (desde 13/11 o logo é `LogoPlantao`); fica nos selos de decisão humana, onde tem sentido.
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
 * Logo e nome. O nome tem "Plantão" em negrito e "Seguro" em peso normal, numa só fonte; o
 * leitor de tela lê "PlantãoSeguro" de uma vez, porque as duas partes ficam no mesmo elemento.
 *
 * Com `compacta`, num contêiner (`@container`) mais estreito que 22 rem sobra só o logo, para
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
      <LogoPlantao />
      <span
        className={cn("font-titulo text-xl text-tinta", compacta && "@max-[22rem]:sr-only")}
        translate="no"
        data-marca=""
      >
        <span className="font-bold">Plantão</span>
        <span className="font-normal">Seguro</span>
      </span>
    </span>
  );
}
