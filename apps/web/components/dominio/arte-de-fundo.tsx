import { cn } from "@/lib/utils";

/**
 * O fundo da plataforma: uma aurora suave em azul, anil e rosa no alto da tela, com duas bolhas
 * de vidro desfocadas atrás dos painéis translúcidos. É só CSS (globals.css, `.aurora` e
 * `.bolha`): não baixa imagem, não tem figura sob o texto e fica parado com movimento reduzido.
 * É decoração: fora da leitura de tela e sem receber cliques.
 */
export function ArteDeFundo({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("arte-de-fundo pointer-events-none fixed inset-0 -z-10 overflow-hidden select-none", className)}
    >
      <div className="aurora aurora-azul" />
      <div className="aurora aurora-anil" />
      <div className="aurora aurora-rosa" />
      <div className="aurora aurora-ciano" />
      <div className="bolha bolha-grande" />
      <div className="bolha bolha-pequena" />
    </div>
  );
}
