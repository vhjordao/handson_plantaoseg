"use client";

import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  CircleHelp,
  Clock,
  Hourglass,
  Inbox,
  ListOrdered,
  MessageSquareWarning,
  Percent,
  Sparkles,
  Timer,
  UserRound,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { AnelDoPrazo, TempoQueFalta } from "@/components/dominio/prazo";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CabecalhoDePagina } from "@/components/ui/cabecalho-de-pagina";
import { BarrasComparadas, ReguaDeProgresso } from "@/components/ui/minigrafico";
import { CabecalhoDoPainel, IconeEmCirculo, Painel, type TomDoIcone } from "@/components/ui/painel";
import { Skeleton } from "@/components/ui/skeleton";
import { useContestacoes, useOfertas } from "@/lib/api/hooks";
import { NaoImplementadoError } from "@/lib/api/plantao-api";
import type { Medico, Oferta, StatusOferta } from "@/lib/api/types";
import { OFERTA, OFERTAS } from "@/lib/copy/medico";
import { ROTULO_ESPECIALIDADE, ROTULO_STATUS_OFERTA } from "@/lib/copy/rotulos";
import { formatarHora, formatarIntervalo, formatarNumero } from "@/lib/format/datas";
import { cn } from "@/lib/utils";

const ESTADO: Record<StatusOferta, { icone: LucideIcon; tom: TomDoIcone; badge: "neutro" | "atencao" | "humano" | "erro" }> = {
  na_fila: { icone: ListOrdered, tom: "neutro", badge: "neutro" },
  aberta: { icone: Clock, tom: "atencao", badge: "atencao" },
  aceita: { icone: CheckCircle2, tom: "humano", badge: "humano" },
  recusada: { icone: XCircle, tom: "erro", badge: "neutro" },
  expirada: { icone: Hourglass, tom: "neutro", badge: "neutro" },
  cancelada: { icone: XCircle, tom: "neutro", badge: "neutro" },
};

function iniciais(nome: string): string {
  const partes = nome.split(" ").filter(Boolean);
  return `${partes[0]?.[0] ?? ""}${partes.length > 1 ? partes[partes.length - 1][0] : ""}`.toUpperCase();
}

/** O cartão do perfil, no lugar da foto do paciente do modelo: as iniciais, porque os dados são fictícios. */
function Perfil({ medico }: { medico: Medico }) {
  const atalhos = [
    { href: "/medico/conta/credenciais", rotulo: "Credenciais", icone: BadgeCheck },
    { href: "/medico/conta", rotulo: "Minha conta", icone: UserRound },
    { href: "/medico/contestacoes", rotulo: "Contestações", icone: MessageSquareWarning },
    { href: "/ajuda", rotulo: "Ajuda", icone: CircleHelp },
  ];
  return (
    <section
      aria-labelledby="perfil-titulo"
      className="relative flex min-h-72 flex-col overflow-hidden rounded-cartao border border-painel-borda bg-[linear-gradient(160deg,var(--acento-tom),var(--painel-solido)_60%)] p-5 shadow-cartao"
    >
      <h2 id="perfil-titulo" className="font-titulo text-2xl leading-8 font-medium">
        {medico.nome}
      </h2>
      <p className="mt-1 text-sm [overflow-wrap:anywhere] text-tinta-suave">
        {ROTULO_ESPECIALIDADE[medico.especialidade]}, {medico.crm}
      </p>
      <span
        aria-hidden="true"
        className="mx-auto my-5 inline-flex size-28 items-center justify-center rounded-full bg-papel/80 text-4xl font-semibold text-acento-forte shadow-flutuante ring-8 ring-papel/40"
      >
        {iniciais(medico.nome)}
      </span>
      <p className="text-center text-xs text-tinta-suave">Persona fictícia. Todos os dados são sintéticos.</p>
      <nav aria-label="Atalhos da conta" className="mt-auto pt-4">
        <ul className="flex justify-center gap-2">
          {atalhos.map(({ href, rotulo, icone: Icone }) => (
            <li key={href}>
              <Link
                href={href}
                aria-label={rotulo}
                title={rotulo}
                className="inline-flex size-[var(--alvo-min)] items-center justify-center rounded-full border border-painel-borda bg-papel/70 text-tinta shadow-cartao transition-[background-color] duration-150 hover:bg-papel"
              >
                <Icone aria-hidden="true" className="size-[18px]" />
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
}

/** A pílula azul do modelo ("insights"): leva à oferta, onde está o "Por que você". */
function PilulaDaIa({ href, titulo, texto }: { href: string; titulo: string; texto: string }) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-full bg-[linear-gradient(100deg,var(--acento),var(--ia))] py-1.5 pr-1.5 pl-1.5 text-sobre-acento shadow-botao transition-transform duration-200 motion-safe:hover:scale-[1.01]"
    >
      <span aria-hidden="true" className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-papel/25">
        <Sparkles className="size-[18px]" />
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block font-semibold">{titulo}</span>
        <span className="block text-sm opacity-90">{texto}</span>
      </span>
      <span aria-hidden="true" className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-papel text-acento">
        <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

function ProximaResposta({ aberta }: { aberta: Oferta | undefined }) {
  return (
    <Painel aria-labelledby="proxima-titulo" className="flex flex-col gap-4">
      <CabecalhoDoPainel icone={Timer} tom="atencao" id="proxima-titulo" titulo="Próxima resposta" />
      <div className="grid flex-1 place-items-center">
        {aberta && aberta.expiraEm ? (
          <div className="grid justify-items-center gap-2 text-center">
            <AnelDoPrazo expiraEm={aberta.expiraEm} ttlMin={aberta.ttlMin} tamanho={196} />
            <p className="font-medium">
              {ROTULO_ESPECIALIDADE[aberta.vaga.especialidade]}, {aberta.vaga.unidade.nome}
            </p>
            <p className="text-sm text-tinta-suave">
              {OFERTA.responderAte(formatarHora(aberta.expiraEm))},{" "}
              <TempoQueFalta expiraEm={aberta.expiraEm} texto={OFERTA.falta} encerrado={OFERTA.prazoAcabou} />
            </p>
          </div>
        ) : (
          <div className="grid justify-items-center gap-2 py-6 text-center">
            <IconeEmCirculo icone={Inbox} tom="neutro" />
            <p className="font-medium">{OFERTAS.semAbertasTitulo}</p>
            <p className="max-w-[32ch] text-sm text-tinta-suave">{OFERTAS.semAbertas}</p>
          </div>
        )}
      </div>
      <PilulaDaIa
        href="/medico/ofertas"
        titulo={aberta ? "Por que você" : "Suas ofertas"}
        texto={aberta ? "Ver a oferta e o motivo da sugestão" : "Ver as respondidas e encerradas"}
      />
    </Painel>
  );
}

/** Um número do médico, no formato dos cartões pequenos do modelo. */
function Numero({
  titulo,
  icone,
  tom,
  valor,
  complemento,
  grafico,
  className,
}: {
  titulo: string;
  icone: LucideIcon;
  tom: TomDoIcone;
  valor: string;
  complemento?: string;
  grafico?: React.ReactNode;
  className?: string;
}) {
  return (
    <li className={cn("superficie flex min-w-0 flex-col gap-2 p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-medium">{titulo}</h3>
        <IconeEmCirculo icone={icone} tom={tom} tamanho="sm" />
      </div>
      <div className="mt-auto flex flex-wrap items-end justify-between gap-3">
        <p className="numero-destaque text-[2.5rem] leading-none">{valor}</p>
        {grafico ? <div className="w-28 max-w-full">{grafico}</div> : null}
      </div>
      {complemento ? <p className="text-sm text-tinta-suave">{complemento}</p> : null}
    </li>
  );
}

/** As ofertas em ordem de chegada, como a agenda do modelo: hora, plantão e estado. */
function LinhaDoTempo({ ofertas }: { ofertas: Oferta[] }) {
  const ordenadas = [...ofertas]
    .filter((o) => o.enviadaEm)
    .sort((a, b) => (b.enviadaEm ?? "").localeCompare(a.enviadaEm ?? ""));
  return (
    <Painel aria-labelledby="linha-titulo" className="grid content-start gap-4">
      <CabecalhoDoPainel icone={CalendarClock} tom="acao" id="linha-titulo" titulo="Linha do tempo das ofertas" />
      {ordenadas.length === 0 ? (
        <p className="text-sm text-tinta-suave">Nenhuma oferta enviada a você ainda.</p>
      ) : (
        <ol
          role="list"
          className="relative grid gap-2.5 before:absolute before:top-5 before:bottom-5 before:left-[4.6rem] before:w-px before:bg-divisor"
        >
          {ordenadas.map((oferta) => {
            const { icone, tom, badge } = ESTADO[oferta.status];
            return (
              <li key={oferta.id} className="relative grid grid-cols-[3.5rem_auto_minmax(0,1fr)] items-center gap-x-3">
                <span className="tnum text-sm text-tinta-suave">
                  {oferta.enviadaEm ? formatarHora(oferta.enviadaEm) : ""}
                </span>
                <IconeEmCirculo icone={icone} tom={tom} className="relative" />
                <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 rounded-cartao border border-painel-borda bg-papel/80 px-4 py-2 shadow-cartao sm:rounded-full">
                  <span className="min-w-0 flex-1 font-medium">
                    {ROTULO_ESPECIALIDADE[oferta.vaga.especialidade]}, {oferta.vaga.unidade.nome}
                    <span className="block text-sm font-normal text-tinta-suave">
                      {formatarIntervalo(oferta.vaga.inicio, oferta.vaga.fim)}
                    </span>
                  </span>
                  <Badge tone={badge}>{ROTULO_STATUS_OFERTA[oferta.status]}</Badge>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Painel>
  );
}

/**
 * O painel inicial do médico, no desenho do modelo visual: o perfil, a próxima resposta com o
 * prazo num anel e a pílula azul do "Por que você", os números das ofertas e a linha do tempo.
 * Usa só o que o sistema já mostra nas ofertas e nas contestações, consultado a cada 3 s (D7).
 */
export function PainelDoMedico({ medicoId, medico }: { medicoId: string; medico: Medico | null }) {
  const ofertas = useOfertas(medicoId);
  const contestacoes = useContestacoes({ medicoId });
  const primeiroNome = medico?.nome.split(" ")[0];

  const cabecalho = (
    <CabecalhoDePagina
      titulo={primeiroNome ? `Olá, ${primeiroNome}` : "Início"}
      descricao="Suas ofertas de plantão, o prazo de cada uma e o motivo de o sistema ter sugerido você."
      acoes={
        <Button asChild variant="escuro">
          <Link href="/medico/ofertas">
            <Inbox aria-hidden="true" />
            Ver as ofertas
          </Link>
        </Button>
      }
    />
  );

  if (ofertas.error instanceof NaoImplementadoError) {
    return (
      <div className="grid gap-5">
        {cabecalho}
        <Alert tone="info" title={OFERTAS.naDemonstracaoTitulo}>
          {OFERTAS.naDemonstracao}
        </Alert>
      </div>
    );
  }

  if (!ofertas.data) {
    return (
      <div className="grid gap-5">
        {cabecalho}
        {ofertas.isError ? (
          <Alert tone="erro" title={OFERTAS.erroTitulo}>
            <p>{OFERTAS.erro}</p>
            <Button className="mt-3" variant="secondary" size="sm" onClick={() => void ofertas.refetch()}>
              {OFERTAS.tentarDeNovo}
            </Button>
          </Alert>
        ) : (
          <div role="status" className="grid gap-3 lg:grid-cols-3">
            <span className="sr-only">{OFERTAS.carregando}</span>
            <Skeleton className="h-72 rounded-cartao" />
            <Skeleton className="h-72 rounded-cartao" />
            <Skeleton className="h-72 rounded-cartao" />
          </div>
        )}
      </div>
    );
  }

  const lista = ofertas.data;
  const conta = (status: StatusOferta) => lista.filter((o) => o.status === status).length;
  const aceitas = conta("aceita");
  const recusadas = conta("recusada");
  const expiradas = conta("expirada");
  const respondidas = aceitas + recusadas;
  const aberta = lista.find((o) => o.status === "aberta");
  const totalContestacoes = contestacoes.data?.length ?? 0;
  const respondidasPelaCoordenacao = (contestacoes.data ?? []).filter((c) => c.status === "respondida").length;

  return (
    <div className="grid grid-cols-1 gap-3">
      <div className="mb-2">{cabecalho}</div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)_minmax(0,1fr)]">
        {medico ? <Perfil medico={medico} /> : null}
        <ProximaResposta aberta={aberta} />
        <ul role="list" className="grid grid-cols-1 gap-3">
          <Numero
            titulo="Ofertas recebidas"
            icone={Inbox}
            tom="acao"
            valor={String(lista.length)}
            complemento={`${conta("aberta")} aberta(s), ${respondidas} respondida(s) e ${expiradas} expirada(s).`}
            grafico={
              <BarrasComparadas
                cor="azul"
                barras={[
                  { rotulo: "Abertas", valor: conta("aberta"), destaque: true },
                  { rotulo: "Aceitas", valor: aceitas, destaque: true },
                  { rotulo: "Recusadas", valor: recusadas, destaque: true },
                  { rotulo: "Expiradas", valor: expiradas, destaque: true },
                ]}
              />
            }
          />
          <Numero
            titulo="Taxa de aceite"
            icone={Percent}
            tom="humano"
            valor={respondidas > 0 ? `${formatarNumero((aceitas / respondidas) * 100, 0)}%` : "—"}
            complemento={
              respondidas > 0
                ? `Das ${respondidas} oferta(s) que você respondeu aqui.`
                : "Aparece quando você responder a uma oferta."
            }
            grafico={respondidas > 0 ? <ReguaDeProgresso proporcao={aceitas / respondidas} tracos={20} cor="humano" /> : null}
          />
        </ul>
      </div>

      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-[minmax(0,1.85fr)_minmax(0,1fr)]">
        <LinhaDoTempo ofertas={lista} />
        <ul role="list" aria-label="Resumo das respostas" className="grid grid-cols-1 gap-3 min-[22rem]:grid-cols-2">
          <Numero titulo="Aceitas" icone={CheckCircle2} tom="humano" valor={String(aceitas)} />
          <Numero titulo="Recusadas" icone={XCircle} tom="erro" valor={String(recusadas)} />
          <Numero titulo="Expiradas" icone={Hourglass} tom="neutro" valor={String(expiradas)} />
          <Numero
            titulo="Contestações"
            icone={MessageSquareWarning}
            tom="acao"
            valor={String(totalContestacoes)}
            complemento={totalContestacoes > 0 ? `${respondidasPelaCoordenacao} com resposta.` : undefined}
          />
        </ul>
      </div>
    </div>
  );
}
