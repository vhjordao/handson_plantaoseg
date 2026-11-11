import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Field, type FieldProps } from "@/components/ui/field";
import type { CampoLido } from "@/lib/api/types";
import { NOVA_VAGA } from "@/lib/copy/coordenador";
import { ROTULO_ORIGEM_CAMPO } from "@/lib/copy/rotulos";
import { SuperficieVoz } from "./superficie-voz";
import { VozTag } from "./voz-tag";

/**
 * Um campo lido do texto, para conferir. A voz segue a origem real: leitura por regras é cinza,
 * leitura pela IA ganha o fundo da IA, e o campo que a pessoa mexeu passa ao verde. Sem
 * percentual de confiança: o backend não o fornece. O texto é só exibido, nunca vira HTML.
 */
export function CampoExtraido({
  id,
  rotulo,
  campo,
  fonte,
  editado,
  trecho,
  erro,
  children,
}: {
  id: string;
  /** O rótulo do campo, ou a pergunta quando o campo não está no texto. */
  rotulo: string;
  /** O que a leitura achou. Nulo quando não houve leitura (formulário de contingência). */
  campo: CampoLido | null;
  fonte: "regras" | "llm" | null;
  editado: boolean;
  /** O pedaço do texto original de onde o campo saiu. */
  trecho: string | null;
  erro: string | null;
  children: FieldProps["children"];
}) {
  const vozDaLeitura = fonte === "llm" ? "ia" : "regra";
  const voz = editado ? "humano" : vozDaLeitura;

  let origem: React.ReactNode = null;
  if (editado) {
    origem = (
      <VozTag voz="humano">
        {campo?.origem === "nao_achei" || !campo ? NOVA_VAGA.preenchido : NOVA_VAGA.corrigido}
      </VozTag>
    );
  } else if (campo?.origem === "nao_achei") {
    origem = <Badge tone="atencao">{ROTULO_ORIGEM_CAMPO.nao_achei}</Badge>;
  } else if (campo) {
    origem = <VozTag voz={vozDaLeitura}>{ROTULO_ORIGEM_CAMPO[campo.origem]}</VozTag>;
  }

  return (
    <SuperficieVoz voz={voz} className="p-3">
      <Field
        id={id}
        label={rotulo}
        error={erro}
        hint={
          origem || trecho ? (
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {origem}
              {trecho ? <span>“{trecho}”</span> : null}
            </span>
          ) : undefined
        }
      >
        {children}
      </Field>
    </SuperficieVoz>
  );
}

/**
 * O texto lido, com os trechos que viraram campo destacados. O texto é entrada hostil: entra como
 * texto do React, sempre escapado.
 */
export function TextoComTrechos({
  texto,
  trechos,
}: {
  texto: string;
  trechos: ReadonlyArray<{ inicio: number; fim: number }>;
}) {
  const ordenados = [...trechos].sort((a, b) => a.inicio - b.inicio);
  const partes: React.ReactNode[] = [];
  let cursor = 0;
  for (const { inicio, fim } of ordenados) {
    if (fim <= cursor) continue; // um trecho dentro de outro já foi destacado
    const comeco = Math.max(inicio, cursor);
    if (comeco > cursor) partes.push(texto.slice(cursor, comeco));
    partes.push(
      <mark key={comeco} className="rounded-sm bg-tinta/10 px-0.5 font-semibold text-tinta">
        {texto.slice(comeco, fim)}
      </mark>,
    );
    cursor = fim;
  }
  if (cursor < texto.length) partes.push(texto.slice(cursor));
  return <p className="break-words whitespace-pre-wrap">{partes}</p>;
}
