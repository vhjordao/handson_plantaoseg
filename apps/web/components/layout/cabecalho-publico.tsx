import Link from "next/link";
import { MarcaPlantao } from "@/components/dominio/marca-plantao";
import { BotaoAjuda } from "@/components/layout/botao-ajuda";
import { BotaoTema } from "@/components/layout/botao-tema";
import { ArrowRight } from "lucide-react";
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
    <header className="sticky top-3 z-40 mt-3 px-3 sm:top-[30px] sm:mt-[30px]">
      {/* A consulta de contêiner da marca mede a faixa inteira; a barra de vidro só abraça o conteúdo. */}
      <div className="@container mx-auto w-full max-w-[1200px]">
        <div className="barra-vidro mx-auto flex min-h-14 w-full flex-wrap items-center justify-between gap-x-2 gap-y-2 rounded-[16px] px-3 py-1.5 sm:gap-x-4 sm:px-4 lg:w-fit lg:gap-x-8">
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
                      className="inline-flex min-h-[var(--alvo-min)] items-center rounded-campo px-3 text-base font-medium transition-[background-color] duration-150 hover:bg-papel/60"
                    >
                      {ancora.rotulo}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          <div className="flex items-center gap-1 sm:gap-2">
            <BotaoTema />
            <BotaoAjuda />
            {enxuto ? null : (
              <Link
                href="/entrar"
                className="group inline-flex min-h-[var(--alvo-min)] items-center gap-2 rounded-[12px] border border-[rgb(0_0_0/0.1)] bg-papel/70 py-1 pr-3.5 pl-3.5 text-base font-semibold sm:pr-1.5 text-tinta shadow-[inset_0_4px_4px_rgb(255_255_255/0.35)] transition-[background-color] duration-150 hover:bg-papel"
              >
                {ACOES.entrar}
                <span aria-hidden="true" className="hidden size-7 items-center justify-center rounded-full bg-acento text-sobre-acento sm:inline-flex">
                  <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
