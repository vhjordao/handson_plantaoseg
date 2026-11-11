import Link from "next/link";
import { ArrowRight, FlaskConical } from "lucide-react";
import { LegendaVozes } from "@/components/dominio/legenda-vozes";
import { ACOES } from "@/lib/copy/comum";
import { HERO } from "@/lib/copy/landing";
import { HeroDemo } from "./hero-demo";
import { Orbe } from "./orbe";

/** As ferramentas que de fato rodam o protótipo, no lugar dos logos de clientes (não temos). */
const CONSTRUIDO_COM = ["Next.js", "FastAPI", "Supabase", "n8n", "Gemini", "Vercel"] as const;

/**
 * O hero em "vidro líquido": fundo branco com luz azul no canto superior esquerdo, título
 * grande em Fustat, um selo com fatos da simulação, a chamada em botão de vidro azul e, à
 * direita, a demonstração viva flutuando sobre o orbe de vidro. Embaixo, a faixa "Construído
 * com". No celular a ordem é título, ação, demonstração e legenda; no computador a legenda
 * fica na coluna do texto. A legenda aparece duas vezes no HTML, mas só uma está visível em
 * cada largura (a outra sai da árvore de acessibilidade).
 */
export function Hero() {
  return (
    <section aria-labelledby="titulo-hero" className="hero-vidro relative isolate -mt-[68px] overflow-hidden pt-[68px] sm:-mt-[86px] sm:pt-[86px]">
      {/* A luz no canto superior esquerdo: duas elipses desfocadas, em azuis claros. */}
      <div aria-hidden="true" className="hero-luz -top-40 -left-40 h-[34rem] w-[46rem] bg-[var(--hero-luz-a)]" />
      <div aria-hidden="true" className="hero-luz -top-10 left-40 h-[22rem] w-[30rem] bg-[var(--hero-luz-b)]" />

      <div className="relative z-10 mx-auto grid w-full max-w-[1320px] items-center gap-10 px-4 pt-10 pb-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-14 lg:pt-16 lg:pb-16">
        <div className="flex flex-col items-start gap-6">
          <p className="inline-flex items-center gap-2 rounded-full border border-[rgb(0_0_0/0.1)] bg-papel/60 px-3.5 py-1.5 text-sm font-medium text-tinta shadow-[inset_0_2px_3px_rgb(255_255_255/0.5)] backdrop-blur-md">
            <FlaskConical aria-hidden="true" className="size-4 text-atencao" />
            {HERO.selo}
          </p>
          <h1
            id="titulo-hero"
            className="font-vitrine text-[clamp(2.75rem,6.4vw,4.6875rem)] leading-[1.05] font-bold tracking-[-0.03em]"
          >
            {HERO.titulo.map((linha) => (
              <span key={linha} className="block">
                {linha}
              </span>
            ))}
          </h1>
          <p className="max-w-[46ch] text-lg leading-7 tracking-[-0.01em] text-tinta-suave">{HERO.apoio}</p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link
              href="/entrar"
              className="botao-vidro-azul group inline-flex min-h-12 items-center gap-3 rounded-[16px] py-2 pr-2 pl-5 text-lg font-semibold text-sobre-acento transition-transform duration-200 ease-out motion-safe:hover:scale-[1.02]"
            >
              {ACOES.entrarNaDemonstracao}
              <span aria-hidden="true" className="inline-flex size-9 items-center justify-center rounded-full bg-papel text-acento">
                <ArrowRight className="size-[18px] transition-transform duration-200 group-hover:translate-x-0.5" />
              </span>
            </Link>
            <Link
              href="#como-funciona"
              className="inline-flex min-h-[var(--alvo-min)] items-center rounded-campo text-base font-semibold underline underline-offset-4 hover:no-underline"
            >
              {ACOES.comoFunciona}
            </Link>
          </div>
          <p className="text-sm text-tinta-suave">{HERO.nota}</p>
          <LegendaVozes className="hidden w-full border-t border-divisor pt-5 lg:grid" />
        </div>

        {/* A demonstração viva flutua sobre o orbe, que vaza um pouco para fora do centro. */}
        <div className="relative">
          <Orbe className="top-[56%] left-[58%] hidden w-[min(46rem,118%)] -translate-x-1/2 -translate-y-1/2 sm:block" />
          <div className="relative">
            <HeroDemo />
          </div>
        </div>

        <LegendaVozes className="border-t border-divisor pt-5 lg:hidden" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1320px] px-4 pb-12 sm:px-6">
        <p className="text-center text-sm font-medium text-tinta-suave">{HERO.construidoCom}</p>
        <ul
          role="list"
          className="mt-4 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 lg:gap-x-[100px]"
        >
          {CONSTRUIDO_COM.map((nome) => (
            <li key={nome} className="font-vitrine text-xl font-bold text-tinta-suave" translate="no">
              {nome}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
