import { ExternalLink } from "lucide-react";
import { linkNoRepositorio } from "@/lib/copy/comum";
import { COMPROMISSOS } from "@/lib/copy/landing";

/** Seis compromissos verdadeiros, cada um com o arquivo do repositório que o prova. */
export function Compromissos() {
  return (
    <section id="compromissos" aria-labelledby="titulo-compromissos" className="border-t border-divisor">
      <div className="mx-auto w-full max-w-[1200px] px-4 py-14 sm:px-6 lg:py-20">
        <h2 id="titulo-compromissos" className="font-serif text-3xl font-semibold">
          O que prometemos e como conferir
        </h2>
        <p className="mt-3 max-w-[60ch] text-lg text-tinta-suave">
          Cada compromisso aponta para o código ou o teste que o sustenta. O repositório é público.
        </p>
        <ul role="list" className="mt-8 divide-y divide-divisor border-y border-divisor">
          {COMPROMISSOS.map((compromisso) => (
            <li
              key={compromisso.titulo}
              className="grid gap-3 py-5 md:grid-cols-[minmax(0,5fr)_minmax(0,4fr)] md:gap-10"
            >
              <div>
                <h3 className="font-serif text-xl font-semibold">{compromisso.titulo}</h3>
                <p className="mt-1 max-w-[60ch] text-tinta-suave">{compromisso.texto}</p>
              </div>
              <p className="text-sm md:pt-1">
                <span className="block text-tinta-suave">Como conferir</span>
                <a
                  href={linkNoRepositorio(compromisso.evidencia)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-0.5 inline-flex min-h-[var(--alvo-min)] items-center gap-1.5 text-base font-semibold underline underline-offset-4 hover:no-underline"
                >
                  {compromisso.rotuloEvidencia}
                  <span className="sr-only"> (abre o GitHub em outra aba)</span>
                  <ExternalLink aria-hidden="true" className="size-4" />
                </a>
                <span className="mt-0.5 block break-all text-tinta-suave">{compromisso.evidencia}</span>
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
