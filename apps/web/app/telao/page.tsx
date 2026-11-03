import Link from "next/link";
import { MarcaPlantao } from "@/components/dominio/marca-plantao";
import { SuperficieVoz } from "@/components/dominio/superficie-voz";
import { Badge } from "@/components/ui/badge";
import { FAIXA_DEMONSTRACAO } from "@/lib/copy/comum";
import { ETAPAS } from "@/lib/copy/landing";

/**
 * Telão provisório (UI-0): o título e as 8 etapas, em escala de sala. Os números ao vivo, o QR
 * code e o cenário roteirizado chegam na fase UI-3, e esta página diz isso com franqueza.
 */
export default function Telao() {
  return (
    <main id="conteudo" tabIndex={-1} className="flex flex-1 flex-col justify-between gap-10 p-8 text-[1.75rem] leading-snug outline-none lg:p-14">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <MarcaPlantao className="[&_span]:!text-4xl [&_svg]:size-12" />
        <p className="text-[1.375rem] text-tinta-suave">{FAIXA_DEMONSTRACAO}</p>
      </header>

      <section aria-labelledby="titulo-telao">
        <h1
          id="titulo-telao"
          className="font-serif text-[clamp(3.5rem,9vw,8rem)] leading-[1.02] font-semibold tracking-tight"
        >
          A IA sugere.
          <br />
          Você decide.
        </h1>
      </section>

      <section aria-label="As oito etapas do fluxo">
        <ol role="list" className="flex flex-wrap gap-3">
          {ETAPAS.map((etapa) =>
            etapa.destaque ? (
              <li
                key={etapa.numero}
                className="rounded-cartao border-2 border-humano bg-humano px-5 py-3 font-semibold text-sobre-humano"
              >
                {etapa.numero}. {etapa.titulo}
              </li>
            ) : (
              <SuperficieVoz as="li" key={etapa.numero} voz={etapa.voz} className="px-5 py-3">
                {etapa.numero}. {etapa.titulo}
              </SuperficieVoz>
            ),
          )}
        </ol>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-4">
        <Badge tone="atencao" className="px-4 py-2 text-[1.375rem]">
          Em construção: números ao vivo e QR code chegam na próxima fase
        </Badge>
        <Link href="/" className="rounded-campo text-[1.375rem] underline underline-offset-4 hover:no-underline">
          Voltar ao site
        </Link>
      </footer>
    </main>
  );
}
