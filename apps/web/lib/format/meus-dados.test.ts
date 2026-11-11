import { describe, expect, it } from "vitest";
import type { Medico } from "@/lib/api/types";
import { arquivoDosMeusDados, nomeDoArquivoDosMeusDados } from "./meus-dados";

const MEDICO: Medico = {
  id: "d1-completo",
  pseudonimo: "d1-compl",
  nome: "Ana Sim",
  crm: "SIM-SP-000001",
  especialidade: "pediatria",
  especialidadeSecundaria: null,
};

describe("arquivo dos meus dados", () => {
  it("traz o perfil, as ofertas e as contestações em JSON, com o aviso e a data", () => {
    const texto = arquivoDosMeusDados(MEDICO, [], [], "2026-11-17T09:00:00");
    const dados = JSON.parse(texto);
    expect(dados.medico).toEqual({
      pseudonimo: "d1-compl",
      nome: "Ana Sim",
      crm: "SIM-SP-000001",
      especialidade: "pediatria",
      especialidadeSecundaria: null,
    });
    expect(dados.ofertas).toEqual([]);
    expect(dados.contestacoes).toEqual([]);
    expect(dados.geradoEm).toBe("2026-11-17T09:00:00");
    expect(dados.aviso).toContain("trilha de auditoria");
  });

  it("não leva o id interno nem nada além do perfil que o médico já vê", () => {
    expect(arquivoDosMeusDados(MEDICO, [], [], "2026-11-17T09:00:00")).not.toContain("d1-completo");
  });

  it("o nome do arquivo leva a data", () => {
    expect(nomeDoArquivoDosMeusDados("2026-11-17T09:00:00")).toBe(
      "meus-dados-plantaoseguro-2026-11-17.json",
    );
  });
});
