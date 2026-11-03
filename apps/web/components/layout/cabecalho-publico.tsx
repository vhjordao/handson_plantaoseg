import Link from "next/link";
import { MarcaPlantao } from "@/components/dominio/marca-plantao";
import { Button } from "@/components/ui/button";
import { ACOES } from "@/lib/copy/comum";

const ANCORAS = [
  { href: "/#como-funciona", rotulo: "Como funciona" },
  { href: "/#compromissos", rotulo: "Compromissos" },
  { href: "/#evidencia", rotulo: "Evidência" },
  { href: "/#perguntas", rotulo: "Perguntas" },
] as const;

/**
 * Cabeçalho do site público. **Ajuda** fica sempre no canto direito, antes do botão Entrar, o
 * mesmo lugar do cabeçalho da plataforma (WCAG 3.2.6). No celular não há menu de âncoras: a
 * página é uma rolagem só, e o espaço vai para a marca, a ajuda e a entrada.
 */
export function CabecalhoPublico() {
  return (
    <header className="sticky top-0 z-40 border-b border-divisor bg-gaze">
      <div className="mx-auto flex min-h-16 w-full max-w-[1200px] flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2 sm:px-6">
        <Link href="/" aria-label="PlantãoSeguro, página inicial" className="rounded-campo">
          <MarcaPlantao />
        </Link>

        <nav aria-label="Seções da página" className="hidden lg:block">
          <ul className="flex items-center gap-6">
            {ANCORAS.map((ancora) => (
              <li key={ancora.href}>
                <Link
                  href={ancora.href}
                  className="rounded-campo px-1 py-2 text-base font-medium underline-offset-4 hover:underline"
                >
                  {ancora.rotulo}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link href="/ajuda">{ACOES.ajuda}</Link>
          </Button>
          <Button asChild variant="primary">
            <Link href="/entrar">{ACOES.entrar}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
