import { cn } from "@/lib/utils";

/**
 * O fundo da plataforma: uma malha suave de manchas pastel, paradas, com uma luz larga no alto,
 * atrás dos painéis translúcidos. Só CSS (globals.css, `.fundo-luz` e `.fundo-malha`): não baixa
 * imagem e não desenha nada sob o texto. É decoração: fora da leitura de tela e sem receber
 * cliques.
 */
export function ArteDeFundo({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("arte-de-fundo pointer-events-none fixed inset-0 -z-10 overflow-hidden select-none", className)}
    >
      <div className="fundo-luz" />
      <div className="fundo-malha" />
    </div>
  );
}
