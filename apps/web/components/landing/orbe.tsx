import { cn } from "@/lib/utils";

/**
 * O orbe de vidro do hero, feito só com CSS (globals.css, `.orbe`): uma esfera azul elétrica com
 * brilho no alto, borda iluminada e um véu que gira devagar. Faz o papel do vídeo do modelo
 * visual sem baixar nada (o vídeo pesaria de 1 a 3 MB e é de outro site). Com movimento
 * reduzido, fica parado. É decoração: fora da leitura de tela e sem receber cliques.
 */
export function Orbe({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("orbe pointer-events-none select-none", className)}>
      <div className="orbe-esfera" />
      <div className="orbe-veu" />
      <div className="orbe-brilho" />
    </div>
  );
}
