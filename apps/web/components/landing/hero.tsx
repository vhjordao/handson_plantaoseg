import Link from "next/link";
import { LegendaVozes } from "@/components/dominio/legenda-vozes";
import { Button } from "@/components/ui/button";
import { ACOES } from "@/lib/copy/comum";
import { HERO } from "@/lib/copy/landing";
import { HeroDemo } from "./hero-demo";

/**
 * O hero abre com a demonstração viva, não com uma foto. No celular a ordem é título, ação,
 * demonstração e legenda; no computador a legenda desce para baixo do texto, na coluna da
 * esquerda, e a demonstração ocupa a coluna da direita.
 */
export function Hero() {
  return (
    <section
      aria-labelledby="titulo-hero"
      className="mx-auto grid w-full max-w-[1200px] content-start items-start gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-x-12 lg:gap-y-8 lg:py-16"
    >
      <div className="flex flex-col gap-6 lg:col-start-1 lg:row-start-1 lg:pt-6">
        <h1
          id="titulo-hero"
          className="font-serif text-[clamp(2.75rem,8vw,4.5rem)] leading-[1.04] font-semibold tracking-tight"
        >
          {HERO.titulo.map((linha) => (
            <span key={linha} className="block">
              {linha}
            </span>
          ))}
        </h1>
        <p className="max-w-[46ch] text-lg text-tinta-suave">{HERO.apoio}</p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <Button asChild size="lg">
            <Link href="/entrar">{ACOES.entrarNaDemonstracao}</Link>
          </Button>
          <Link
            href="#como-funciona"
            className="rounded-campo py-2 text-base font-semibold underline underline-offset-4 hover:no-underline"
          >
            {ACOES.comoFunciona}
          </Link>
        </div>
        <p className="text-sm text-tinta-suave">{HERO.nota}</p>
      </div>

      <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
        <HeroDemo />
      </div>

      <LegendaVozes className="border-t border-divisor pt-5 lg:col-start-1 lg:row-start-2" />
    </section>
  );
}
