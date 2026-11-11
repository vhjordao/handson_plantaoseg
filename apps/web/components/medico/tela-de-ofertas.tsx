"use client";

import * as React from "react";
import { Inbox } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useContestacoes, useOfertas } from "@/lib/api/hooks";
import { NaoImplementadoError } from "@/lib/api/plantao-api";
import { OFERTAS } from "@/lib/copy/medico";
import { CartaoDaOferta } from "./cartao-da-oferta";

/**
 * As ofertas do médico (4.1 a 4.3): primeiro as que esperam resposta, depois as encerradas. A
 * lista consulta o sistema a cada 3 segundos (D7), então a oferta nova aparece sozinha.
 */
export function TelaDeOfertas({ medicoId }: { medicoId: string }) {
  const ofertas = useOfertas(medicoId);
  const contestacoes = useContestacoes({ medicoId });
  const [aviso, setAviso] = React.useState("");

  const cabecalho = (
    <header>
      <h1 className="font-titulo text-3xl font-semibold">{OFERTAS.titulo}</h1>
      <p className="mt-2 max-w-[70ch] text-tinta-suave">{OFERTAS.descricao}</p>
    </header>
  );
  // A região existe antes do texto entrar: é o que garante o anúncio no leitor de tela.
  const regiaoDeAviso = (
    <p role="status" className={aviso ? "rounded-campo border border-humano bg-humano-tom p-3 font-medium" : "sr-only"}>
      {aviso}
    </p>
  );

  if (ofertas.error instanceof NaoImplementadoError) {
    return (
      <div className="mx-auto grid w-full max-w-[860px] gap-6">
        {cabecalho}
        <Alert tone="info" title={OFERTAS.naDemonstracaoTitulo}>
          {OFERTAS.naDemonstracao}
        </Alert>
      </div>
    );
  }

  if (ofertas.isError && !ofertas.data) {
    return (
      <div className="mx-auto grid w-full max-w-[860px] gap-6">
        {cabecalho}
        <Alert tone="erro" title={OFERTAS.erroTitulo}>
          <p>{OFERTAS.erro}</p>
          <Button className="mt-3" variant="secondary" size="sm" onClick={() => void ofertas.refetch()}>
            {OFERTAS.tentarDeNovo}
          </Button>
        </Alert>
      </div>
    );
  }

  if (!ofertas.data) {
    return (
      <div className="mx-auto grid w-full max-w-[860px] gap-6">
        {cabecalho}
        <div role="status" className="grid gap-4">
          <span className="sr-only">{OFERTAS.carregando}</span>
          <Skeleton className="h-64 rounded-cartao" />
        </div>
      </div>
    );
  }

  const contestadas = new Set((contestacoes.data ?? []).map((c) => c.ofertaId));
  const abertas = ofertas.data.filter((o) => o.status === "aberta");
  const encerradas = ofertas.data.filter((o) => o.status !== "aberta");

  return (
    <div className="mx-auto grid w-full max-w-[860px] gap-6">
      {cabecalho}
      {regiaoDeAviso}

      <section aria-labelledby="ofertas-abertas" className="grid gap-4">
        <h2 id="ofertas-abertas" className="font-titulo text-2xl font-semibold">
          {abertas.length > 0 ? OFERTAS.abertasTitulo : OFERTAS.semAbertasTitulo}
        </h2>
        {abertas.length > 0 ? (
          abertas.map((oferta) => (
            <CartaoDaOferta
              key={oferta.id}
              oferta={oferta}
              contestada={contestadas.has(oferta.id)}
              aoResponder={setAviso}
            />
          ))
        ) : (
          <EmptyState icon={Inbox} title={OFERTAS.semAbertasTitulo} headingLevel="h3">
            {OFERTAS.semAbertas}
          </EmptyState>
        )}
      </section>

      <section aria-labelledby="ofertas-encerradas" className="grid gap-4">
        <h2 id="ofertas-encerradas" className="font-titulo text-2xl font-semibold">
          {OFERTAS.historicoTitulo}
        </h2>
        {encerradas.length > 0 ? (
          encerradas.map((oferta) => (
            <CartaoDaOferta
              key={oferta.id}
              oferta={oferta}
              contestada={contestadas.has(oferta.id)}
              aoResponder={setAviso}
            />
          ))
        ) : (
          <p className="text-tinta-suave">{OFERTAS.semHistorico}</p>
        )}
      </section>
    </div>
  );
}
