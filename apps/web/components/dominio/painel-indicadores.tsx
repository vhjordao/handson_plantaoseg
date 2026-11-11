import { CalendarCheck2, ExternalLink, Timer, TrendingDown, TrendingUp, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BarrasComparadas, ReguaDeProgresso, type CorDoGrafico } from "@/components/ui/minigrafico";
import { IconeEmCirculo, type TomDoIcone } from "@/components/ui/painel";
import { Skeleton } from "@/components/ui/skeleton";
import type { Indicadores } from "@/lib/api/types";
import { linkNoRepositorio } from "@/lib/copy/comum";
import { comUnidade, formatarNumero, plural } from "@/lib/format/datas";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

/**
 * Um indicador no formato dos cartões pequenos do modelo visual: título e ícone em cima, a
 * variação contra o processo manual, o número grande e leve e um minigráfico com os mesmos
 * números. O rótulo "simulado" fica colado ao número, não só no cabeçalho.
 */
function Indicador({
  titulo,
  icone,
  tom,
  valor,
  complemento,
  variacao,
  grafico,
  simulado = true,
  className,
}: {
  titulo: string;
  icone: LucideIcon;
  tom: TomDoIcone;
  valor: string;
  complemento: string;
  variacao?: { texto: string; melhor: boolean; sobe: boolean } | null;
  grafico?: React.ReactNode;
  simulado?: boolean;
  className?: string;
}) {
  const Seta = variacao?.sobe ? TrendingUp : TrendingDown;
  return (
    <li className={cn("superficie flex min-w-0 flex-col gap-2 p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-medium text-tinta">{titulo}</h3>
        <IconeEmCirculo icone={icone} tom={tom} tamanho="sm" />
      </div>
      {variacao ? (
        <p
          className={cn(
            "inline-flex items-center gap-1 text-sm font-semibold",
            variacao.melhor ? "text-humano" : "text-atencao",
          )}
        >
          <Seta aria-hidden="true" className="size-4" />
          {variacao.texto}
        </p>
      ) : null}
      <div className="mt-auto flex flex-wrap items-end justify-between gap-3">
        <p className="numero-destaque flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-1 text-[2.5rem] leading-none text-tinta">
          {valor}
          {simulado ? (
            <span className="text-xs font-normal tracking-normal text-tinta-suave">
              simulado
            </span>
          ) : null}
        </p>
        {grafico ? <div className="w-28 max-w-full">{grafico}</div> : null}
      </div>
      <p className="text-sm text-tinta-suave">{complemento}</p>
    </li>
  );
}

function variacaoPercentual(atual: number, base: number, menorEMelhor: boolean) {
  if (!base) return null;
  const pct = ((atual - base) / base) * 100;
  const sobe = pct > 0;
  const melhor = menorEMelhor ? !sobe : sobe;
  return {
    texto: `${formatarNumero(Math.abs(pct), 0)}% ${sobe ? "a mais" : "a menos"} que o manual`,
    melhor,
    sobe,
  };
}

function barras(manual: number, modelo: number, cor: CorDoGrafico) {
  return (
    <BarrasComparadas
      cor={cor}
      barras={[
        { rotulo: "Processo manual simulado", valor: manual },
        { rotulo: "Regras e modelo", valor: modelo, destaque: true },
      ]}
    />
  );
}

/**
 * Os indicadores da demonstração, sempre rotulados "simulado". O percentual de sugestões
 * aceitas só existe com usuários: antes disso aparece o travessão e o motivo, nunca um número.
 */
export function PainelIndicadores({ indicadores }: { indicadores: Indicadores }) {
  const base = indicadores.linhaDeBase;
  const aceitas = indicadores.pctSugestoesAceitas;
  return (
    <section aria-labelledby="indicadores-titulo" className="grid gap-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <h2 id="indicadores-titulo" className="font-titulo text-base font-semibold">
          Indicadores da demonstração
        </h2>
        <Badge tone="neutro">Simulado</Badge>
      </div>
      <ul role="list" className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-1">
        <Indicador
          titulo="Tempo médio até preencher"
          icone={Timer}
          tom="acao"
          valor={comUnidade(indicadores.tempoMedioAtePreencherMin, "min", 0)}
          variacao={base ? variacaoPercentual(indicadores.tempoMedioAtePreencherMin, base.tempoMedioAtePreencherMin, true) : null}
          grafico={base ? barras(base.tempoMedioAtePreencherMin, indicadores.tempoMedioAtePreencherMin, "azul") : null}
          complemento={
            base
              ? `Regras e modelo, contra ${comUnidade(base.tempoMedioAtePreencherMin, "min", 0)} no processo manual simulado.`
              : "Regras e modelo, em simulação."
          }
        />
        <Indicador
          titulo="Preenchidas com 24 h ou mais de antecedência"
          icone={CalendarCheck2}
          tom="humano"
          valor={`${formatarNumero(indicadores.pctPreenchidasComAntecedencia24h, 1)}%`}
          variacao={
            base
              ? {
                  texto: `${formatarNumero(Math.abs(indicadores.pctPreenchidasComAntecedencia24h - base.pctPreenchidasComAntecedencia24h), 1)} pontos ${indicadores.pctPreenchidasComAntecedencia24h >= base.pctPreenchidasComAntecedencia24h ? "a mais" : "a menos"}`,
                  melhor: indicadores.pctPreenchidasComAntecedencia24h >= base.pctPreenchidasComAntecedencia24h,
                  sobe: indicadores.pctPreenchidasComAntecedencia24h >= base.pctPreenchidasComAntecedencia24h,
                }
              : null
          }
          grafico={base ? barras(base.pctPreenchidasComAntecedencia24h, indicadores.pctPreenchidasComAntecedencia24h, "verde") : null}
          complemento={
            base
              ? `Contra ${formatarNumero(base.pctPreenchidasComAntecedencia24h, 1)}% no processo manual simulado.`
              : "Em simulação."
          }
        />
        <Indicador
          className="sm:col-span-2 xl:col-span-1"
          titulo="Sugestões aceitas pelo coordenador"
          icone={UserCheck}
          tom="ia"
          simulado={aceitas !== null}
          valor={aceitas === null ? "—" : `${formatarNumero(aceitas, 0)}%`}
          grafico={aceitas === null ? null : <ReguaDeProgresso proporcao={aceitas / 100} tracos={24} cor="humano" />}
          complemento={
            aceitas === null
              ? "Só se mede com usuários: aparece quando alguém decidir."
              : "Das sugestões que passaram pela sua decisão nesta sessão."
          }
        />
      </ul>
      <p className="px-1 text-sm text-tinta-suave">
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
    <div role="status" className="grid gap-2.5">
      <span className="sr-only">Carregando os indicadores…</span>
      <Skeleton className="h-6 w-56" />
      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-1">
        <Skeleton className="h-40 rounded-cartao" />
        <Skeleton className="h-40 rounded-cartao" />
        <Skeleton className="h-28 rounded-cartao sm:col-span-2 xl:col-span-1" />
      </div>
    </div>
  );
}
