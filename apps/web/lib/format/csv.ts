import type { RegistroAuditoria } from "@/lib/api/types";

/** Um campo de CSV: entre aspas se tiver vírgula, aspas, ponto e vírgula ou quebra de linha. */
function campo(valor: unknown): string {
  const texto = valor === null || valor === undefined ? "" : typeof valor === "string" ? valor : JSON.stringify(valor);
  return /[",;\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

const COLUNAS = [
  "seq",
  "ocorrido_em",
  "papel",
  "ator_pseudonimo",
  "acao",
  "entidade_tipo",
  "entidade_id",
  "versao_do_modelo",
  "hash_anterior",
  "hash",
  "detalhes",
] as const;

/**
 * A trilha em CSV, com as mesmas colunas do banco e os detalhes em JSON. Começa com a marca de
 * ordem de bytes do UTF-8, para os acentos abrirem certo em planilhas.
 */
export function trilhaEmCsv(registros: readonly RegistroAuditoria[]): string {
  const linhas = registros.map((r) =>
    [
      r.seq,
      r.ocorridoEm,
      r.papelAtor,
      r.atorPseudoId,
      r.acao,
      r.entidadeTipo,
      r.entidadeId,
      r.modeloVersao,
      r.hashAnterior,
      r.hash,
      r.detalhes,
    ]
      .map(campo)
      .join(","),
  );
  return `﻿${[COLUNAS.join(","), ...linhas].join("\r\n")}\r\n`;
}
