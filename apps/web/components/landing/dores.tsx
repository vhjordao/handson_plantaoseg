import { Check, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DORES } from "@/lib/copy/landing";

/** As quatro dores da Entrega 1, cada uma com a situação honesta de hoje. */
export function Dores() {
  return (
    <section
      id="dores"
      aria-labelledby="titulo-dores"
      className="border-t border-divisor"
    >
      <div className="mx-auto w-full max-w-[1200px] px-4 py-14 sm:px-6 lg:py-20">
        <h2 id="titulo-dores" className="font-serif text-3xl font-semibold">
          O que queremos resolver
        </h2>
        <p className="mt-3 max-w-[60ch] text-lg text-tinta-suave">
          Quatro dores levantadas na Entrega 1, e a situação de cada uma hoje.
        </p>
        <ul role="list" className="mt-8 divide-y divide-divisor border-y border-divisor">
          {DORES.map((dor) => (
            <li
              key={dor.dor}
              className="grid gap-2 py-5 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)_minmax(0,1.2fr)] md:items-start md:gap-8"
            >
              <h3 className="font-serif text-xl font-semibold">{dor.dor}</h3>
              <p>
                {dor.resposta}
                {dor.detalhe ? (
                  <span className="mt-1 block text-sm text-tinta-suave">{dor.detalhe}</span>
                ) : null}
              </p>
              <div>
                <Badge tone="neutro">
                  {dor.situacao === "construido" ? (
                    <Check aria-hidden="true" />
                  ) : (
                    <Minus aria-hidden="true" />
                  )}
                  {dor.rotuloSituacao}
                </Badge>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
