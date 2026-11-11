"use client";

import * as React from "react";
import { RotateCcw } from "lucide-react";
import { SeloDecisaoHumana } from "@/components/dominio/selo-decisao-humana";
import { SuperficieVoz } from "@/components/dominio/superficie-voz";
import { VozTag } from "@/components/dominio/voz-tag";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HERO_DEMO } from "@/lib/copy/landing";
import { cn } from "@/lib/utils";

type Etapa = "digitando" | "campos" | "sugestoes";

function assinarMovimentoReduzido(aviso: () => void): () => void {
  const consulta = window.matchMedia("(prefers-reduced-motion: reduce)");
  consulta.addEventListener("change", aviso);
  return () => consulta.removeEventListener("change", aviso);
}

/** `true` para quem pede menos movimento: a demonstração então aparece já no estado final. */
function usePrefereMenosMovimento(): boolean {
  return React.useSyncExternalStore(
    assinarMovimentoReduzido,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

/**
 * A interface em miniatura, viva. Um texto de vaga é digitado, o sistema mostra os campos que
 * leu (por regras: cinza), o modelo sugere uma ordem (fundo da IA) e, quando a pessoa clica em
 * "Aprovar e oferecer", o bloco passa ao verde e o selo assenta. Os nomes, os motivos e o texto são
 * a saída real da PoC, com dados sintéticos.
 *
 * É compacta de propósito: o botão de decisão precisa aparecer sem rolar a página. O espaço de
 * cada etapa fica reservado desde o início, para a página não pular.
 */
export function HeroDemo() {
  const reduzido = usePrefereMenosMovimento();
  const [ciclo, setCiclo] = React.useState(0);
  const [etapa, setEtapa] = React.useState<Etapa>("digitando");
  const [digitados, setDigitados] = React.useState(0);
  const [aprovado, setAprovado] = React.useState(false);
  const repetirRef = React.useRef<HTMLButtonElement>(null);
  const total = HERO_DEMO.texto.length;

  React.useEffect(() => {
    if (reduzido) return;
    const temporizadores: number[] = [];
    let n = 0;
    const digitar = window.setInterval(() => {
      n = Math.min(n + 2, total);
      setDigitados(n);
      if (n >= total) {
        window.clearInterval(digitar);
        temporizadores.push(window.setTimeout(() => setEtapa("campos"), 250));
        temporizadores.push(window.setTimeout(() => setEtapa("sugestoes"), 1100));
      }
    }, 24);
    return () => {
      window.clearInterval(digitar);
      temporizadores.forEach((id) => window.clearTimeout(id));
    };
  }, [reduzido, ciclo, total]);

  const etapaAtual: Etapa = reduzido ? "sugestoes" : etapa;
  const textoVisivel = reduzido ? HERO_DEMO.texto : HERO_DEMO.texto.slice(0, digitados);
  const mostraCampos = etapaAtual !== "digitando";
  const mostraSugestoes = etapaAtual === "sugestoes";

  function aprovar() {
    setAprovado(true);
    // O botão sai de cena; o foco vai para o próximo controle lógico.
    window.setTimeout(() => repetirRef.current?.focus(), 0);
  }

  function repetir() {
    setAprovado(false);
    setDigitados(0);
    setEtapa("digitando");
    setCiclo((c) => c + 1);
  }

  return (
    <section
      aria-label="Exemplo da simulação: a leitura de uma vaga e a ordem sugerida"
      className="rounded-dialogo border border-[rgb(255_255_255/0.7)] bg-papel/[0.88] p-4 shadow-flutuante backdrop-blur-2xl sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-titulo text-xl font-semibold">Nova vaga</h2>
        <Badge tone="neutro">Exemplo da simulação</Badge>
      </div>

      <div className="mt-3">
        <p className="text-sm font-semibold text-tinta-suave">Pedido em texto livre</p>
        <div className="mt-1 min-h-[6.25rem] rounded-campo border border-campo bg-gaze p-3 text-base sm:min-h-[4.75rem]">
          <span className="sr-only">{HERO_DEMO.texto}</span>
          <span aria-hidden="true">
            {textoVisivel}
            {etapaAtual === "digitando" ? (
              <span className="ml-px inline-block h-5 w-0.5 translate-y-1 bg-tinta" />
            ) : null}
          </span>
        </div>
      </div>

      <div
        className="mt-4 min-h-[19.5rem] sm:min-h-[10rem]"
        aria-hidden={!mostraCampos}
        data-testid="hero-campos"
      >
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-sm font-semibold text-tinta-suave">
            Campos lidos. Você confere antes de seguir.
          </p>
          <VozTag voz="regra">Leitura por regras</VozTag>
        </div>
        <p className="mt-1 text-sm text-tinta-suave">{HERO_DEMO.razaoLeitura}</p>
        <ul role="list" className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {HERO_DEMO.campos.map((campo, indice) => (
            <SuperficieVoz
              as="li"
              key={campo.rotulo}
              voz="regra"
              data-visivel={mostraCampos}
              style={{ "--i": indice } as React.CSSProperties}
              className={cn(
                "etapa-demo px-2.5 py-2",
                indice === HERO_DEMO.campos.length - 1 && "col-span-2 sm:col-span-1",
              )}
            >
              <span className="block text-xs text-tinta-suave">{campo.rotulo}</span>
              <span className="block text-sm font-semibold">{campo.valor}</span>
              <span className="block text-xs text-tinta-suave">{campo.origem}</span>
            </SuperficieVoz>
          ))}
        </ul>
      </div>

      <div className="mt-3" aria-hidden={!mostraSugestoes} data-testid="hero-sugestoes">
        <div className="min-h-[6.5rem] sm:min-h-[4.5rem]">
          <p className="text-base font-semibold">{HERO_DEMO.resumo}</p>
          <p className="mt-1 text-sm text-tinta-suave">{HERO_DEMO.notaChances}</p>
        </div>
        <ol role="list" className="mt-2 grid gap-3">
          {HERO_DEMO.sugestoes.map((sugestao, indice) => {
            const decidido = aprovado && indice === 0;
            return (
              <SuperficieVoz
                as="li"
                key={sugestao.crm}
                voz={decidido ? "humano" : "ia"}
                data-visivel={mostraSugestoes}
                style={{ "--i": indice } as React.CSSProperties}
                className="etapa-demo p-3 sm:p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-baseline gap-3">
                    <span
                      className="tnum font-titulo text-2xl leading-none font-semibold"
                      aria-hidden="true"
                    >
                      {sugestao.posicao}
                    </span>
                    <div>
                      <p className="font-semibold">{sugestao.nome}</p>
                      <p className="text-sm text-tinta-suave">{sugestao.crm}</p>
                    </div>
                  </div>
                  <VozTag voz={decidido ? "humano" : "ia"} />
                </div>
                <p className="mt-2 text-base">{sugestao.motivo}</p>
                <p className="mt-1 text-sm text-tinta-suave">
                  Texto montado pelo sistema a partir dos fatores do modelo.
                </p>
                {indice === 0 ? (
                  decidido ? (
                    <div className="mt-3 grid gap-2">
                      <SeloDecisaoHumana nome="você" cargo="coordenação" hora="9h12" anunciar={false} />
                      <p className="text-sm text-tinta-suave">{HERO_DEMO.depoisDeAprovar}</p>
                    </div>
                  ) : (
                    <div className="mt-3">
                      <Button variant="decision" onClick={aprovar} disabled={!mostraSugestoes}>
                        Aprovar e oferecer
                      </Button>
                    </div>
                  )
                ) : null}
              </SuperficieVoz>
            );
          })}
        </ol>
      </div>

      {/* Sempre montada e vazia até a decisão: é o que garante que o leitor de tela a anuncie. */}
      <div role="status" className="sr-only">
        {aprovado ? `Decidido por você, coordenação, 9h12. ${HERO_DEMO.depoisDeAprovar}` : ""}
      </div>

      <div className="mt-3 flex justify-end">
        <Button ref={repetirRef} variant="ghost" size="sm" onClick={repetir}>
          <RotateCcw aria-hidden="true" className="size-4" />
          Ver de novo
        </Button>
      </div>

      <noscript>
        <p className="mt-3 text-sm text-tinta-suave">
          Ative o JavaScript para ver a demonstração, ou entre na plataforma para ver a ordem
          sugerida.
        </p>
      </noscript>
    </section>
  );
}
