import { describe, expect, it } from "vitest";
import { DIAS_DE_AVISO, montarCredenciais, ufDoCrm, validadeSimulada } from "./credenciais";
import { CredenciaisSchema, type Medico } from "./types";

const HOJE = "2026-11-17T09:00:00";

function medico(id: string, crm = "SIM-SP-000083"): Medico {
  return {
    id,
    pseudonimo: id.slice(0, 8),
    nome: "Ana Lima",
    crm,
    especialidade: "pediatria",
    especialidadeSecundaria: null,
  };
}

/** Ids variados, para a regra valer para qualquer semente. */
const IDS = Array.from({ length: 60 }, (_, i) => `f4343f8e-f715-404e-ad1b-${String(i).padStart(12, "0")}`);

describe("credenciais do médico", () => {
  it("lê a UF do CRM simulado e não inventa quando o formato é outro", () => {
    expect(ufDoCrm("SIM-SP-000083")).toBe("SP");
    expect(ufDoCrm("Login da demonstração")).toBeNull();
  });

  it("a validade simulada é estável para o mesmo médico e cai no fim de um mês", () => {
    for (const id of IDS) {
      const validade = validadeSimulada(id, "ativo", HOJE);
      expect(validadeSimulada(id, "ativo", "2026-11-02T23:00:00")).toBe(validade);
      const dia = new Date(`${validade}Z`);
      expect(new Date(dia.getTime() + 24 * 60 * 60 * 1000).getUTCDate()).toBe(1);
    }
  });

  it("CRM ativo nunca aparece vencido, e é elegível", () => {
    for (const id of IDS) {
      const c = montarCredenciais(medico(id), "ativo", HOJE, "cadastro");
      expect(CredenciaisSchema.safeParse(c).success).toBe(true);
      expect(c.diasRestantes).toBeGreaterThan(0);
      expect(c.elegivel).toBe(true);
      expect(c.situacao).toBe(c.diasRestantes <= DIAS_DE_AVISO ? "vence_em_breve" : "em_dia");
    }
  });

  it("entre os ativos há quem vença em breve e quem esteja em dia", () => {
    const situacoes = new Set(
      IDS.map((id) => montarCredenciais(medico(id), "ativo", HOJE, "cadastro").situacao),
    );
    expect(situacoes).toEqual(new Set(["em_dia", "vence_em_breve"]));
  });

  it("CRM vencido tem a validade no passado e não é elegível", () => {
    for (const id of IDS) {
      const c = montarCredenciais(medico(id), "vencido", HOJE, "cadastro");
      expect(c.diasRestantes).toBeLessThan(0);
      expect(c.situacao).toBe("vencida");
      expect(c.elegivel).toBe(false);
    }
  });

  it("CRM suspenso não é elegível, mesmo com a validade à frente", () => {
    const c = montarCredenciais(medico(IDS[0]!), "suspenso", HOJE, "cadastro");
    expect(c.situacao).toBe("suspensa");
    expect(c.diasRestantes).toBeGreaterThan(0);
    expect(c.elegivel).toBe(false);
  });
});
