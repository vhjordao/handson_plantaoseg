"use client";

import * as React from "react";
import { CheckCircle2, Clock, MapPin, XCircle } from "lucide-react";
import { TempoQueFalta } from "@/components/dominio/prazo";
import { SuperficieVoz } from "@/components/dominio/superficie-voz";
import { VozTag } from "@/components/dominio/voz-tag";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Field, Textarea } from "@/components/ui/field";
import { mensagemDoErro } from "@/lib/api/erros";
import { useContestar, useResponderOferta } from "@/lib/api/hooks";
import {
  LIMITE_TEXTO_LIVRE,
  MOTIVOS_CONTESTACAO,
  MOTIVOS_RECUSA,
  type MotivoContestacao,
  type MotivoRecusa,
  type Oferta,
} from "@/lib/api/types";
import { formatarHora, formatarIntervalo, formatarNumero } from "@/lib/format/datas";
import { CONTESTAR, OFERTA, RESPONDER } from "@/lib/copy/medico";
import {
  ROTULO_ESPECIALIDADE,
  ROTULO_MOTIVO_CONTESTACAO,
  ROTULO_MOTIVO_RECUSA,
} from "@/lib/copy/rotulos";
import { Opcoes } from "./opcoes";

type Acao = "aceitar" | "recusar" | "contestar" | null;

const TOM_DO_STATUS = {
  na_fila: "neutro",
  aberta: "atencao",
  aceita: "humano",
  recusada: "neutro",
  expirada: "neutro",
  cancelada: "neutro",
} as const;

/**
 * Uma oferta: o plantão, o local, o horário, a distância, o prazo e o "Por que você" (4.1).
 * Aceitar e recusar pedem confirmação, porque não se desfazem (D5); a recusa leva um dos quatro
 * motivos, sem texto livre (D4). Contestar abre um pedido de revisão humana (4.3, D8).
 */
export function CartaoDaOferta({
  oferta,
  contestada,
  aoResponder,
}: {
  oferta: Oferta;
  contestada: boolean;
  aoResponder: (mensagem: string) => void;
}) {
  const [acao, setAcao] = React.useState<Acao>(null);
  const tituloId = `oferta-${oferta.id}`;
  const aberta = oferta.status === "aberta";
  const especialidade = ROTULO_ESPECIALIDADE[oferta.vaga.especialidade];

  return (
    <article aria-labelledby={tituloId} className="rounded-cartao border border-divisor bg-papel p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id={tituloId} className="font-serif text-2xl font-semibold">
            {especialidade}, {oferta.vaga.unidade.nome}
          </h3>
          <p className="mt-1 text-tinta-suave">
            {formatarIntervalo(oferta.vaga.inicio, oferta.vaga.fim)}
          </p>
        </div>
        <Badge tone={TOM_DO_STATUS[oferta.status]}>
          {oferta.status === "aceita" ? <CheckCircle2 aria-hidden="true" /> : null}
          {oferta.status === "recusada" ? <XCircle aria-hidden="true" /> : null}
          {oferta.status === "aberta" ? <Clock aria-hidden="true" /> : null}
          {OFERTA.status[oferta.status]}
        </Badge>
      </div>

      <dl className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-tinta-suave">{OFERTA.local}</dt>
          <dd className="flex items-center gap-1.5">
            <MapPin aria-hidden="true" className="size-4 shrink-0" />
            {oferta.vaga.unidade.nome} ({oferta.vaga.unidade.zona})
          </dd>
        </div>
        <div>
          <dt className="text-sm text-tinta-suave">{OFERTA.distancia}</dt>
          <dd>
            {oferta.vaga.distanciaKm === null
              ? OFERTA.semDistancia
              : OFERTA.distanciaKm(formatarNumero(oferta.vaga.distanciaKm))}
          </dd>
        </div>
        {oferta.vaga.urgencia ? (
          <div>
            <dt className="sr-only">Urgência</dt>
            <dd>{OFERTA.urgencia[oferta.vaga.urgencia]}</dd>
          </div>
        ) : null}
        {aberta && oferta.expiraEm ? (
          <div>
            <dt className="text-sm text-tinta-suave">{OFERTA.prazo}</dt>
            <dd>
              {OFERTA.responderAte(formatarHora(oferta.expiraEm))},{" "}
              <TempoQueFalta
                expiraEm={oferta.expiraEm}
                texto={OFERTA.falta}
                encerrado={OFERTA.prazoAcabou}
                className="font-semibold"
              />
            </dd>
          </div>
        ) : null}
        {oferta.respondidaEm ? (
          <div>
            <dt className="sr-only">Resposta</dt>
            <dd className="text-tinta-suave">
              {OFERTA.respondidaEm(formatarHora(oferta.respondidaEm))}
              {oferta.motivoRecusa
                ? `. ${OFERTA.motivoDaRecusa(ROTULO_MOTIVO_RECUSA[oferta.motivoRecusa])}`
                : null}
            </dd>
          </div>
        ) : null}
      </dl>

      <SuperficieVoz as="section" voz="ia" aria-label={OFERTA.porQueTitulo} className="mt-4 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="font-semibold">{OFERTA.porQueTitulo}</h4>
          <VozTag voz="ia" />
        </div>
        <p className="mt-2">{oferta.porQue.texto || OFERTA.porQueVazio}</p>
        {oferta.alertas.length > 0 ? (
          <p className="mt-2 text-sm font-medium text-atencao">
            {OFERTA.alertas}: {oferta.alertas.join("; ")}.
          </p>
        ) : null}
      </SuperficieVoz>

      {contestada ? <p className="mt-3 text-sm text-tinta-suave">{OFERTA.contestada}</p> : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {aberta ? (
          <>
            <Button variant="decision" onClick={() => setAcao("aceitar")}>
              {OFERTA.aceitar}
            </Button>
            <Button variant="secondary" onClick={() => setAcao("recusar")}>
              {OFERTA.recusar}
            </Button>
          </>
        ) : null}
        {!contestada && oferta.status !== "na_fila" ? (
          <Button variant="ghost" onClick={() => setAcao("contestar")}>
            {OFERTA.contestar}
          </Button>
        ) : null}
      </div>

      <DialogoDeResposta
        oferta={oferta}
        tipo={acao === "aceitar" || acao === "recusar" ? acao : null}
        aoFechar={() => setAcao(null)}
        aoResponder={aoResponder}
      />
      <DialogoDeContestacao
        oferta={oferta}
        aberto={acao === "contestar"}
        aoFechar={() => setAcao(null)}
        aoEnviar={aoResponder}
      />
    </article>
  );
}

function DialogoDeResposta({
  oferta,
  tipo,
  aoFechar,
  aoResponder,
}: {
  oferta: Oferta;
  tipo: "aceitar" | "recusar" | null;
  aoFechar: () => void;
  aoResponder: (mensagem: string) => void;
}) {
  const responder = useResponderOferta();
  const [motivo, setMotivo] = React.useState<MotivoRecusa | null>(null);
  const [erroDoMotivo, setErroDoMotivo] = React.useState<string | null>(null);
  const tituloRef = React.useRef<HTMLHeadingElement>(null);
  const recusa = tipo === "recusar";

  const fechar = () => {
    setMotivo(null);
    setErroDoMotivo(null);
    responder.reset();
    aoFechar();
  };

  const confirmar = () => {
    if (!tipo) return;
    if (recusa && !motivo) {
      setErroDoMotivo(RESPONDER.motivoObrigatorio);
      return;
    }
    responder.mutate(
      { ofertaId: oferta.id, resposta: tipo, motivo: recusa ? (motivo ?? undefined) : undefined },
      {
        onSuccess: () => {
          aoResponder(recusa ? RESPONDER.recusada : RESPONDER.aceita);
          fechar();
        },
      },
    );
  };

  return (
    <Dialog open={tipo !== null} onOpenChange={(abrir) => (abrir ? undefined : fechar())}>
      <DialogContent
        className="md:max-w-lg"
        onOpenAutoFocus={(evento) => {
          // O foco vai ao título, não ao botão de confirmar: Enter sem ler não responde nada.
          evento.preventDefault();
          tituloRef.current?.focus();
        }}
      >
        <DialogTitle ref={tituloRef} tabIndex={-1} className="outline-none">
          {recusa ? RESPONDER.recusarTitulo : RESPONDER.aceitarTitulo}
        </DialogTitle>
        <DialogDescription>
          {recusa ? RESPONDER.recusarDescricao : RESPONDER.aceitarDescricao}
        </DialogDescription>
        <div className="mt-4 grid gap-4">
          <p className="font-medium">
            {ROTULO_ESPECIALIDADE[oferta.vaga.especialidade]}, {oferta.vaga.unidade.nome},{" "}
            {formatarIntervalo(oferta.vaga.inicio, oferta.vaga.fim)}
          </p>
          {responder.isError ? (
            <Alert tone="erro">{mensagemDoErro(responder.error, RESPONDER.erro)}</Alert>
          ) : null}
          {recusa ? (
            <Opcoes
              nome={`motivo-recusa-${oferta.id}`}
              legenda={RESPONDER.motivoLegenda}
              opcoes={MOTIVOS_RECUSA.map((valor) => ({ valor, rotulo: ROTULO_MOTIVO_RECUSA[valor] }))}
              valor={motivo}
              aoMudar={(valor) => {
                setMotivo(valor);
                setErroDoMotivo(null);
              }}
              erro={erroDoMotivo}
            />
          ) : null}
          <div className="flex flex-wrap gap-2 border-t border-divisor pt-4">
            <Button
              variant={recusa ? "primary" : "decision"}
              loading={responder.isPending}
              onClick={confirmar}
            >
              {recusa ? RESPONDER.confirmarRecusa : RESPONDER.confirmarAceite}
            </Button>
            <Button variant="secondary" disabled={responder.isPending} onClick={fechar}>
              {RESPONDER.voltar}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DialogoDeContestacao({
  oferta,
  aberto,
  aoFechar,
  aoEnviar,
}: {
  oferta: Oferta;
  aberto: boolean;
  aoFechar: () => void;
  aoEnviar: (mensagem: string) => void;
}) {
  const contestar = useContestar();
  const [motivo, setMotivo] = React.useState<MotivoContestacao | null>(null);
  const [texto, setTexto] = React.useState("");
  const [erros, setErros] = React.useState<{ motivo?: string; texto?: string }>({});
  const tituloRef = React.useRef<HTMLHeadingElement>(null);
  const campoTexto = `contestacao-texto-${oferta.id}`;

  const fechar = () => {
    setMotivo(null);
    setTexto("");
    setErros({});
    contestar.reset();
    aoFechar();
  };

  const enviar = () => {
    const novos = {
      motivo: motivo ? undefined : CONTESTAR.motivoObrigatorio,
      texto: texto.trim() ? undefined : CONTESTAR.textoObrigatorio,
    };
    setErros(novos);
    if (novos.motivo || novos.texto || !motivo) return;
    contestar.mutate(
      { ofertaId: oferta.id, motivo, texto: texto.trim() },
      {
        onSuccess: (contestacao) => {
          aoEnviar(CONTESTAR.enviada(contestacao.protocolo));
          fechar();
        },
      },
    );
  };

  return (
    <Dialog open={aberto} onOpenChange={(abrir) => (abrir ? undefined : fechar())}>
      <DialogContent
        className="md:max-w-lg"
        onOpenAutoFocus={(evento) => {
          evento.preventDefault();
          tituloRef.current?.focus();
        }}
      >
        <DialogTitle ref={tituloRef} tabIndex={-1} className="outline-none">
          {CONTESTAR.titulo}
        </DialogTitle>
        <DialogDescription>{CONTESTAR.descricao}</DialogDescription>
        <div className="mt-4 grid gap-4">
          {contestar.isError ? (
            <Alert tone="erro">{mensagemDoErro(contestar.error, CONTESTAR.erro)}</Alert>
          ) : null}
          <Opcoes
            nome={`motivo-contestacao-${oferta.id}`}
            legenda={CONTESTAR.motivoLegenda}
            opcoes={MOTIVOS_CONTESTACAO.map((valor) => ({
              valor,
              rotulo: ROTULO_MOTIVO_CONTESTACAO[valor],
            }))}
            valor={motivo}
            aoMudar={(valor) => {
              setMotivo(valor);
              setErros((atual) => ({ ...atual, motivo: undefined }));
            }}
            erro={erros.motivo}
          />
          <Field id={campoTexto} label={CONTESTAR.texto} hint={CONTESTAR.textoAjuda} error={erros.texto}>
            {(aria) => (
              <Textarea
                {...aria}
                className="min-h-24"
                maxLength={LIMITE_TEXTO_LIVRE}
                value={texto}
                onChange={(evento) => setTexto(evento.target.value)}
              />
            )}
          </Field>
          <div className="flex flex-wrap gap-2 border-t border-divisor pt-4">
            <Button loading={contestar.isPending} onClick={enviar}>
              {CONTESTAR.enviar}
            </Button>
            <Button variant="secondary" disabled={contestar.isPending} onClick={fechar}>
              {CONTESTAR.voltar}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
