"use client";

import { ExternalLink, FlaskConical, Layers, Scale, Users } from "lucide-react";
import { AnelDeTracos } from "@/components/ui/anel-de-tracos";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CabecalhoDePagina } from "@/components/ui/cabecalho-de-pagina";
import { CabecalhoDoPainel, Painel } from "@/components/ui/painel";
import { Skeleton } from "@/components/ui/skeleton";
import { useContagemOfertas } from "@/lib/api/hooks";
import { linkNoRepositorio } from "@/lib/copy/comum";
import { CALIBRADO, CONCENTRACAO, DISPARIDADE, FONTES } from "@/lib/copy/equidade";
import { formatarInteiro, formatarNumero, formatarPercentual } from "@/lib/format/datas";
import { cn } from "@/lib/utils";

const pct = (fracao: number) => `${formatarNumero(fracao * 100, 1)}%`;

/** Uma barra horizontal com o valor em texto ao lado; o desenho é só reforço. */
function Barra({
  rotulo,
  valor,
  maximo = 1,
  texto,
  destaque = false,
}: {
  rotulo: string;
  valor: number;
  maximo?: number;
  texto: string;
  destaque?: boolean;
}) {
  return (
    <div className="grid gap-1 sm:grid-cols-[11rem_minmax(0,1fr)_4.5rem] sm:items-center sm:gap-3">
      <span className="text-sm font-medium">{rotulo}</span>
      <div aria-hidden="true" className="h-3 overflow-hidden rounded-full bg-grafico-trilho">
        <div
          className={cn("h-full rounded-full", destaque ? "bg-acento" : "bg-grafico-azul")}
          style={{ width: `${Math.min(100, (valor / maximo) * 100)}%` }}
        />
      </div>
      <span className="tnum text-sm font-semibold sm:text-right">{texto}</span>
    </div>
  );
}

function Fonte({ caminho, texto }: { caminho: string; texto: string }) {
  return (
    <a
      href={linkNoRepositorio(caminho)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-[var(--alvo-min)] items-center gap-1 text-sm font-semibold text-acento underline underline-offset-4 hover:no-underline"
    >
      {texto}
      <span className="sr-only"> (abre o GitHub em outra aba)</span>
      <ExternalLink aria-hidden="true" className="size-4" />
    </a>
  );
}

function Concentracao() {
  const c = CONCENTRACAO;
  return (
    <Painel aria-labelledby="concentracao-titulo" className="grid gap-4 lg:col-span-2">
      <CabecalhoDoPainel
        icone={Layers}
        tom="acao"
        id="concentracao-titulo"
        titulo="Concentração das ofertas"
        acessorio={<Badge tone="neutro">Simulação</Badge>}
      />
      <p className="max-w-[70ch] text-tinta-suave">
        Que parcela das ofertas vai para os 10% de médicos mais expostos, em {formatarInteiro(c.vagasDeTeste)} vagas de
        teste. A ordem só pelo modelo concentrava; o rodízio entre equivalentes, em uso na API, reparte entre quem tem
        chance parecida.
      </p>
      <div className="grid gap-3">
        <Barra rotulo="Só a ordem do modelo" valor={c.ofertasDosMaisExpostos.soModelo} texto={pct(c.ofertasDosMaisExpostos.soModelo)} />
        <Barra
          rotulo="Com o rodízio (em uso)"
          valor={c.ofertasDosMaisExpostos.comRodizio}
          texto={pct(c.ofertasDosMaisExpostos.comRodizio)}
          destaque
        />
        <Barra rotulo="Processo manual" valor={c.ofertasDosMaisExpostos.manual} texto={pct(c.ofertasDosMaisExpostos.manual)} />
      </div>
      <dl className="grid gap-3 sm:grid-cols-3">
        {[
          { rotulo: "Lugares do top-5 com os mais expostos", de: c.top5DosMaisExpostos.soModelo, para: c.top5DosMaisExpostos.comRodizio },
          { rotulo: "Elegíveis que nunca aparecem", de: c.nuncaAparecem.soModelo, para: c.nuncaAparecem.comRodizio },
          { rotulo: "Chance de sucesso do top-5 (o custo)", de: c.chanceTop5.soModelo, para: c.chanceTop5.comRodizio },
        ].map((m) => (
          <div key={m.rotulo} className="rounded-campo border border-painel-borda bg-papel/70 p-3">
            <dt className="text-sm text-tinta-suave">{m.rotulo}</dt>
            <dd className="mt-1 flex flex-wrap items-baseline gap-x-2">
              <span className="numero-destaque text-3xl">{pct(m.para)}</span>
              <span className="text-sm text-tinta-suave">antes {pct(m.de)}</span>
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-sm text-tinta-suave">
        Meta da Entrega 3 (C5): {formatarPercentual(c.metaC5)} ou menos das ofertas com os 10% mais ofertados. O rodízio fica perto dela,
        numa estimativa superior. O tempo médio vai de {c.tempoMedioMin.soModelo} para {c.tempoMedioMin.comRodizio} min,
        ainda bem abaixo dos {c.tempoMedioMin.manual} min do manual. Política: rodízio entre equivalentes, margem de 10
        pontos, janela de 7 dias.
      </p>
      <div className="flex flex-wrap gap-x-6">
        <Fonte caminho={FONTES.concentracao} texto="Ver o experimento" />
        <Fonte caminho={FONTES.rodizio} texto="Ver a decisão do rodízio" />
      </div>
    </Painel>
  );
}

function NoSistema() {
  const contagem = useContagemOfertas();
  const dados = contagem.data;
  return (
    <Painel aria-labelledby="sistema-titulo" className="grid content-start gap-3">
      <CabecalhoDoPainel
        icone={Users}
        tom="humano"
        id="sistema-titulo"
        titulo="Ofertas feitas neste sistema"
        acessorio={<Badge tone="humano">Contagem</Badge>}
      />
      {contagem.isError ? (
        <Alert tone="erro" title="Não foi possível contar as ofertas">
          Tente de novo em instantes.
        </Alert>
      ) : !dados ? (
        <Skeleton className="h-48 rounded-cartao" />
      ) : dados.total === 0 ? (
        <p className="text-tinta-suave">Nenhuma oferta saiu ainda. A contagem aparece depois da primeira aprovação.</p>
      ) : (
        <>
          <div className="grid place-items-center py-1">
            <AnelDeTracos proporcao={dados.parcelaDoTopo ?? 0} tamanho={176} cor="humano">
              <p className="numero-destaque text-4xl leading-none">{formatarPercentual(dados.parcelaDoTopo ?? 0)}</p>
              <p className="mt-1 max-w-[9rem] text-xs text-tinta-suave">das ofertas foram para os 10% mais ofertados</p>
            </AnelDeTracos>
          </div>
          <p className="text-sm">
            {formatarInteiro(dados.total)} {dados.total === 1 ? "oferta" : "ofertas"} para {formatarInteiro(dados.medicos)}{" "}
            {dados.medicos === 1 ? "médico" : "médicos"}.{" "}
            {dados.medicosNoTopo === 1
              ? `O mais ofertado recebeu ${formatarPercentual(dados.parcelaDoTopo ?? 0)} delas (${formatarInteiro(dados.maximoPorMedico)}).`
              : `Os ${formatarInteiro(dados.medicosNoTopo)} mais ofertados receberam ${formatarPercentual(dados.parcelaDoTopo ?? 0)}; o que mais recebeu, ${formatarInteiro(dados.maximoPorMedico)}.`}
          </p>
          {dados.total < 30 ? (
            <p className="text-sm text-tinta-suave">Com poucas ofertas, esta parcela ainda diz pouco.</p>
          ) : null}
        </>
      )}
      <p className="text-xs text-tinta-suave">
        É a contagem do que aconteceu neste sistema, com os dados sintéticos da demonstração. Não é simulação nem dado real.
      </p>
    </Painel>
  );
}

function Disparidade() {
  const atributos = [...new Set(DISPARIDADE.map((d) => d.atributo))];
  return (
    <Painel aria-labelledby="disparidade-titulo" className="grid gap-4 lg:col-span-2">
      <CabecalhoDoPainel
        icone={Scale}
        tom="ia"
        id="disparidade-titulo"
        titulo="Disparidade por grupo"
        acessorio={<Badge tone="neutro">Simulação</Badge>}
      />
      <p className="max-w-[70ch] text-tinta-suave">
        Participação de cada grupo no top-5 dividida pela participação dele entre os elegíveis: 1,00 é proporcional. Gênero,
        idade e zona <strong className="font-semibold text-tinta">não entram</strong> na ordem sugerida; ficam guardados só
        para esta auditoria.
      </p>
      {/* Focável: no celular a tabela rola para os lados, e o teclado também precisa rolar. */}
      <div
        role="region"
        aria-label="Tabela da disparidade por grupo"
        tabIndex={0}
        className="overflow-x-auto rounded-campo"
      >
        <table className="w-full min-w-[30rem] text-left text-sm">
          <caption className="sr-only">Razão entre a participação no top-5 e entre os elegíveis, por grupo</caption>
          <thead className="text-tinta-suave">
            <tr className="border-b border-divisor">
              <th scope="col" className="py-2 pr-3 font-medium">Grupo</th>
              <th scope="col" className="py-2 pr-3 font-medium">Elegíveis</th>
              <th scope="col" className="py-2 pr-3 font-medium">Razão com o modelo</th>
              <th scope="col" className="py-2 font-medium">Razão sem o modelo</th>
            </tr>
          </thead>
          {atributos.map((atributo) => (
            <tbody key={atributo}>
              <tr>
                <th scope="rowgroup" colSpan={4} className="pt-3 pb-1 text-xs font-semibold text-tinta-suave">
                  {atributo}
                </th>
              </tr>
              {DISPARIDADE.filter((d) => d.atributo === atributo).map((d) => {
                const longe = d.razaoModelo < 0.5 || d.razaoModelo > 1.5;
                return (
                  <tr key={d.grupo} className="border-b border-divisor/60 last:border-0">
                    <th scope="row" className="py-2 pr-3 font-medium">{d.grupo}</th>
                    <td className="tnum py-2 pr-3">{pct(d.elegiveis)}</td>
                    <td className="py-2 pr-3">
                      <span className="flex items-center gap-2">
                        <span aria-hidden="true" className="relative h-2.5 w-24 shrink-0 rounded-full bg-grafico-trilho">
                          <span className="absolute inset-y-0 left-1/2 w-px bg-tinta-suave" />
                          <span
                            className={cn("absolute inset-y-0 left-0 rounded-full", longe ? "bg-atencao" : "bg-grafico-azul")}
                            style={{ width: `${Math.min(100, (d.razaoModelo / 2) * 100)}%` }}
                          />
                        </span>
                        <span className={cn("tnum font-semibold", longe && "text-atencao")}>
                          {formatarNumero(d.razaoModelo, 2)}
                        </span>
                      </span>
                    </td>
                    <td className="tnum py-2">{formatarNumero(d.razaoBaseline, 2)}</td>
                  </tr>
                );
              })}
            </tbody>
          ))}
        </table>
      </div>
      <Alert tone="atencao" title="O risco que fica: a zona">
        A distância funciona como indicador da zona de residência: quem mora no leste ou no oeste quase nunca é sugerido. É
        um critério operacional (a chance de aceite cai com a distância), mas excluir zonas inteiras é um viés a
        acompanhar, com a revisão humana da lista. O rodízio não resolve isso.
      </Alert>
      <Fonte caminho={FONTES.ranking} texto="Ver as medidas por grupo" />
    </Painel>
  );
}

function Calibrado() {
  return (
    <Painel aria-labelledby="calibrado-titulo" className="grid content-start gap-3">
      <CabecalhoDoPainel
        icone={FlaskConical}
        tom="atencao"
        id="calibrado-titulo"
        titulo="Com dados públicos"
        acessorio={<Badge tone="neutro">Simulação</Badge>}
      />
      <p className="text-sm text-tinta-suave">
        A base sintética ao lado do cenário calibrado com a {CALIBRADO.fonte}.
      </p>
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Base sintética contra o cenário calibrado</caption>
        <thead className="text-tinta-suave">
          <tr className="border-b border-divisor">
            <th scope="col" className="py-2 pr-2 font-medium">Medida</th>
            <th scope="col" className="py-2 pr-2 text-right font-medium">Base</th>
            <th scope="col" className="py-2 text-right font-medium">Calibrado</th>
          </tr>
        </thead>
        <tbody>
          {CALIBRADO.linhas.map((l) => (
            <tr key={l.medida} className="border-b border-divisor/60 last:border-0">
              <th scope="row" className="py-2 pr-2 font-normal">{l.medida}</th>
              <td className="tnum py-2 pr-2 text-right">{l.base}</td>
              <td className="tnum py-2 text-right font-semibold">{l.calibrado}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3 className="mt-1 text-sm font-semibold">Onde a base sintética erra</h3>
      <ul className="grid gap-1 text-sm">
        {CALIBRADO.publicos.map((p) => (
          <li key={p.dado}>
            {p.dado}: <span className="tnum">{p.amostra}</span> na base, <span className="tnum font-semibold">{p.estudo}</span>{" "}
            no estudo.
          </li>
        ))}
      </ul>
      <p className="text-sm text-tinta-suave">
        Gênero e idade não entram na ordem, então corrigir a composição quase não muda o resultado; esses erros pesam na
        auditoria de equidade.
      </p>
      <Fonte caminho={FONTES.robustez} texto="Ver o teste de premissas" />
    </Painel>
  );
}

/**
 * A equidade (6.3): a concentração das ofertas e a disparidade por grupo, medidas em dados
 * sintéticos e rotuladas; ao lado, a contagem das ofertas feitas no sistema (D9) e o cenário
 * calibrado com dados públicos (D11).
 */
export function TelaDeEquidade() {
  return (
    <div className="grid grid-cols-1 gap-4">
      <CabecalhoDePagina
        titulo="Equidade"
        descricao="Quem recebe as ofertas: a concentração entre poucos médicos e a diferença entre grupos. Medidas em dados sintéticos; a contagem do sistema vem ao lado."
        acoes={
          <Badge tone="atencao">
            <FlaskConical aria-hidden="true" />
            Medidas em dados sintéticos
          </Badge>
        }
      />
      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-3">
        <Concentracao />
        <NoSistema />
        <Disparidade />
        <Calibrado />
      </div>
    </div>
  );
}
