import type { FichaModelo } from "@/lib/api/types";
import { FICHA_DO_MODELO } from "@/lib/copy/coordenador";
import { ROTULO_FATOR } from "@/lib/copy/rotulos";

const titulo = "font-semibold text-tinta";

/** A ficha do modelo: o que ele é, com o que foi treinado, o que usa, o que não usa e onde falha. */
export function FichaDoModelo({ ficha }: { ficha: FichaModelo }) {
  return (
    <div className="grid gap-5 text-base text-tinta">
      <dl className="grid gap-2 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-x-4">
        <dt className={titulo}>{FICHA_DO_MODELO.versao}</dt>
        <dd>{ficha.versao}</dd>
        <dt className={titulo}>{FICHA_DO_MODELO.tipo}</dt>
        <dd>{ficha.tipo}</dd>
        <dt className={titulo}>{FICHA_DO_MODELO.treinadoCom}</dt>
        <dd>{ficha.treinadoCom}</dd>
        <dt className={titulo}>{FICHA_DO_MODELO.classeDeRisco}</dt>
        <dd>
          {ficha.classeDeRisco.preliminar}
          <p className="mt-0.5 text-sm text-tinta-suave">{ficha.classeDeRisco.observacao}</p>
        </dd>
      </dl>

      <section>
        <h3 className={titulo}>{FICHA_DO_MODELO.usadas}</h3>
        <ul className="mt-1 list-disc pl-5">
          {ficha.variaveisUsadas.map(({ fator }) => (
            <li key={fator}>{ROTULO_FATOR[fator]}</li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className={titulo}>{FICHA_DO_MODELO.naoUsadas}</h3>
        <ul className="mt-1 grid list-disc gap-1 pl-5">
          {ficha.variaveisNaoUsadas.map(({ nome, motivo }) => (
            <li key={nome}>
              <strong className="font-medium">{nome}.</strong>{" "}
              <span className="text-tinta-suave">{motivo}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className={titulo}>{FICHA_DO_MODELO.metricas}</h3>
        <dl className="mt-1 grid gap-1">
          {ficha.metricas.map(({ nome, valor }) => (
            <div key={nome} className="flex justify-between gap-4">
              <dt className="text-tinta-suave">{nome}</dt>
              <dd className="tnum font-medium">{valor}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section>
        <h3 className={titulo}>{FICHA_DO_MODELO.limites}</h3>
        <ul className="mt-1 list-disc pl-5">
          {ficha.limites.map((limite) => (
            <li key={limite}>{limite}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
