import Link from "next/link";
import { MarcaPlantao } from "@/components/dominio/marca-plantao";
import { BotaoAjuda } from "@/components/layout/botao-ajuda";
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
 * página é uma rolagem só, e o espaço vai para a marca, a ajuda e a entrada. Na própria
 * entrada (`enxuto`), ficam só a marca e a ajuda.
 */
export function CabecalhoPublico({ enxuto = false }: { enxuto?: boolean }) {
  return (
    <header className="vidro sticky top-0 z-40 border-b border-divisor/70">
      <div className="@container mx-auto flex min-h-16 w-full max-w-[1200px] flex-wrap items-center justify-between gap-x-2 gap-y-2 px-4 py-2 sm:gap-x-4 sm:px-6">
        <Link
          href="/"
          aria-label="PlantãoSeguro, página inicial"
          className="inline-flex min-h-[var(--alvo-min)] items-center rounded-campo"
        >
          <MarcaPlantao compacta />
        </Link>

        {enxuto ? null : (
          <nav aria-label="Seções da página" className="hidden lg:block">
            <ul role="list" className="flex items-center gap-1.5">
              {ANCORAS.map((ancora) => (
                <li key={ancora.href}>
                  <Link
                    href={ancora.href}
                    className="inline-flex min-h-[var(--alvo-min)] items-center rounded-campo border border-painel-borda bg-papel/55 px-4 text-base font-medium transition-[background-color] duration-150 hover:bg-papel/90"
                  >
                    {ancora.rotulo}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <div className="flex items-center gap-1 sm:gap-2">
          <BotaoAjuda />
          {enxuto ? null : (
            <Button asChild variant="escuro">
              <Link href="/entrar">{ACOES.entrar}</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
