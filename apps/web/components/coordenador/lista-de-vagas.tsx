"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { SuperficieVoz } from "@/components/dominio/superficie-voz";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useVagas } from "@/lib/api/hooks";
import { useEstadoApi } from "@/lib/api/provider";
import type { StatusVaga, Vaga } from "@/lib/api/types";
import { ROTULO_ESPECIALIDADE } from "@/lib/copy/rotulos";
import { plural } from "@/lib/format/datas";
import { cn } from "@/lib/utils";
import { descreverVaga, EtiquetasDaVaga } from "./etiquetas-da-vaga";

const FILTROS = [
  { id: "todas", rotulo: "Todas", serve: () => true },
  { id: "risco", rotulo: "Em risco", serve: (v: Vaga) => v.emRisco },
  { id: "aguardando", rotulo: "Aguardando sua decisão", serve: (v: Vaga) => v.status === "aguardando_decisao" },
  { id: "andamento", rotulo: "Oferta em andamento", serve: (v: Vaga) => v.status === "oferta_em_andamento" },
  { id: "preenchidas", rotulo: "Preenchidas", serve: (v: Vaga) => v.status === "preenchida" },
  { id: "rascunhos", rotulo: "Rascunhos", serve: (v: Vaga) => v.status === "rascunho" },
] as const;

/** O que exige ação vai para o topo: risco, depois decisão pendente, oferta em curso, rascunho e o resto. */
function prioridade(vaga: Vaga): number {
  if (vaga.emRisco && vaga.status !== "preenchida") return 0;
  const porStatus: Record<StatusVaga, number> = {
    aguardando_decisao: 1,
    oferta_em_andamento: 2,
    rascunho: 3,
    sem_cobertura: 4,
    preenchida: 5,
  };
  return porStatus[vaga.status];
}

function porPrioridade(a: Vaga, b: Vaga): number {
  return prioridade(a) - prioridade(b) || b.criadaEm.localeCompare(a.criadaEm);
}

/** "Exigem a sua ação": o que o coordenador precisa ver antes de qualquer número. */
function ResumoDeAcao({ vagas }: { vagas: Vaga[] }) {
  const itens = [
    { id: "risco", n: vagas.filter((v) => v.emRisco && v.status !== "preenchida").length, um: "em risco", varios: "em risco" },
    { id: "aguardando", n: vagas.filter((v) => v.status === "aguardando_decisao").length, um: "aguardando a sua decisão", varios: "aguardando a sua decisão" },
    { id: "rascunhos", n: vagas.filter((v) => v.status === "rascunho").length, um: "rascunho para continuar", varios: "rascunhos para continuar" },
  ].filter((item) => item.n > 0);

  return (
    <section aria-labelledby="acao-titulo" className="rounded-cartao border border-divisor bg-papel p-4">
      <h2 id="acao-titulo" className="font-serif text-xl font-semibold">
        {itens.length > 0 ? "Exigem a sua ação" : "Nada exige a sua ação agora"}
      </h2>
      {itens.length > 0 ? (
        <ul role="list" className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
          {itens.map((item) => (
            <li key={item.id}>
              <Link
                href={`?status=${item.id}`}
                className="inline-flex min-h-[var(--alvo-min)] items-center text-base font-semibold underline underline-offset-4 hover:no-underline"
              >
                {plural(item.n, item.um, item.varios)}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function LinhaDeVaga({ vaga }: { vaga: Vaga }) {
  const rascunho = vaga.status === "rascunho";
  const aguardando = vaga.status === "aguardando_decisao";

  const corpo = (
    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-6">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h3 id={`vaga-${vaga.id}-titulo`} className="font-serif text-xl font-semibold">
            {vaga.especialidade ? ROTULO_ESPECIALIDADE[vaga.especialidade] : "Vaga sem especialidade"}
          </h3>
          <EtiquetasDaVaga vaga={vaga} />
        </div>
        <p id={`vaga-${vaga.id}-descricao`} className="mt-0.5 text-tinta-suave">
          {descreverVaga(vaga)}
        </p>
        {rascunho ? (
          <p className="mt-1 line-clamp-2 text-sm text-tinta-suave">Pedido: “{vaga.textoOriginal}”</p>
        ) : null}
        {vaga.emRisco && vaga.motivoRisco ? (
          <p className="mt-1 text-sm font-medium text-atencao">{vaga.motivoRisco}</p>
        ) : null}
        {vaga.status === "preenchida" && vaga.preenchidaPor ? (
          <p className="mt-1 text-sm text-tinta-suave">
            Aceita por {vaga.preenchidaPor.nome}
            {vaga.tempoAtePreencherMin ? ` em ${vaga.tempoAtePreencherMin} min` : ""} (simulado).
          </p>
        ) : null}
      </div>
      <Button asChild variant={aguardando ? "primary" : "secondary"} className="w-full md:w-auto">
        <Link
          href={rascunho ? `/coordenador/vagas/nova?rascunho=${vaga.id}` : `/coordenador/vagas/${vaga.id}`}
          // Vários links iguais ("Abrir a vaga") só se distinguem pela vaga que está ao lado.
          aria-describedby={`vaga-${vaga.id}-titulo vaga-${vaga.id}-descricao`}
        >
          {rascunho ? "Continuar a vaga" : aguardando ? "Ver as sugestões" : "Abrir a vaga"}
        </Link>
      </Button>
    </div>
  );

  return aguardando ? (
    <SuperficieVoz as="li" voz="ia" className="p-3 md:px-4">
      {corpo}
    </SuperficieVoz>
  ) : (
    <li className="rounded-cartao border border-divisor bg-papel p-3 md:px-4">{corpo}</li>
  );
}

function Carregando() {
  return (
    <div role="status" className="grid gap-3">
      <span className="sr-only">Carregando as vagas…</span>
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-24 rounded-cartao" />
      ))}
    </div>
  );
}

/** A lista de vagas, filtrada pela URL (`?status=`), para atualizar a página sem perder o lugar. */
export function ListaDeVagas() {
  const parametros = useSearchParams();
  const escolhido = FILTROS.find((f) => f.id === parametros.get("status")) ?? FILTROS[0];
  const { falhou, tentarDeNovo } = useEstadoApi();
  const { data: vagas, isPending, isError, refetch } = useVagas();

  if (falhou || isError) {
    return (
      <Alert tone="erro" title="Não foi possível carregar as vagas">
        <p>Tente de novo. Se continuar, volte ao início e entre pela demonstração.</p>
        <Button
          className="mt-3"
          variant="secondary"
          size="sm"
          onClick={() => (falhou ? tentarDeNovo() : void refetch())}
        >
          Tentar de novo
        </Button>
      </Alert>
    );
  }
  if (isPending || !vagas) return <Carregando />;

  const visiveis = vagas.filter(escolhido.serve).sort(porPrioridade);
  // O filtro é um link: o foco fica nele e a lista muda. Esta frase, numa região de status que já
  // estava na página, é o que avisa o leitor de tela (WCAG 4.1.3) e confirma o resultado a todos.
  const palavraVagas = vagas.length === 1 ? "vaga" : "vagas";
  const quantasVagas =
    escolhido.id === "todas"
      ? `Mostrando ${vagas.length} ${palavraVagas}.`
      : `Mostrando ${visiveis.length} de ${vagas.length} ${palavraVagas} (${escolhido.rotulo}).`;

  return (
    <div className="grid gap-4">
      <ResumoDeAcao vagas={vagas} />

      <section aria-labelledby="lista-titulo" className="grid gap-4">
        <h2 id="lista-titulo" className="sr-only">
          Lista de vagas
        </h2>
        <nav aria-label="Filtrar as vagas">
          <ul role="list" className="flex flex-wrap gap-2">
            {FILTROS.map((filtro) => {
              const ativo = filtro.id === escolhido.id;
              const total = vagas.filter(filtro.serve).length;
              return (
                <li key={filtro.id}>
                  <Link
                    href={filtro.id === "todas" ? "/coordenador/vagas" : `?status=${filtro.id}`}
                    aria-current={ativo ? "true" : undefined}
                    className={cn(
                      "inline-flex min-h-[var(--alvo-min)] items-center gap-2 rounded-campo border px-3 text-base",
                      ativo
                        ? "border-tinta bg-papel font-semibold"
                        : "border-transparent font-medium text-tinta-suave hover:bg-tinta/10 hover:text-tinta",
                    )}
                  >
                    {filtro.rotulo}
                    <span className="tnum text-sm">{total}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <p role="status" className="-mt-2 text-sm text-tinta-suave">
          {quantasVagas}
        </p>

        {visiveis.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Nenhuma vaga neste filtro"
            action={
              <Button asChild>
                <Link href="/coordenador/vagas/nova">Publicar uma vaga</Link>
              </Button>
            }
          >
            Troque o filtro ou publique uma vaga: você escreve o pedido em texto livre e confere o
            que o sistema leu.
          </EmptyState>
        ) : (
          <ul role="list" className="grid gap-3">
            {visiveis.map((vaga) => (
              <LinhaDeVaga key={vaga.id} vaga={vaga} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
