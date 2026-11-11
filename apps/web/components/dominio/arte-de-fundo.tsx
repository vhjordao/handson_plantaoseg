import { cn } from "@/lib/utils";

/**
 * O fundo da plataforma: a anatomia de vidro, como a figura do modelo visual, atrás dos painéis
 * translúcidos. A imagem foi gerada pelo Victor no Figma a partir de um texto (não é a do
 * modelo) e fica em `public/fundo/` em WebP, com uma versão escura derivada dela. O CSS
 * (`.fundo-anatomia`, em globals.css) escolhe o tamanho e o tema. É decoração: fora da leitura de
 * tela e sem receber cliques.
 */
export function ArteDeFundo({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("arte-de-fundo pointer-events-none fixed inset-0 -z-10 overflow-hidden select-none", className)}
    >
      <div className="fundo-anatomia" />
    </div>
  );
}
