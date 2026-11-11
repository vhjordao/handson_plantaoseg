"use client";

import { Suspense } from "react";
import { PainelIndicadores, PainelIndicadoresCarregando } from "@/components/dominio/painel-indicadores";
import { Alert } from "@/components/ui/alert";
import { useIndicadores } from "@/lib/api/hooks";
import { useEstadoApi } from "@/lib/api/provider";
import { ListaDeVagas, ResumoDeAcaoDasVagas } from "./lista-de-vagas";

/**
 * A tela de Vagas em grade, como no modelo visual: a lista num painel grande à esquerda e, na
 * coluna da direita, o que exige ação e os indicadores simulados. No celular a lista vem
 * primeiro, porque o coordenador abre esta tela para agir. Cada parte carrega e falha sozinha.
 */
export function PainelDeVagas() {
  const { falhou } = useEstadoApi();
  const { data, isPending, isError } = useIndicadores();
  return (
    <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_420px]">
      <Suspense fallback={null}>
        <ListaDeVagas />
      </Suspense>
      <div className="grid gap-3">
        <Suspense fallback={null}>
          <ResumoDeAcaoDasVagas />
        </Suspense>
        {falhou || isError ? (
          <Alert tone="erro" title="Não foi possível carregar os indicadores">
            A lista de vagas continua disponível, se carregou.
          </Alert>
        ) : isPending || !data ? (
          <PainelIndicadoresCarregando />
        ) : (
          <PainelIndicadores indicadores={data} />
        )}
      </div>
    </div>
  );
}
