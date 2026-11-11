"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, Hourglass, ListOrdered, XCircle } from "lucide-react";
import { TempoQueFalta } from "@/components/dominio/prazo";
import { SuperficieVoz } from "@/components/dominio/superficie-voz";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCascata } from "@/lib/api/hooks";
import { mensagemDoErro } from "@/lib/api/erros";
import { NaoImplementadoError, type PlantaoApi } from "@/lib/api/plantao-api";
import { useApi } from "@/lib/api/provider";
import type { Oferta, StatusOferta, Vaga } from "@/lib/api/types";
import { CASCATA } from "@/lib/copy/medico";
import { ROTULO_MOTIVO_RECUSA, ROTULO_STATUS_OFERTA } from "@/lib/copy/rotulos";
import { formatarHora } from "@/lib/format/datas";

/** Só o modo de demonstração sabe passar o prazo: no sistema real, quem faz isso é o n8n. */
type ComPassarPrazo = PlantaoApi & { passarPrazo: (vagaId: string) => Promise<unknown> };
const sabePassarPrazo = (api: PlantaoApi | null): api is ComPassarPrazo =>
  api !== null && api.modo === "demo" && "passarPrazo" in api;

const ICONE: Record<StatusOferta, typeof Clock> = {
  na_fila: ListOrdered,
  aberta: Clock,
  aceita: CheckCircle2,
  recusada: XCircle,
  expirada: Hourglass,
  cancelada: XCircle,
};

const TOM: Record<StatusOferta, "neutro" | "atencao" | "humano"> = {
  na_fila: "neutro",
  aberta: "atencao",
  aceita: "humano",
  recusada: "neutro",
  expirada: "neutro",
  cancelada: "neutro",
};

/**
 * A cascata na tela da vaga (4.5): quem recebeu, quem recusou e por quê, quem deixou o prazo
 * passar, quem está na fila e o tempo que falta. Consulta o sistema a cada 3 segundos (D7) até a
 * vaga fechar. No modo de demonstração (4.6), o relógio só anda quando quem apresenta manda: o
 * botão "Passar o prazo" faz o papel do n8n.
 */
export function CascataDaVaga({ vaga }: { vaga: Vaga }) {
  const api = useApi();
  const clienteDeConsultas = useQueryClient();
  const fechada = vaga.status === "preenchida" || vaga.status === "sem_cobertura";
  const cascata = useCascata(vaga.id, true, !fechada);
  const ofertas = cascata.data?.ofertas;
  const [passando, setPassando] = React.useState(false);
  const [erroAoPassar, setErroAoPassar] = React.useState<string | null>(null);
  const aberta = ofertas?.find((o) => o.status === "aberta");

  const passarPrazo = async () => {
    if (!sabePassarPrazo(api)) return;
    setPassando(true);
    setErroAoPassar(null);
    try {
      await api.passarPrazo(vaga.id);
      await clienteDeConsultas.invalidateQueries({ queryKey: [api.modo] });
    } catch (erro) {
      setErroAoPassar(mensagemDoErro(erro, CASCATA.passarPrazoErro));
    } finally {
      setPassando(false);
    }
  };

  // Quando a cascata muda o estado da vaga (aceite ou fim da lista), o cabeçalho acompanha.
  const aceita = ofertas?.find((o) => o.status === "aceita");
  const acabou = ofertas !== undefined && ofertas.length > 0 && ofertas.every((o) => ["recusada", "expirada", "cancelada"].includes(o.status));
  React.useEffect(() => {
    if ((aceita && vaga.status !== "preenchida") || (acabou && !fechada)) {
      void clienteDeConsultas.invalidateQueries({ queryKey: [api?.modo, "vaga", vaga.id] });
      void clienteDeConsultas.invalidateQueries({ queryKey: [api?.modo, "vagas"] });
    }
  }, [aceita, acabou, fechada, vaga.status, vaga.id, api?.modo, clienteDeConsultas]);

  if (cascata.error instanceof NaoImplementadoError) return null;

  return (
    <SuperficieVoz as="section" voz="humano" aria-labelledby="cascata-titulo" className="p-5">
      <h2 id="cascata-titulo" className="font-titulo text-2xl font-semibold">
        {CASCATA.titulo}
      </h2>
      <p className="mt-1 max-w-[70ch] text-tinta-suave">{CASCATA.descricao}</p>

      {cascata.isError && !ofertas ? (
        <Alert tone="atencao" className="mt-4">
          {CASCATA.erro}
        </Alert>
      ) : null}

      {!ofertas && !cascata.isError ? (
        <div role="status" className="mt-4">
          <span className="sr-only">{CASCATA.carregando}</span>
          <Skeleton className="h-32 rounded-cartao" />
        </div>
      ) : null}

      {ofertas && ofertas.length === 0 ? <p className="mt-4">{CASCATA.vazia}</p> : null}

      {ofertas && ofertas.length > 0 ? (
        <ol role="list" className="mt-4 grid gap-2">
          {ofertas.map((oferta) => (
            <PassoDaCascata key={oferta.id} oferta={oferta} />
          ))}
        </ol>
      ) : null}

      {sabePassarPrazo(api) && aberta && !fechada ? (
        <Alert tone="info" title={CASCATA.simulacaoTitulo} className="mt-4">
          <p>{CASCATA.simulacao}</p>
          {erroAoPassar ? <p className="mt-2 font-semibold text-erro">{erroAoPassar}</p> : null}
          <Button className="mt-3" variant="secondary" size="sm" loading={passando} onClick={() => void passarPrazo()}>
            {CASCATA.passarPrazo}
          </Button>
        </Alert>
      ) : null}

      {/* Uma região só para o desfecho: anunciar cada segundo do prazo atrapalharia. */}
      <p role="status" className="mt-4 font-medium empty:hidden">
        {aceita ? CASCATA.preenchida(aceita.medico.nome) : vaga.status === "sem_cobertura" ? CASCATA.semCobertura : ""}
      </p>
    </SuperficieVoz>
  );
}

function PassoDaCascata({ oferta }: { oferta: Oferta }) {
  const Icone = ICONE[oferta.status];
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-campo border border-divisor bg-papel px-3 py-2">
      <span className="w-8 font-semibold tabular-nums">{CASCATA.vez(oferta.sequencia)}</span>
      <span className="min-w-0 flex-1 font-medium">{oferta.medico.nome}</span>
      <Badge tone={TOM[oferta.status]}>
        <Icone aria-hidden="true" />
        {ROTULO_STATUS_OFERTA[oferta.status]}
      </Badge>
      <span className="w-full text-sm text-tinta-suave sm:w-auto">
        <DetalheDoPasso oferta={oferta} />
      </span>
    </li>
  );
}

function DetalheDoPasso({ oferta }: { oferta: Oferta }) {
  if (oferta.status === "aberta" && oferta.expiraEm) {
    return (
      <TempoQueFalta
        expiraEm={oferta.expiraEm}
        texto={CASCATA.falta}
        encerrado={CASCATA.aguardandoProximo}
      />
    );
  }
  if (oferta.status === "recusada") {
    return (
      <>
        {oferta.respondidaEm ? CASCATA.respondidaAs(formatarHora(oferta.respondidaEm)) : null}
        {oferta.motivoRecusa ? `, ${CASCATA.motivo(ROTULO_MOTIVO_RECUSA[oferta.motivoRecusa].toLowerCase())}` : null}
      </>
    );
  }
  if (oferta.status === "aceita" && oferta.respondidaEm) {
    return <>{CASCATA.respondidaAs(formatarHora(oferta.respondidaEm))}</>;
  }
  if (oferta.status === "expirada" && oferta.enviadaEm) {
    return <>{CASCATA.enviadaAs(formatarHora(oferta.enviadaEm))}</>;
  }
  return null;
}
