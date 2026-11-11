"use client";

import Link from "next/link";
import { Building2, CalendarClock, CircleOff, FilePen, Gauge, MessageSquareQuote, SearchX, Users } from "lucide-react";
import { RegraBarrou } from "@/components/dominio/regra-barrou";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { AnelDeTracos } from "@/components/ui/anel-de-tracos";
import { Fato } from "@/components/ui/fato";
import { CabecalhoDoPainel, Painel } from "@/components/ui/painel";
import { formatarNumero } from "@/lib/format/datas";
import type { Vaga } from "@/lib/api/types";
import { ROTULO_URGENCIA } from "@/lib/copy/rotulos";
import { formatarIntervalo } from "@/lib/format/datas";
import { Skeleton } from "@/components/ui/skeleton";
import { NaoEncontradoError } from "@/lib/api/erros";
import { useEstadoDaDecisao, useSugestoes, useVaga } from "@/lib/api/hooks";
import { useEstadoApi } from "@/lib/api/provider";
import { ORDEM, VAGA } from "@/lib/copy/coordenador";
import { ROTULO_ESPECIALIDADE } from "@/lib/copy/rotulos";
import { EtiquetasDaVaga } from "./etiquetas-da-vaga";
import { CascataDaVaga } from "./cascata-da-vaga";
import { InicioDaVaga } from "./inicio-da-vaga";
import { OrdemSugerida } from "./ordem-sugerida";

/**
 * O resumo da vaga num painel, com os fatos lado a lado: onde, quando, a urgência e o pedido
 * como foi escrito. É o "perfil" da vaga, no lugar do perfil do paciente do modelo visual.
 */
function ResumoDaVaga({ vaga }: { vaga: Vaga }) {
  return (
    <Painel aria-label="Resumo da vaga" className="grid gap-4">
      <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.7fr)_minmax(0,1.6fr)]">
        <Fato icone={Building2} rotulo="Hospital">
          {vaga.unidade.nome}
        </Fato>
        <Fato icone={CalendarClock} rotulo="Quando">
          {vaga.inicio && vaga.fim ? formatarIntervalo(vaga.inicio, vaga.fim) : "Horário ainda não conferido"}
        </Fato>
        <Fato icone={Gauge} rotulo="Urgência">
          {vaga.urgencia ? ROTULO_URGENCIA[vaga.urgencia] : "Não informada"}
        </Fato>
        {vaga.textoOriginal ? (
          <Fato icone={MessageSquareQuote} rotulo={VAGA.pedidoOriginal}>
            <span className="text-tinta-suave">“{vaga.textoOriginal}”</span>
          </Fato>
        ) : null}
      </dl>
      {vaga.emRisco && vaga.motivoRisco ? (
        <p className="rounded-campo border border-atencao/30 bg-atencao-tom px-3 py-2 text-sm font-medium text-atencao">
          {vaga.motivoRisco}
        </p>
      ) : null}
    </Painel>
  );
}

/**
 * Quantos médicos da rede ficaram elegíveis para a vaga, num anel de traços. É o mostrador do
 * modelo visual com um número que o coordenador usa: o tamanho da rede depois das regras.
 */
function RedeDaVaga({ totalElegiveis, totalPool }: { totalElegiveis: number; totalPool: number }) {
  const proporcao = totalPool > 0 ? totalElegiveis / totalPool : 0;
  return (
    <Painel aria-labelledby="rede-titulo" className="grid gap-3">
      <CabecalhoDoPainel icone={Users} tom="acao" id="rede-titulo" titulo="Rede para esta vaga" />
      <div className="grid place-items-center py-1">
        <AnelDeTracos proporcao={proporcao} tamanho={184}>
          <p className="numero-destaque text-5xl leading-none text-tinta">{totalElegiveis}</p>
          <p className="mt-1 text-sm text-tinta-suave">elegíveis de {totalPool}</p>
        </AnelDeTracos>
      </div>
      <p className="rounded-full bg-acento-tom px-4 py-2 text-center text-sm font-medium text-acento-forte">
        {formatarNumero(proporcao * 100, 0)}% da rede passou pelas regras fixas
      </p>
    </Painel>
  );
}

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
    <>
      <InicioDaVaga>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="font-titulo text-[1.75rem] leading-9 font-medium sm:text-[2rem] sm:leading-10">
            {vaga.especialidade ? ROTULO_ESPECIALIDADE[vaga.especialidade] : "Vaga sem especialidade"}
          </h1>
          <EtiquetasDaVaga vaga={vaga} />
        </div>
      </InicioDaVaga>
      <ResumoDaVaga vaga={vaga} />
    </>
  );

  if (vaga.status === "rascunho") {
    return (
      <div className="mx-auto grid w-full max-w-[860px] grid-cols-1 gap-4">
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
      <div className="grid w-full grid-cols-1 gap-4">
        {cabecalho}
        <Carregando />
      </div>
    );
  }

  return (
    <div className="grid w-full grid-cols-1 gap-4">
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

      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-[minmax(0,1fr)_380px]">
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
        <div className="grid gap-3">
          <RedeDaVaga totalElegiveis={sugestoes.data.totalElegiveis} totalPool={sugestoes.data.totalPool} />
          <RegraBarrou recomendacao={sugestoes.data} />
        </div>
      </div>

      {decisao.data.decisao ? <CascataDaVaga vaga={vaga} /> : null}
    </div>
  );
}
