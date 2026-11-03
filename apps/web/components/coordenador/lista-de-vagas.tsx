"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Ban,
  CircleCheck,
  ClipboardList,
  FilePen,
  Hourglass,
  Send,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useVagas } from "@/lib/api/hooks";
import type { StatusVaga, Vaga } from "@/lib/api/types";
import { ROTULO_ESPECIALIDADE, ROTULO_STATUS_VAGA, ROTULO_URGENCIA } from "@/lib/copy/rotulos";
import { formatarIntervalo } from "@/lib/format/datas";
import { cn } from "@/lib/utils";

/** A etiqueta de cada estado. O tracejado é a voz da sugestão que espera uma decisão. */
const ESTADO: Record<StatusVaga, { icone: LucideIcon; tone: NonNullable<BadgeProps["tone"]> }> = {
  rascunho: { icone: FilePen, tone: "neutro" },
  aguardando_decisao: { icone: Hourglass, tone: "ia" },
  oferta_em_andamento: { icone: Send, tone: "regra" },
  preenchida: { icone: CircleCheck, tone: "humano" },
  sem_cobertura: { icone: Ban, tone: "erro" },
};

const FILTROS = [
  { id: "todas", rotulo: "Todas", serve: () => true },
  { id: "aguardando", rotulo: "Aguardando sua decisão", serve: (v: Vaga) => v.status === "aguardando_decisao" },
  { id: "andamento", rotulo: "Oferta em andamento", serve: (v: Vaga) => v.status === "oferta_em_andamento" },
  { id: "preenchidas", rotulo: "Preenchidas", serve: (v: Vaga) => v.status === "preenchida" },
  { id: "risco", rotulo: "Em risco", serve: (v: Vaga) => v.emRisco },
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

function descrever(vaga: Vaga): string {
  const horario =
    vaga.inicio && vaga.fim ? formatarIntervalo(vaga.inicio, vaga.fim) : "horário ainda não conferido";
  const urgencia = vaga.urgencia ? `, urgência ${ROTULO_URGENCIA[vaga.urgencia]}` : "";
  return `${vaga.unidade.nome}, ${horario}${urgencia}`;
}

function LinhaDeVaga({ vaga }: { vaga: Vaga }) {
  const { icone: Icone, tone } = ESTADO[vaga.status];
  const rascunho = vaga.status === "rascunho";
  const aguardando = vaga.status === "aguardando_decisao";
  return (
    <li className="grid gap-3 rounded-cartao border border-divisor bg-papel p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-6">
      <div className="min-w-0">
        <h3 className="font-serif text-xl font-semibold">
          {vaga.especialidade ? ROTULO_ESPECIALIDADE[vaga.especialidade] : "Vaga sem especialidade"}
        </h3>
        <p className="mt-0.5 text-tinta-suave">{descrever(vaga)}</p>
        {rascunho ? (
          <p className="mt-1 line-clamp-2 text-sm text-tinta-suave">Pedido: “{vaga.textoOriginal}”</p>
        ) : null}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge tone={tone}>
            <Icone aria-hidden="true" />
            {ROTULO_STATUS_VAGA[vaga.status]}
          </Badge>
          {vaga.emRisco ? (
            <Badge tone="atencao">
              <TriangleAlert aria-hidden="true" />
              Em risco
            </Badge>
          ) : null}
        </div>
        {vaga.emRisco && vaga.motivoRisco ? (
          <p className="mt-2 text-sm font-medium text-atencao">{vaga.motivoRisco}</p>
        ) : null}
        {vaga.status === "preenchida" && vaga.preenchidaPor ? (
          <p className="mt-2 text-sm text-tinta-suave">
            Aceita por {vaga.preenchidaPor.nome}
            {vaga.tempoAtePreencherMin ? ` em ${vaga.tempoAtePreencherMin} min` : ""} (simulado).
          </p>
        ) : null}
      </div>
      <Button
        asChild
        variant={aguardando ? "primary" : "secondary"}
        className="w-full md:w-auto"
      >
        <Link href={rascunho ? "/coordenador/vagas/nova" : `/coordenador/vagas/${vaga.id}`}>
          {rascunho ? "Continuar a vaga" : aguardando ? "Ver as sugestões" : "Abrir a vaga"}
        </Link>
      </Button>
    </li>
  );
}

function Carregando() {
  return (
    <div role="status" className="grid gap-3">
      <span className="sr-only">Carregando as vagas…</span>
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-28 rounded-cartao" />
      ))}
    </div>
  );
}

/** A lista de vagas, filtrada pela URL (`?status=`), para atualizar a página sem perder o lugar. */
export function ListaDeVagas() {
  const parametros = useSearchParams();
  const escolhido = FILTROS.find((f) => f.id === parametros.get("status")) ?? FILTROS[0];
  const { data: vagas, isPending, isError, refetch } = useVagas();

  if (isError) {
    return (
      <Alert tone="erro" title="Não foi possível carregar as vagas">
        <p>Tente de novo. Se continuar, volte ao início e entre pela demonstração.</p>
        <Button className="mt-3" variant="secondary" size="sm" onClick={() => void refetch()}>
          Tentar de novo
        </Button>
      </Alert>
    );
  }
  if (isPending || !vagas) return <Carregando />;

  const visiveis = vagas.filter(escolhido.serve).sort(porPrioridade);

  return (
    <div className="grid gap-4">
      <nav aria-label="Filtrar as vagas">
        <ul className="flex flex-wrap gap-2">
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
        <ul className="grid gap-3">
          {visiveis.map((vaga) => (
            <LinhaDeVaga key={vaga.id} vaga={vaga} />
          ))}
        </ul>
      )}
    </div>
  );
}
