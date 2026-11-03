import { ExternalLink } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { linkNoRepositorio } from "@/lib/copy/comum";
import { EVIDENCIA } from "@/lib/copy/landing";
import { formatarInteiro } from "@/lib/format/datas";
import { cn } from "@/lib/utils";

const MAXIMO = Math.max(...EVIDENCIA.grafico.barras.map((barra) => barra.minutos));

/** O que a simulação mostra, com a barra do que melhorou e o aviso do que piorou. */
export function Evidencia() {
  return (
    <section id="evidencia" aria-labelledby="titulo-evidencia" className="border-t border-divisor">
      <div className="mx-auto w-full max-w-[1200px] px-4 py-14 sm:px-6 lg:py-20">
        <h2 id="titulo-evidencia" className="max-w-[28ch] font-serif text-3xl font-semibold">
          {EVIDENCIA.titulo}
        </h2>

        <figure className="mt-8 max-w-[52rem]">
          <figcaption className="text-base font-semibold">{EVIDENCIA.grafico.titulo}</figcaption>
          <ul className="mt-4 grid gap-3">
            {EVIDENCIA.grafico.barras.map((barra) => (
              <li
                key={barra.rotulo}
                className="grid gap-1 sm:grid-cols-[14rem_minmax(0,1fr)] sm:items-center sm:gap-4"
              >
                <span className="text-base font-medium">{barra.rotulo}</span>
                <div className="flex items-center gap-3">
                  <div className="h-6 min-w-0 flex-1">
                    <div
                      className={cn("h-full rounded-campo", barra.destaque ? "bg-ia" : "bg-campo")}
                      style={{ width: `${(barra.minutos / MAXIMO) * 100}%` }}
                    />
                  </div>
                  <span className="tnum w-12 shrink-0 text-right font-serif text-xl font-semibold">
                    {formatarInteiro(barra.minutos)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </figure>

        <ul className="mt-10 grid gap-4 md:grid-cols-3">
          {EVIDENCIA.achados.map((achado) =>
            "atencao" in achado && achado.atencao ? (
              <li key={achado.titulo}>
                <Alert tone="atencao" title={achado.titulo} className="h-full">
                  {achado.texto}
                </Alert>
              </li>
            ) : (
              <li key={achado.titulo}>
                <h3 className="font-serif text-xl font-semibold">{achado.titulo}</h3>
                <p className="mt-1 text-tinta-suave">{achado.texto}</p>
              </li>
            ),
          )}
        </ul>

        <p className="mt-8 text-base">
          <a
            href={linkNoRepositorio(EVIDENCIA.fonte)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-semibold underline underline-offset-4 hover:no-underline"
          >
            Ler o relatório completo
            <span className="sr-only"> (abre o GitHub em outra aba)</span>
            <ExternalLink aria-hidden="true" className="size-4" />
          </a>
        </p>
      </div>
    </section>
  );
}
