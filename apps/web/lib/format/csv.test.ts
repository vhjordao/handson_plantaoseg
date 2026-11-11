import { describe, expect, it } from "vitest";
import type { RegistroAuditoria } from "@/lib/api/types";
import { trilhaEmCsv } from "./csv";

const registro: RegistroAuditoria = {
  seq: 7,
  ocorridoEm: "2026-11-04T19:50:49.004102+00:00",
  papelAtor: "coordinator",
  atorPseudoId: "ab12cd34",
  acao: "recommendation_approved",
  entidadeTipo: "shift",
  entidadeId: "vaga-1",
  modeloVersao: null,
  detalhes: { justificativa: 'disse "sim", depois; ok' },
  hashAnterior: "0".repeat(64),
  hash: "f".repeat(64),
};

describe("trilhaEmCsv", () => {
  it("tem cabeçalho, marca de UTF-8 e uma linha por registro", () => {
    const csv = trilhaEmCsv([registro]);
    expect(csv.startsWith("﻿seq,ocorrido_em,papel")).toBe(true);
    expect(csv.trim().split("\r\n")).toHaveLength(2);
  });

  it("protege vírgulas e aspas, e deixa o vazio para o que não existe", () => {
    const linha = trilhaEmCsv([registro]).trim().split("\r\n")[1];
    expect(linha).toContain(',recommendation_approved,shift,vaga-1,,');
    expect(linha).toContain('"{""justificativa"":""disse \\""sim\\"", depois; ok""}"');
  });
});
