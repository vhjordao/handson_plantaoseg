"use client";

import Link from "next/link";
import { CircleOff, FilePen, SearchX } from "lucide-react";
import { RegraBarrou } from "@/components/dominio/regra-barrou";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { NaoEncontradoError } from "@/lib/api/erros";
import { useEstadoDaDecisao, useSugestoes, useVaga } from "@/lib/api/hooks";
import { useEstadoApi } from "@/lib/api/provider";
import { ORDEM, VAGA } from "@/lib/copy/coordenador";
import { ROTULO_ESPECIALIDADE } from "@/lib/copy/rotulos";
import { descreverVaga, EtiquetasDaVaga } from "./etiquetas-da-vaga";
import { CascataDaVaga } from "./cascata-da-vaga";
import { InicioDaVaga } from "./inicio-da-vaga";
import { OrdemSugerida } from "./ordem-sugerida";

function Carregando() {
  return (
    <div role="status" className="grid gap-4">
      <span className="sr-only">{VAGA.carregando}</span>
      <Skeleton className="h-16 rounded-cartao" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Skeleton className="h-96 rounded-cartao" />
        <Skeleton className="h-64 rounded-cartao" />
      </div>
    </div>
  );
}

/**
 * A tela de uma vaga: o cabeçalho e, conforme o estado, a ordem sugerida com a decisão, o que já
 * foi decidido, o que falta num rascunho ou o motivo de não haver ninguém para sugerir.
 */
export function TelaDaVaga({ vagaId, jaExistia }: { vagaId: string; jaExistia: boolean }) {
  const { falhou, tentarDeNovo } = useEstadoApi();
  const vagaConsulta = useVaga(vagaId);
  const vaga = vagaConsulta.data;
  const temSugestoes = Boolean(vaga && vaga.status !== "rascunho");
  const sugestoes = useSugestoes(vagaId, temSugestoes);
  const decisao = useEstadoDaDecisao(vagaId);

  const refazer = () => {
    if (falhou) return tentarDeNovo();
    void vagaConsulta.refetch();
    if (temSugestoes) void sugestoes.refetch();
    void decisao.refetch();
  };

  if (vagaConsulta.error instanceof NaoEncontradoError) {
    return (
      <div className="mx-auto w-full max-w-[720px]">
        <EmptyState
          icon={SearchX}
          headingLevel="h1"
          title={VAGA.naoEncontradaTitulo}
          action={
            <Button asChild>
              <Link href="/coordenador/vagas">{VAGA.voltar}</Link>
            </Button>
          }
        >
          {VAGA.naoEncontrada}
        </EmptyState>
      </div>
    );
  }

  // As consultas falham em momentos diferentes: a da vaga decide primeiro se ela existe.
  const falhouAoCarregar = falhou || vagaConsulta.isError || (vaga && (sugestoes.isError || decisao.isError));
  if (falhouAoCarregar) {
    return (
      <div className="mx-auto w-full max-w-[720px]">
        <h1 className="sr-only">{VAGA.erroTitulo}</h1>
        <Alert tone="erro" title={VAGA.erroTitulo}>
          <p>{VAGA.erro}</p>
          <Button className="mt-3" variant="secondary" size="sm" onClick={refazer}>
            {VAGA.tentarDeNovo}
          </Button>
        </Alert>
      </div>
    );
  }

  if (!vaga) return <Carregando />;

  const cabecalho = (
    <InicioDaVaga>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h1 className="font-titulo text-3xl font-semibold">
          {vaga.especialidade ? ROTULO_ESPECIALIDADE[vaga.especialidade] : "Vaga sem especialidade"}
        </h1>
        <EtiquetasDaVaga vaga={vaga} />
      </div>
      <p className="mt-1 text-tinta-suave">{descreverVaga(vaga)}</p>
      {vaga.emRisco && vaga.motivoRisco ? (
        <p className="mt-1 text-sm font-medium text-atencao">{vaga.motivoRisco}</p>
      ) : null}
      {vaga.textoOriginal ? (
        <p className="mt-2 max-w-[70ch] text-sm break-words text-tinta-suave">
          {VAGA.pedidoOriginal}: “{vaga.textoOriginal}”
        </p>
      ) : null}
    </InicioDaVaga>
  );

  if (vaga.status === "rascunho") {
    return (
      <div className="mx-auto grid w-full max-w-[720px] grid-cols-1 gap-6">
        {cabecalho}
        <EmptyState
          icon={FilePen}
          title={VAGA.rascunhoTitulo}
          action={
            <Button asChild>
              <Link href={`/coordenador/vagas/nova?rascunho=${vaga.id}`}>{VAGA.continuar}</Link>
            </Button>
          }
        >
          {VAGA.rascunho}
        </EmptyState>
      </div>
    );
  }

  if (!sugestoes.data || !decisao.data) {
    return (
      <div className="mx-auto grid w-full max-w-[1100px] grid-cols-1 gap-6">
        {cabecalho}
        <Carregando />
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-[1100px] grid-cols-1 gap-6">
      {jaExistia ? <Alert tone="info">{VAGA.jaExistia}</Alert> : null}
      {cabecalho}

      {vaga.status === "preenchida" && vaga.preenchidaPor ? (
        <Alert tone="sucesso">{ORDEM.preenchida(vaga.preenchidaPor.nome, vaga.tempoAtePreencherMin)}</Alert>
      ) : null}
      {vaga.status === "oferta_em_andamento" ? (
        <Alert tone="info" title={ORDEM.ofertaEmAndamentoTitulo}>
          {ORDEM.ofertaEmAndamento}
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {sugestoes.data.candidatos.length > 0 ? (
          <OrdemSugerida vaga={vaga} recomendacao={sugestoes.data} estado={decisao.data} />
        ) : (
          <EmptyState
            icon={CircleOff}
            title={VAGA.semCoberturaTitulo}
            action={
              <Button asChild>
                <Link href="/coordenador/vagas/nova">{VAGA.publicarOutra}</Link>
              </Button>
            }
          >
            {VAGA.semCobertura}
          </EmptyState>
        )}
        <RegraBarrou recomendacao={sugestoes.data} />
      </div>

      {decisao.data.decisao ? <CascataDaVaga vaga={vaga} /> : null}
    </div>
  );
}
