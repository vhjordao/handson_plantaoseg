"use client";

import * as React from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Field, Textarea } from "@/components/ui/field";
import { LIMITE_TEXTO_LIVRE, type Candidato, type Politica, type Vaga } from "@/lib/api/types";
import { AVISO_DADOS_REAIS } from "@/lib/copy/comum";
import { ALERTA_JORNADA, DIALOGO_DE_DECISAO } from "@/lib/copy/coordenador";
import { ROTULO_ESPECIALIDADE } from "@/lib/copy/rotulos";
import { descreverVaga } from "./etiquetas-da-vaga";

const CAMPO_JUSTIFICATIVA = "justificativa-da-excecao";

/**
 * "Aprovar e oferecer": a pessoa confere a vaga, quem recebe a oferta e o que acontece depois, no
 * padrão "conferir respostas". Quem tem alerta de jornada exige justificativa escrita. O botão de
 * confirmar nunca recebe o foco ao abrir: quem aperta Enter sem ler não aprova ninguém.
 */
export function DialogoDeDecisao({
  aberto,
  vaga,
  selecionados,
  politica,
  justificativa,
  aoMudarJustificativa,
  erroDaJustificativa,
  erroGeral,
  enviando,
  aoConfirmar,
  aoAlterar,
  aoFechar,
  aoFecharFoco,
  simulacao,
}: {
  aberto: boolean;
  vaga: Vaga;
  selecionados: readonly Candidato[];
  politica: Politica | undefined;
  justificativa: string;
  aoMudarJustificativa: (texto: string) => void;
  erroDaJustificativa: string | null;
  erroGeral: string | null;
  enviando: boolean;
  aoConfirmar: () => void;
  aoAlterar: () => void;
  aoFechar: () => void;
  /** Quem chama decide para onde vai o foco: o diálogo não tem gatilho próprio. */
  aoFecharFoco: (evento: Event) => void;
  simulacao: boolean;
}) {
  const tituloRef = React.useRef<HTMLHeadingElement>(null);
  React.useEffect(() => {
    if (erroDaJustificativa) document.getElementById(CAMPO_JUSTIFICATIVA)?.focus();
  }, [erroDaJustificativa]);
  const alertas = [...new Set(selecionados.flatMap((c) => c.alertas))];
  const [primeiro] = selecionados;
  const ttl = politica?.ttlOfertaMin;

  return (
    <Dialog open={aberto} onOpenChange={(abrir) => (abrir ? undefined : aoFechar())}>
      <DialogContent
        className="md:max-w-xl"
        onOpenAutoFocus={(evento) => {
          evento.preventDefault();
          tituloRef.current?.focus();
        }}
        onCloseAutoFocus={aoFecharFoco}
      >
        <DialogTitle ref={tituloRef} tabIndex={-1} className="outline-none">
          {DIALOGO_DE_DECISAO.titulo}
        </DialogTitle>
        <DialogDescription>{DIALOGO_DE_DECISAO.descricao}</DialogDescription>

        <div className="mt-4 grid gap-4">
          {erroGeral ? <Alert tone="erro">{erroGeral}</Alert> : null}

          <section aria-labelledby="decisao-vaga" className="grid gap-1 border-t border-divisor pt-3">
            <h3 id="decisao-vaga" className="font-semibold">
              {DIALOGO_DE_DECISAO.vaga}
            </h3>
            <p>
              {vaga.especialidade ? `${ROTULO_ESPECIALIDADE[vaga.especialidade]}, ` : ""}
              {descreverVaga(vaga)}
            </p>
          </section>

          <section aria-labelledby="decisao-quem" className="grid gap-1 border-t border-divisor pt-3">
            <div className="flex items-center justify-between gap-3">
              <h3 id="decisao-quem" className="font-semibold">
                {DIALOGO_DE_DECISAO.quemRecebe}
              </h3>
              <Button variant="link" className="min-h-[var(--alvo-min)] px-0" aria-describedby="decisao-quem" onClick={aoAlterar}>
                {DIALOGO_DE_DECISAO.alterar}
              </Button>
            </div>
            <ol className="list-decimal pl-5">
              {selecionados.map((candidato) => (
                <li key={candidato.medico.id}>{candidato.medico.nome}</li>
              ))}
            </ol>
          </section>

          {alertas.length > 0 ? (
            <section className="border-t border-divisor pt-3">
              <Field
                id={CAMPO_JUSTIFICATIVA}
                label={DIALOGO_DE_DECISAO.justificativa}
                hint={
                  <>
                    <span className="font-medium text-atencao">
                      {ALERTA_JORNADA.titulo}: {alertas.join("; ")}.
                    </span>{" "}
                    {DIALOGO_DE_DECISAO.ajudaJustificativa} {AVISO_DADOS_REAIS}
                  </>
                }
                error={erroDaJustificativa}
              >
                {(aria) => (
                  <Textarea
                    {...aria}
                    className="min-h-20"
                    maxLength={LIMITE_TEXTO_LIVRE}
                    value={justificativa}
                    onChange={(evento) => aoMudarJustificativa(evento.target.value)}
                  />
                )}
              </Field>
            </section>
          ) : null}

          <section aria-labelledby="decisao-depois" className="grid gap-1 border-t border-divisor pt-3">
            <h3 id="decisao-depois" className="font-semibold">
              {DIALOGO_DE_DECISAO.depois}
            </h3>
            {primeiro && ttl !== undefined ? (
              <p>
                {selecionados.length > 1
                  ? DIALOGO_DE_DECISAO.variosNomes(primeiro.medico.nome, ttl)
                  : DIALOGO_DE_DECISAO.umNome(primeiro.medico.nome, ttl)}
              </p>
            ) : null}
            <p>{DIALOGO_DE_DECISAO.trilha}</p>
            {simulacao ? <p className="text-sm text-tinta-suave">{DIALOGO_DE_DECISAO.simulacao}</p> : null}
          </section>

          <div className="flex flex-wrap gap-2 border-t border-divisor pt-4">
            <Button variant="decision" loading={enviando} onClick={aoConfirmar}>
              {DIALOGO_DE_DECISAO.confirmar}
            </Button>
            <Button variant="secondary" disabled={enviando} onClick={aoFechar}>
              {DIALOGO_DE_DECISAO.voltar}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
