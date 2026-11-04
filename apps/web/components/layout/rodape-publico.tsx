import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { MarcaPlantao } from "@/components/dominio/marca-plantao";
import { ACOES, REPOSITORIO } from "@/lib/copy/comum";
import { RODAPE } from "@/lib/copy/landing";

export function RodapePublico() {
  return (
    <footer className="border-t border-divisor bg-gaze">
      <div className="mx-auto grid w-full max-w-[1200px] gap-6 px-4 py-10 sm:px-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="grid gap-3">
          {/* Com a letra muito ampliada, o nome desce para a linha de baixo em vez de passar da tela. */}
          <MarcaPlantao className="flex-wrap" />
          <p className="max-w-[60ch] text-sm text-tinta-suave">{RODAPE.projeto}</p>
        </div>
        <nav aria-label="Links do rodapé">
          <ul className="grid gap-1 text-base">
            <li>
              <Link href="/entrar" className="inline-flex min-h-[var(--alvo-min)] items-center rounded-campo underline underline-offset-4 hover:no-underline">
                {ACOES.entrarNaDemonstracao}
              </Link>
            </li>
            <li>
              <Link href="/ajuda" className="inline-flex min-h-[var(--alvo-min)] items-center rounded-campo underline underline-offset-4 hover:no-underline">
                {ACOES.ajuda}
              </Link>
            </li>
            <li>
              <a
                href={REPOSITORIO}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[var(--alvo-min)] items-center gap-1.5 rounded-campo underline underline-offset-4 hover:no-underline"
              >
                Código no GitHub
                <span className="sr-only"> (abre em outra aba)</span>
                <ExternalLink aria-hidden="true" className="size-4" />
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
