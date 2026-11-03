import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Indicadores } from "@/lib/api/types";
import { formatarNumero, plural } from "@/lib/format/datas";

function Indicador({
  titulo,
  valor,
  complemento,
}: {
  titulo: string;
  valor: string;
  complemento: string;
}) {
  return (
    <div className="grid gap-1 px-4 py-3">
      <dt className="text-sm text-tinta-suave">{titulo}</dt>
      <dd className="tnum font-serif text-3xl leading-none font-semibold">{valor}</dd>
      <dd className="text-sm text-tinta-suave">{complemento}</dd>
    </div>
  );
}

/**
 * Os indicadores da demonstração, sempre rotulados "simulado". O percentual de sugestões
 * aceitas só existe com usuários: antes disso aparece o travessão e o motivo, nunca um número.
 */
export function PainelIndicadores({ indicadores }: { indicadores: Indicadores }) {
  return (
    <section
      aria-labelledby="indicadores-titulo"
      className="rounded-cartao border border-divisor bg-papel"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-divisor px-4 py-3">
        <h2 id="indicadores-titulo" className="font-serif text-xl font-semibold">
          Indicadores da demonstração
        </h2>
        <Badge tone="neutro">Simulado</Badge>
      </div>
      <dl className="grid divide-y divide-divisor sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <Indicador
          titulo="Tempo médio até preencher a vaga"
          valor={`${formatarNumero(indicadores.tempoMedioAtePreencherMin, 0)} min`}
          complemento={
            indicadores.linhaDeBase
              ? `Regras e modelo, contra ${formatarNumero(indicadores.linhaDeBase.tempoMedioAtePreencherMin, 0)} min no processo manual simulado.`
              : "Regras e modelo, em simulação."
          }
        />
        <Indicador
          titulo="Preenchidas com 24 h ou mais de antecedência"
          valor={`${formatarNumero(indicadores.pctPreenchidasComAntecedencia24h, 1)}%`}
          complemento={
            indicadores.linhaDeBase
              ? `Contra ${formatarNumero(indicadores.linhaDeBase.pctPreenchidasComAntecedencia24h, 1)}% no processo manual simulado.`
              : "Em simulação."
          }
        />
        <Indicador
          titulo="Sugestões aceitas pelo coordenador"
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
        {plural(indicadores.aceites, "aceite", "aceites")}. Fonte dos tempos: {indicadores.fonte}.
      </p>
    </section>
  );
}

export function PainelIndicadoresCarregando() {
  return (
    <div role="status" className="rounded-cartao border border-divisor bg-papel p-4">
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
