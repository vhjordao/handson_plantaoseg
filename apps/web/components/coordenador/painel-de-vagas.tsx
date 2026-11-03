"use client";

import { Suspense } from "react";
import { PainelIndicadores, PainelIndicadoresCarregando } from "@/components/dominio/painel-indicadores";
import { Alert } from "@/components/ui/alert";
import { useIndicadores } from "@/lib/api/hooks";
import { ListaDeVagas } from "./lista-de-vagas";

/** Indicadores e lista de vagas. Cada parte carrega e falha sozinha, sem derrubar a outra. */
export function PainelDeVagas() {
  const { data, isPending, isError } = useIndicadores();
  return (
    <div className="grid gap-6">
      {isError ? (
        <Alert tone="erro" title="Não foi possível carregar os indicadores">
          A lista de vagas continua disponível abaixo.
        </Alert>
      ) : isPending || !data ? (
        <PainelIndicadoresCarregando />
      ) : (
        <PainelIndicadores indicadores={data} />
      )}
      <Suspense fallback={null}>
        <ListaDeVagas />
      </Suspense>
    </div>
  );
}
