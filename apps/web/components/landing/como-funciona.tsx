import { LegendaVozes } from "@/components/dominio/legenda-vozes";
import { SuperficieVoz } from "@/components/dominio/superficie-voz";
import { VozTag } from "@/components/dominio/voz-tag";
import { Badge } from "@/components/ui/badge";
import { ETAPAS } from "@/lib/copy/landing";
import { cn } from "@/lib/utils";

/**
 * As 8 etapas do fluxo: uma sequência real, por isso são numeradas. Cada etapa tem a forma da
 * voz de quem age (tracejado, contínuo ou cinza). A etapa 6, a decisão, é o único bloco cheio.
 */
export function ComoFunciona() {
  return (
    <section id="como-funciona" aria-labelledby="titulo-como-funciona" className="border-t border-divisor">
      <div className="mx-auto w-full max-w-[1200px] px-4 py-14 sm:px-6 lg:py-20">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-end">
          <div>
            <h2 id="titulo-como-funciona" className="font-serif text-3xl font-semibold">
              Oito etapas, uma decisão humana
            </h2>
            <p className="mt-3 max-w-[60ch] text-lg text-tinta-suave">
              Do pedido em texto livre à oferta aceita. A forma do contorno diz quem age em cada
              etapa.
            </p>
          </div>
          <LegendaVozes />
        </div>

        <ol role="list" className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ETAPAS.map((etapa) => {
            const corpo = (
              <>
                <div className="flex items-start justify-between gap-2">
                  <span
                    aria-hidden="true"
                    className="tnum font-serif text-3xl leading-none font-semibold"
                  >
                    {etapa.numero}
                  </span>
                  {etapa.destaque ? (
                    <Badge className="border-sobre-humano bg-transparent text-sobre-humano">
                      {etapa.quem}
                    </Badge>
                  ) : (
                    <VozTag voz={etapa.voz}>{etapa.quem}</VozTag>
                  )}
                </div>
                <h3 className="font-serif text-xl font-semibold">{etapa.titulo}</h3>
                <p className="text-base">{etapa.texto}</p>
                {etapa.nota ? (
                  <p
                    className={cn(
                      "text-sm",
                      etapa.destaque ? "text-sobre-humano" : "text-tinta-suave",
                    )}
                  >
                    {etapa.nota}
                  </p>
                ) : null}
              </>
            );

            return etapa.destaque ? (
              <li
                key={etapa.numero}
                className="flex flex-col gap-3 rounded-cartao border-2 border-humano bg-humano p-4 text-sobre-humano"
              >
                {corpo}
              </li>
            ) : (
              <SuperficieVoz
                as="li"
                key={etapa.numero}
                voz={etapa.voz}
                className="flex flex-col gap-3 p-4"
              >
                {corpo}
              </SuperficieVoz>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
