"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Candidato } from "@/lib/api/types";
import { ORDEM } from "@/lib/copy/coordenador";
import { ROTULO_ESPECIALIDADE } from "@/lib/copy/rotulos";
import { faixaDeChance, ROTULO_FAIXA_DE_CHANCE } from "@/lib/format/sugestoes";
import { cn } from "@/lib/utils";
import { AlertaJornada } from "./alerta-jornada";
import { SimboloPlantao } from "./marca-plantao";

/** Em que pé este nome está: esperando a decisão, pulado, aprovado ou fora da oferta. */
export type EstadoDaSugestao =
  | { tipo: "decidindo"; selecionado: boolean }
  | { tipo: "pulado"; podeDesfazer: boolean }
  | { tipo: "aprovado"; lugar: number; totalAprovados: number }
  | { tipo: "fora" };

/**
 * Um item da ordem sugerida: posição, nome fictício, uma frase de motivo com a origem rotulada,
 * a faixa de chance (o número só em "Ver motivos") e os alertas de regra. O motivo é o texto do
 * backend: a interface não reescreve fatos. Nenhuma marcação vem pronta: incluir um nome na oferta
 * é sempre um gesto da pessoa.
 */
export function SugestaoCard({
  candidato,
  estado,
  aoMarcar,
  aoPular,
  aoDesfazer,
  ocupado = false,
  motivos,
}: {
  candidato: Candidato;
  estado: EstadoDaSugestao;
  aoMarcar?: (marcado: boolean) => void;
  aoPular?: () => void;
  aoDesfazer?: () => void;
  ocupado?: boolean;
  /** O painel de "Ver motivos". Quem chama decide o que mostrar. */
  motivos?: React.ReactNode;
}) {
  const [aberto, setAberto] = React.useState(false);
  const idBase = `sugestao-${candidato.posicao}`;
  const nomeId = `${idBase}-nome`;
  const motivosId = `${idBase}-motivos`;
  const { medico, explicacao, alertas } = candidato;
  const faixa = faixaDeChance(candidato.score);

  // O botão que a pessoa apertou some quando o nome é pulado: o foco vai para o que tomou o lugar
  // dele, sem cair no início da página. Só depois de um gesto dela, nunca ao abrir a tela.
  const pularRef = React.useRef<HTMLButtonElement>(null);
  const desfazerRef = React.useRef<HTMLButtonElement>(null);
  const moverFoco = React.useRef(false);
  const pulado = estado.tipo === "pulado";
  React.useEffect(() => {
    if (!moverFoco.current) return;
    moverFoco.current = false;
    (pulado ? desfazerRef : pularRef).current?.focus();
  }, [pulado]);

  if (estado.tipo === "pulado") {
    return (
      <li className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3 border-t border-divisor px-4 py-3 md:px-5">
        <span aria-hidden="true" className="tnum font-serif text-xl text-tinta-suave">
          {candidato.posicao}
        </span>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <div>
            <h3 id={nomeId} className="font-semibold text-tinta-suave">
              <span className="sr-only">{candidato.posicao}.</span> {medico.nome}
            </h3>
            <p className="text-sm text-tinta-suave">
              {estado.podeDesfazer ? ORDEM.pulado : ORDEM.puladoDepois}
            </p>
          </div>
          {estado.podeDesfazer ? (
            <Button
              ref={desfazerRef}
              variant="secondary"
              size="sm"
              loading={ocupado}
              aria-describedby={nomeId}
              onClick={() => {
                moverFoco.current = true;
                aoDesfazer?.();
              }}
            >
              {ORDEM.desfazer}
            </Button>
          ) : null}
        </div>
      </li>
    );
  }

  return (
    <li
      data-estado={estado.tipo}
      className={cn(
        "grid grid-cols-1 gap-2 border-t border-divisor px-4 py-4 md:px-5",
        // Quem a pessoa escolheu, ou aprovou, se destaca dos outros nomes.
        ((estado.tipo === "decidindo" && estado.selecionado) || estado.tipo === "aprovado") && "bg-papel",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <div className="flex min-w-0 gap-3">
          <span aria-hidden="true" className="tnum w-8 shrink-0 font-serif text-2xl leading-8 font-semibold">
            {candidato.posicao}
          </span>
          <div className="min-w-0">
            <h3 id={nomeId} className="text-lg leading-8 font-semibold">
              <span className="sr-only">{candidato.posicao}.</span> {medico.nome}
            </h3>
            <p className="text-sm text-tinta-suave">
              {ROTULO_ESPECIALIDADE[medico.especialidade]}, {medico.crm}
            </p>
          </div>
        </div>
        <Etiqueta estado={estado} faixa={ROTULO_FAIXA_DE_CHANCE[faixa]} />
      </div>

      {/* No celular o texto usa a largura toda; do tablet em diante, alinha com o nome. */}
      <div className="grid min-w-0 grid-cols-1 gap-2 sm:pl-11">
        <p>{explicacao.texto}</p>
        <p className="text-sm text-tinta-suave">
          {explicacao.fonte === "llm" ? ORDEM.motivoPelaIA : ORDEM.motivoPorRegra}.
          {candidato.motivoFallback ? ` ${ORDEM.motivoFallback}` : ""}
        </p>
        {candidato.rodizio ? (
          <p className="text-sm text-tinta-suave">
            {ORDEM.rodizio(candidato.rodizio.posicaoDoModelo, candidato.rodizio.indicacoesNaSemana)}
          </p>
        ) : null}

        <AlertaJornada alertas={alertas} exigeJustificativa={estado.tipo === "decidindo"} />

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {estado.tipo === "decidindo" ? (
            <label className="mr-2 inline-flex min-h-[var(--alvo-min)] w-full cursor-pointer items-center gap-2 font-semibold sm:w-auto">
              <input
                type="checkbox"
                checked={estado.selecionado}
                aria-describedby={nomeId}
                onChange={(evento) => aoMarcar?.(evento.target.checked)}
                className="size-5 cursor-pointer accent-humano"
              />
              {ORDEM.incluir}
            </label>
          ) : null}
          {motivos ? (
            <Button
              variant="ghost"
              size="sm"
              // O rótulo alinha com o texto de cima; ao lado da caixa, o recuo não faz falta.
              className={cn("-ml-3", estado.tipo === "decidindo" && "sm:ml-0")}
              aria-expanded={aberto}
              aria-controls={motivosId}
              aria-describedby={nomeId}
              onClick={() => setAberto((valor) => !valor)}
            >
              {aberto ? ORDEM.esconderMotivos : ORDEM.verMotivos}
            </Button>
          ) : null}
          {estado.tipo === "decidindo" ? (
            <Button
              ref={pularRef}
              variant="ghost"
              size="sm"
              loading={ocupado}
              aria-describedby={nomeId}
              onClick={() => {
                moverFoco.current = true;
                aoPular?.();
              }}
            >
              {ORDEM.pular}
            </Button>
          ) : null}
        </div>

        <div id={motivosId} hidden={!aberto}>
          {aberto ? motivos : null}
        </div>
      </div>
    </li>
  );
}

function Etiqueta({
  estado,
  faixa,
}: {
  estado: Exclude<EstadoDaSugestao, { tipo: "pulado" }>;
  faixa: string;
}) {
  if (estado.tipo === "aprovado") {
    return (
      <Badge tone="humano">
        <SimboloPlantao variante="fechado" className="size-4" />
        {estado.totalAprovados > 1 ? ORDEM.aprovadoNaOrdem(estado.lugar) : ORDEM.aprovado}
      </Badge>
    );
  }
  if (estado.tipo === "fora") return <Badge tone="neutro">{ORDEM.naoRecebe}</Badge>;
  return <Badge tone="ia">{faixa}</Badge>;
}
