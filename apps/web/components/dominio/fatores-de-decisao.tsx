import type { Candidato, Fator } from "@/lib/api/types";
import { MOTIVOS } from "@/lib/copy/coordenador";
import { ROTULO_FATOR } from "@/lib/copy/rotulos";
import { sentidoDoFator, valorDoFator } from "@/lib/format/sugestoes";
import { cn } from "@/lib/utils";

/**
 * O que pesou na posição de um nome: uma barra por variável, para a direita quando aproxima do
 * topo e para a esquerda quando afasta, comparada à média dos elegíveis. O número da contribuição
 * não aparece, porque daria uma precisão que a simulação não tem. O sentido vem na posição, na
 * cor e na palavra ("a favor", "contra"), e o valor da variável vem em texto ao lado do nome: a
 * barra sozinha nunca é o único jeito de ler o dado.
 */
export function FatoresDeDecisao({
  fatores,
  contribuicoes,
}: Pick<Candidato, "fatores" | "contribuicoes">) {
  const linhas = (Object.entries(contribuicoes) as Array<[Fator, number]>)
    .map(([fator, contribuicao]) => ({ fator, contribuicao, valor: fatores[fator] }))
    .sort((a, b) => Math.abs(b.contribuicao) - Math.abs(a.contribuicao));
  const maior = Math.max(...linhas.map((linha) => Math.abs(linha.contribuicao)), Number.EPSILON);

  return (
    <ul role="list" className="grid gap-3">
      {linhas.map(({ fator, contribuicao, valor }) => {
        const sentido = sentidoDoFator(contribuicao);
        // Meia largura é a maior barra possível: o zero fica no meio da trilha.
        const largura = `${(Math.abs(contribuicao) / maior) * 50}%`;
        return (
          <li key={fator} className="grid gap-1 text-sm">
            <div className="flex flex-wrap justify-between gap-x-3">
              <span className="font-medium text-tinta">{ROTULO_FATOR[fator]}</span>
              <span className="tnum text-tinta-suave">{valorDoFator(fator, valor)}</span>
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_4rem] items-center gap-3">
              <div aria-hidden="true" className="relative h-2">
                <span className="absolute inset-y-[-2px] left-1/2 w-px bg-campo" />
                {sentido === "neutro" ? null : (
                  <span
                    data-sentido={sentido}
                    style={{ width: largura }}
                    className={cn(
                      "absolute inset-y-0",
                      sentido === "favor"
                        ? "left-1/2 rounded-r-[4px] bg-fator-favor"
                        : "right-1/2 rounded-l-[4px] bg-fator-contra",
                    )}
                  />
                )}
              </div>
              <span className="text-tinta-suave">{MOTIVOS[sentido]}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
