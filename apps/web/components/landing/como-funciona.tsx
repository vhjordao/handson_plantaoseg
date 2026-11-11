import { VozTag } from "@/components/dominio/voz-tag";
import { ETAPAS } from "@/lib/copy/landing";
import type { ChaveVoz } from "@/lib/copy/comum";
import { cn } from "@/lib/utils";

/**
 * O trilho à esquerda de cada etapa tem a forma da voz: tracejado (2 px), contínuo (2 px) ou
 * fino e cinza (1 px). A espessura distingue a regra da decisão sem depender da cor (WCAG 1.4.1).
 */
const TRILHO: Record<ChaveVoz, string> = {
  ia: "border-l-2 border-dashed border-ia",
  humano: "border-l-2 border-humano",
  regra: "border-l border-campo",
};

/**
 * As 8 etapas do fluxo: uma sequência real, por isso numerada e em lista (não em cartões iguais).
 * A forma do trilho diz quem age. Só a etapa 6, a decisão, ganha fundo e trilho grosso.
 */
export function ComoFunciona() {
  return (
    <section id="como-funciona" aria-labelledby="titulo-como-funciona" className="border-t border-divisor">
      <div className="mx-auto w-full max-w-[1200px] px-4 py-14 sm:px-6 lg:py-20">
        <h2 id="titulo-como-funciona" className="font-titulo text-3xl font-semibold">
          Oito etapas, uma decisão humana
        </h2>
        <p className="mt-3 max-w-[64ch] text-lg text-tinta-suave">
          Do pedido em texto livre à oferta aceita. O trilho à esquerda de cada etapa diz quem age:
          tracejado, a IA; contínuo, uma pessoa; fino e cinza, uma regra.
        </p>

        <ol role="list" className="mt-10 grid gap-x-12 lg:grid-flow-col lg:grid-rows-4">
          {ETAPAS.map((etapa) => (
            <li
              key={etapa.numero}
              className={cn(
                "relative grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3 border-b border-divisor py-4 pr-2 pl-5",
                etapa.destaque && "bg-humano-tom",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "absolute left-0",
                  etapa.destaque ? "inset-y-0 border-l-4 border-humano" : "inset-y-3",
                  !etapa.destaque && TRILHO[etapa.voz],
                )}
              />
              <span
                aria-hidden="true"
                className="tnum font-titulo text-2xl leading-none font-semibold"
              >
                {etapa.numero}
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h3 className="font-titulo text-xl font-semibold">{etapa.titulo}</h3>
                  <VozTag voz={etapa.voz}>{etapa.quem}</VozTag>
                </div>
                <p className="mt-1">{etapa.texto}</p>
                {etapa.nota ? <p className="mt-1 text-sm text-tinta-suave">{etapa.nota}</p> : null}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
