import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Indicadores } from "@/lib/api/types";
import { linkNoRepositorio } from "@/lib/copy/comum";
import { comUnidade, formatarNumero, plural } from "@/lib/format/datas";

function Indicador({
  titulo,
  valor,
  complemento,
  simulado = true,
}: {
  titulo: string;
  valor: string;
  complemento: string;
  /** O rótulo "simulado" fica colado ao número, não só no cabeçalho do painel. */
  simulado?: boolean;
}) {
  return (
    <div className="grid gap-1 px-4 py-3">
      <dt className="text-sm text-tinta-suave">{titulo}</dt>
      <dd className="numero-destaque text-4xl leading-none text-tinta">
        {valor}
        {simulado ? (
          // O espaço de verdade (e não uma margem) deixa "simulado" descer para a linha de baixo
          // quando o número, ampliado, ocupa a largura toda.
          <>
            {" "}
            <span className="text-sm font-normal tracking-normal text-tinta-suave">simulado</span>
          </>
        ) : null}
      </dd>
      <dd className="text-sm text-tinta-suave">{complemento}</dd>
    </div>
  );
}

/**
 * Os indicadores da demonstração, sempre rotulados "simulado". O percentual de sugestões
 * aceitas só existe com usuários: antes disso aparece o travessão e o motivo, nunca um número.
 */
export function PainelIndicadores({ indicadores }: { indicadores: Indicadores }) {
  const base = indicadores.linhaDeBase;
  return (
    <section
      aria-labelledby="indicadores-titulo"
      className="superficie"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-divisor px-4 py-3">
        <h2 id="indicadores-titulo" className="font-titulo text-xl font-semibold">
          Indicadores da demonstração
        </h2>
        <Badge tone="neutro">Simulado</Badge>
      </div>
      <dl className="grid divide-y divide-divisor sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <Indicador
          titulo="Tempo médio até preencher a vaga"
          valor={comUnidade(indicadores.tempoMedioAtePreencherMin, "min", 0)}
          complemento={
            base
              ? `Regras e modelo, contra ${comUnidade(base.tempoMedioAtePreencherMin, "min", 0)} no processo manual simulado.`
              : "Regras e modelo, em simulação."
          }
        />
        <Indicador
          titulo="Preenchidas com 24 h ou mais de antecedência"
          valor={`${formatarNumero(indicadores.pctPreenchidasComAntecedencia24h, 1)}%`}
          complemento={
            base
              ? `Contra ${formatarNumero(base.pctPreenchidasComAntecedencia24h, 1)}% no processo manual simulado.`
              : "Em simulação."
          }
        />
        <Indicador
          titulo="Sugestões aceitas pelo coordenador"
          simulado={indicadores.pctSugestoesAceitas !== null}
          valor={
            indicadores.pctSugestoesAceitas === null
              ? "—"
              : `${formatarNumero(indicadores.pctSugestoesAceitas, 0)}%`
          }
          complemento={
            indicadores.pctSugestoesAceitas === null
              ? "Só se mede com usuários: aparece quando alguém decidir."
              : "Das sugestões que passaram pela sua decisão nesta sessão."
          }
        />
      </dl>
      <p className="border-t border-divisor px-4 py-3 text-sm text-tinta-suave">
        Na demonstração: {plural(indicadores.vagasPublicadas, "vaga publicada", "vagas publicadas")},{" "}
        {plural(indicadores.decisoesHumanas, "decisão humana", "decisões humanas")} e{" "}
        {plural(indicadores.aceites, "aceite", "aceites")}.{" "}
        <a
          href={linkNoRepositorio("docs/resultados/metricas-fluxo.md")}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-semibold text-tinta underline underline-offset-4 hover:no-underline"
        >
          Ver a fonte dos tempos
          <span className="sr-only"> (abre o GitHub em outra aba)</span>
          <ExternalLink aria-hidden="true" className="size-4" />
        </a>
      </p>
    </section>
  );
}

export function PainelIndicadoresCarregando() {
  return (
    <div role="status" className="superficie p-4">
      <span className="sr-only">Carregando os indicadores…</span>
      <Skeleton className="h-6 w-64" />
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    </div>
  );
}
