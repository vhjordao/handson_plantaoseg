"use client";

import { Suspense } from "react";
import { PainelIndicadores, PainelIndicadoresCarregando } from "@/components/dominio/painel-indicadores";
import { Alert } from "@/components/ui/alert";
import { useIndicadores } from "@/lib/api/hooks";
import { useEstadoApi } from "@/lib/api/provider";
import { ListaDeVagas } from "./lista-de-vagas";

/**
 * Primeiro o que exige ação e a lista de vagas; os indicadores simulados vêm depois, porque o
 * coordenador abre esta tela para agir, não para conferir números. Cada parte carrega e falha
 * sozinha, sem derrubar a outra.
 */
export function PainelDeVagas() {
  const { falhou } = useEstadoApi();
  const { data, isPending, isError } = useIndicadores();
  return (
    <div className="grid gap-6">
      <Suspense fallback={null}>
        <ListaDeVagas />
      </Suspense>
      {falhou || isError ? (
        <Alert tone="erro" title="Não foi possível carregar os indicadores">
          A lista de vagas continua disponível acima, se carregou.
        </Alert>
      ) : isPending || !data ? (
        <PainelIndicadoresCarregando />
      ) : (
        <PainelIndicadores indicadores={data} />
      )}
    </div>
  );
}
