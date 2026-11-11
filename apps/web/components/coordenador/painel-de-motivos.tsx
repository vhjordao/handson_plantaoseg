"use client";

import * as React from "react";
import { FatoresDeDecisao } from "@/components/dominio/fatores-de-decisao";
import { FichaDoModelo } from "@/components/dominio/ficha-do-modelo";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, Textarea } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { useFeedbackDaExplicacao, useFichaModelo } from "@/lib/api/hooks";
import { LIMITE_TEXTO_LIVRE, type Candidato } from "@/lib/api/types";
import { AVISO_DADOS_REAIS } from "@/lib/copy/comum";
import { FICHA_DO_MODELO, MOTIVOS } from "@/lib/copy/coordenador";
import { formatarPercentual } from "@/lib/format/datas";

/**
 * "Ver motivos": o número da chance, o que pesou, o que não entra na ordem, a ficha do modelo e a
 * pergunta "Esta explicação ajudou?", que diz o que acontece com a resposta.
 */
export function PainelDeMotivos({ vagaId, candidato }: { vagaId: string; candidato: Candidato }) {
  const { data: ficha, isError } = useFichaModelo();
  const tituloId = React.useId();

  return (
    <div className="mt-1 grid gap-4 superficie p-4">
      <p className="font-semibold">{MOTIVOS.chance(formatarPercentual(candidato.score))}</p>

      <section aria-labelledby={`${tituloId}-pesou`} className="grid gap-2">
        <h4 id={`${tituloId}-pesou`} className="font-semibold">
          {MOTIVOS.oQuePesou}
        </h4>
        <p className="text-sm text-tinta-suave">{MOTIVOS.legenda}</p>
        <FatoresDeDecisao fatores={candidato.fatores} contribuicoes={candidato.contribuicoes} />
      </section>

      <section aria-labelledby={`${tituloId}-fora`} className="grid gap-1">
        <h4 id={`${tituloId}-fora`} className="font-semibold">
          {MOTIVOS.naoEntram}
        </h4>
        {ficha ? (
          <ul className="list-disc pl-5 text-sm text-tinta-suave">
            {ficha.variaveisNaoUsadas.map(({ nome }) => (
              <li key={nome}>{nome}</li>
            ))}
          </ul>
        ) : isError ? null : (
          <Skeleton className="h-16" />
        )}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="link" className="mt-1 min-h-[var(--alvo-min)] justify-self-start px-0">
              {MOTIVOS.verFicha}
            </Button>
          </DialogTrigger>
          <DialogContent className="md:max-w-2xl">
            <DialogTitle>{FICHA_DO_MODELO.titulo}</DialogTitle>
            <DialogDescription className="mb-4">{FICHA_DO_MODELO.descricao}</DialogDescription>
            {ficha ? (
              <FichaDoModelo ficha={ficha} />
            ) : isError ? (
              <Alert tone="erro">{FICHA_DO_MODELO.erro}</Alert>
            ) : (
              <p role="status">{FICHA_DO_MODELO.carregando}</p>
            )}
          </DialogContent>
        </Dialog>
      </section>

      <FeedbackDaExplicacao vagaId={vagaId} medicoId={candidato.medico.id} />
    </div>
  );
}

function FeedbackDaExplicacao({ vagaId, medicoId }: { vagaId: string; medicoId: string }) {
  const enviar = useFeedbackDaExplicacao();
  const idBase = React.useId();
  const [etapa, setEtapa] = React.useState<"pergunta" | "comentario" | "enviado">("pergunta");
  const [comentario, setComentario] = React.useState("");

  const registrar = async (ajudou: boolean) => {
    try {
      await enviar.mutateAsync({
        vagaId,
        medicoId,
        ajudou,
        comentario: comentario.trim() || undefined,
      });
      setEtapa("enviado");
    } catch {
      // A mensagem sai de `enviar.isError`, logo abaixo; a pessoa continua onde estava.
    }
  };

  return (
    <section aria-labelledby={`${idBase}-titulo`} className="grid gap-2 border-t border-divisor pt-3">
      <h4 id={`${idBase}-titulo`} className="font-semibold">
        {MOTIVOS.ajudou}
      </h4>
      {etapa === "pergunta" ? (
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" loading={enviar.isPending} onClick={() => void registrar(true)}>
            {MOTIVOS.sim}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setEtapa("comentario")}>
            {MOTIVOS.nao}
          </Button>
        </div>
      ) : null}
      {etapa === "comentario" ? (
        <div className="grid gap-2">
          <Field id={`${idBase}-comentario`} label={MOTIVOS.oQueFaltou} hint={AVISO_DADOS_REAIS}>
            {(aria) => (
              <Textarea
                {...aria}
                className="min-h-20"
                maxLength={LIMITE_TEXTO_LIVRE}
                value={comentario}
                onChange={(evento) => setComentario(evento.target.value)}
              />
            )}
          </Field>
          <Button
            variant="secondary"
            size="sm"
            className="justify-self-start"
            loading={enviar.isPending}
            onClick={() => void registrar(false)}
          >
            {MOTIVOS.enviar}
          </Button>
        </div>
      ) : null}
      {/* A região de status existe antes do texto entrar: é o que garante o anúncio. */}
      <p role="status" className="text-sm text-tinta-suave">
        {etapa === "enviado" ? MOTIVOS.registrado : ""}
      </p>
      {enviar.isError ? <p className="text-sm font-semibold text-erro">{MOTIVOS.feedbackFalhou}</p> : null}
    </section>
  );
}
