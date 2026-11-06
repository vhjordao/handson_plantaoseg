import Link from "next/link";
import { LegendaVozes } from "@/components/dominio/legenda-vozes";
import { MarcaPlantao } from "@/components/dominio/marca-plantao";
import { SuperficieVoz } from "@/components/dominio/superficie-voz";
import { IconeDaVoz } from "@/components/dominio/voz-tag";
import { Badge } from "@/components/ui/badge";
import { FAIXA_DEMONSTRACAO } from "@/lib/copy/comum";
import { ETAPAS } from "@/lib/copy/landing";

/**
 * Telão provisório: o título, as 8 etapas e a legenda das vozes, em escala de sala (corpo de 28 px
 * ou mais, para ler a 15 m). Desde 06/11 a apresentação é uma demonstração guiada, e a plateia não
 * usa o sistema: os números ao vivo e o QR code saíram do MVP, e esta página diz isso com franqueza.
 *
 * Cada etapa leva o ícone da sua voz, além da forma do contorno: de longe, a espessura de 1 ou
 * 2 px não distingue "regra" de "decisão". O título encolhe com a altura da tela, para a legenda
 * caber na primeira tela de um projetor de 1280 por 720.
 */
export default function Telao() {
  return (
    <main
      id="conteudo"
      tabIndex={-1}
      className="flex flex-1 flex-col justify-between gap-6 p-6 text-[1.75rem] leading-snug outline-none sm:p-[clamp(1.5rem,5vh,3.5rem)] sm:gap-[clamp(1rem,3vh,2.5rem)]"
    >
      <header className="@container flex flex-wrap items-center justify-between gap-4">
        <MarcaPlantao compacta className="[&_span]:!text-4xl [&_svg]:size-12" />
        <p className="text-[1.75rem] text-tinta-suave">{FAIXA_DEMONSTRACAO}</p>
      </header>

      <section aria-labelledby="titulo-telao">
        <h1
          id="titulo-telao"
          className="font-serif text-[clamp(2.5rem,min(9vw,14vh),8rem)] leading-[1.02] font-semibold tracking-tight"
        >
          A IA sugere.
          <br />
          Você decide.
        </h1>
      </section>

      <section aria-label="As oito etapas do fluxo e como ler as formas" className="grid gap-6">
        <ol role="list" className="flex flex-wrap gap-3">
          {ETAPAS.map((etapa) =>
            etapa.destaque ? (
              <li
                key={etapa.numero}
                className="flex items-center gap-3 rounded-cartao border-2 border-humano bg-humano-tom px-4 py-2 font-semibold text-humano"
              >
                <IconeDaVoz voz={etapa.voz} className="size-7 shrink-0" />
                <span>
                  {etapa.numero}. {etapa.titulo}
                </span>
              </li>
            ) : (
              <SuperficieVoz
                as="li"
                key={etapa.numero}
                voz={etapa.voz}
                className="flex items-center gap-3 px-4 py-2"
              >
                <IconeDaVoz voz={etapa.voz} className="size-7 shrink-0" />
                <span>
                  {etapa.numero}. {etapa.titulo}
                </span>
              </SuperficieVoz>
            ),
          )}
        </ol>
        <LegendaVozes tamanho="telao" />
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-4">
        <Badge tone="neutro" className="px-4 py-2 text-[1.75rem] leading-9">
          Página de apoio: sem números ao vivo nesta versão
        </Badge>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center rounded-campo text-[1.75rem] underline underline-offset-4 hover:no-underline"
        >
          Voltar ao início
        </Link>
      </footer>
    </main>
  );
}
