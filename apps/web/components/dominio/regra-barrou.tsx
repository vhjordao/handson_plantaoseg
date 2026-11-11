"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { CodigoRegra, Recomendacao } from "@/lib/api/types";
import { QUEM_FICOU_DE_FORA } from "@/lib/copy/coordenador";
import { ROTULO_REGRA } from "@/lib/copy/rotulos";
import { SuperficieVoz } from "./superficie-voz";
import { Filter } from "lucide-react";
import { IconeEmCirculo } from "@/components/ui/painel";
import { VozTag } from "./voz-tag";

/**
 * Quem ficou de fora e a regra que barrou cada um. É a voz da regra: cinza, código fixo, sem IA.
 * Os exemplos mostram o pseudônimo e a evidência, para a pessoa entender e poder questionar o
 * filtro. O nome de quem não foi sugerido não precisa aparecer, e a RLS do `live` não o entrega.
 */
export function RegraBarrou({
  recomendacao,
  className,
}: {
  recomendacao: Pick<Recomendacao, "totalPool" | "totalElegiveis" | "exclusoesPorRegra" | "exemplosExcluidos">;
  className?: string;
}) {
  const regras = (Object.entries(recomendacao.exclusoesPorRegra) as Array<[CodigoRegra, number]>)
    .filter(([, quantos]) => quantos > 0)
    .sort((a, b) => b[1] - a[1]);
  const excluidos = recomendacao.totalPool - recomendacao.totalElegiveis;

  return (
    <SuperficieVoz as="section" voz="regra" aria-labelledby="fora-titulo" className={className}>
      <div className="grid gap-2 p-4">
        <div className="flex items-center gap-3">
          <IconeEmCirculo icone={Filter} tom="neutro" />
          <h2 id="fora-titulo" className="min-w-0 flex-1 font-titulo text-lg font-semibold">
            {QUEM_FICOU_DE_FORA.titulo}
          </h2>
        </div>
        <VozTag voz="regra" className="justify-self-start" />
        <p className="text-sm text-tinta-suave">
          {regras.length > 0
            ? QUEM_FICOU_DE_FORA.resumo(excluidos, recomendacao.totalPool)
            : QUEM_FICOU_DE_FORA.semExclusao}
        </p>
      </div>
      {regras.length > 0 ? (
        <Accordion type="multiple" className="border-t border-divisor px-4">
          {regras.map(([codigo, quantos]) => {
            const exemplos = recomendacao.exemplosExcluidos.filter((e) => e.codigoRegra === codigo);
            return (
              <AccordionItem key={codigo} value={codigo} className="last:border-b-0">
                <AccordionTrigger className="py-3 text-base font-medium">
                  <span className="tnum mr-2 font-semibold">{quantos}</span>
                  {ROTULO_REGRA[codigo]}
                </AccordionTrigger>
                <AccordionContent className="pb-3 text-sm">
                  {exemplos.length > 0 ? (
                    <ul role="list" className="grid gap-1.5">
                      {exemplos.map((exemplo) => (
                        <li key={exemplo.medico.id}>
                          <span className="font-medium text-tinta">
                            {QUEM_FICOU_DE_FORA.medico(exemplo.medico.pseudonimo)}:
                          </span>{" "}
                          {exemplo.evidencia ?? exemplo.textoRegra}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>{QUEM_FICOU_DE_FORA.semExemplos}</p>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      ) : null}
    </SuperficieVoz>
  );
}
