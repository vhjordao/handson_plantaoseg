"use client";

import { MessageSquareText } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useContestacoes } from "@/lib/api/hooks";
import { NaoImplementadoError } from "@/lib/api/plantao-api";
import { CONTESTACOES } from "@/lib/copy/medico";
import { ROTULO_MOTIVO_CONTESTACAO } from "@/lib/copy/rotulos";
import { formatarDiaHora } from "@/lib/format/datas";

/** As contestações do médico, com o protocolo e a resposta da coordenação (4.3, D8). */
export function TelaDeContestacoes({ medicoId }: { medicoId: string }) {
  const contestacoes = useContestacoes({ medicoId });

  const cabecalho = (
    <header>
      <h1 className="font-titulo text-[1.75rem] leading-9 font-medium sm:text-[2rem] sm:leading-10">{CONTESTACOES.titulo}</h1>
      <p className="mt-2 max-w-[70ch] text-tinta-suave">{CONTESTACOES.descricao}</p>
    </header>
  );

  let corpo: React.ReactNode;
  if (contestacoes.error instanceof NaoImplementadoError) {
    corpo = <Alert tone="info">{CONTESTACOES.naDemonstracao}</Alert>;
  } else if (contestacoes.isError) {
    corpo = (
      <Alert tone="erro" title={CONTESTACOES.erroTitulo}>
        <p>{CONTESTACOES.erro}</p>
        <Button className="mt-3" variant="secondary" size="sm" onClick={() => void contestacoes.refetch()}>
          Tentar de novo
        </Button>
      </Alert>
    );
  } else if (!contestacoes.data) {
    corpo = (
      <div role="status">
        <span className="sr-only">{CONTESTACOES.carregando}</span>
        <Skeleton className="h-40 rounded-cartao" />
      </div>
    );
  } else if (contestacoes.data.length === 0) {
    corpo = (
      <EmptyState icon={MessageSquareText} title={CONTESTACOES.vazioTitulo}>
        {CONTESTACOES.vazio}
      </EmptyState>
    );
  } else {
    corpo = (
      <ul role="list" className="grid gap-4">
        {contestacoes.data.map((c) => (
          <li key={c.id}>
            <article
              aria-labelledby={`contestacao-${c.id}`}
              className="superficie p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 id={`contestacao-${c.id}`} className="text-xl font-semibold">
                    {ROTULO_MOTIVO_CONTESTACAO[c.motivo]}
                  </h2>
                  <p className="text-sm text-tinta-suave">
                    {CONTESTACOES.protocolo(c.protocolo)}. {CONTESTACOES.enviadaEm(formatarDiaHora(c.criadaEm))}
                  </p>
                </div>
                <Badge tone={c.status === "respondida" ? "humano" : "atencao"}>
                  {c.status === "respondida" ? CONTESTACOES.respondida : CONTESTACOES.aberta}
                </Badge>
              </div>
              <h3 className="mt-4 text-sm font-semibold">{CONTESTACOES.seuTexto}</h3>
              <p className="mt-1 break-words">{c.texto}</p>
              {c.resposta ? (
                <div className="mt-4 border-t border-divisor pt-3">
                  <h3 className="text-sm font-semibold">{CONTESTACOES.resposta}</h3>
                  <p className="mt-1 break-words">{c.resposta.texto}</p>
                  <p className="mt-1 text-sm text-tinta-suave">
                    {c.resposta.porNome}, {CONTESTACOES.respondidaEm(formatarDiaHora(c.resposta.em))}
                  </p>
                </div>
              ) : null}
            </article>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-[860px] gap-6">
      {cabecalho}
      {corpo}
    </div>
  );
}
