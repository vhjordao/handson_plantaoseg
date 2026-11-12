import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { montarCredenciais } from "@/lib/api/credenciais";
import { ApiProvider } from "@/lib/api/provider";
import type { Medico, StatusCrm } from "@/lib/api/types";
import { TelaDeCredenciais } from "./tela-de-credenciais";

/** A API falsa entra pelo adaptador `live`, como no sistema real; a rede não é usada. */
const api = {
  modo: "live" as const,
  agora: vi.fn(() => "2026-11-17T09:00:00"),
  obterCredenciais: vi.fn(),
};
vi.mock("@/lib/api/live", () => ({
  criarApiLive: () => api,
  lerConfigLive: () => ({ apiUrl: "a", bancoUrl: "b", authUrl: "c" }),
}));

const MEDICO: Medico = {
  id: "d1",
  pseudonimo: "d1",
  nome: "Ana Lima",
  crm: "SIM-SP-000083",
  especialidade: "pediatria",
  especialidadeSecundaria: null,
};

const credenciais = (status: StatusCrm, medico: Medico = MEDICO) =>
  montarCredenciais(medico, status, "2026-11-17T09:00:00", "cadastro");

function tela() {
  return render(
    <ApiProvider modo="live" papel="medico">
      <TelaDeCredenciais medicoId="d1" />
    </ApiProvider>,
  );
}

beforeEach(() => {
  api.obterCredenciais.mockReset();
});

describe("tela de credenciais do médico", () => {
  it("mostra o registro, a UF, o status do cadastro e a validade, marcada como simulada", async () => {
    const dados = credenciais("ativo");
    api.obterCredenciais.mockResolvedValue(dados);
    tela();
    const registro = await screen.findByRole("region", { name: "Registro no CRM" });
    expect(within(registro).getByText("SIM-SP-000083")).toBeInTheDocument();
    expect(within(registro).getByText("SP")).toBeInTheDocument();
    expect(within(registro).getByText("Ativo")).toBeInTheDocument();
    expect(within(registro).getByText("Status lido do seu cadastro no banco.")).toBeInTheDocument();
    expect(within(registro).getByText(/^Válido até \d{2}\/\d{2}\/\d{4}$/)).toBeInTheDocument();
    expect(within(registro).getByText(/Data simulada\./)).toBeInTheDocument();
    expect(api.obterCredenciais).toHaveBeenCalledWith("d1");
    // A simulação é dita na tela, e não só na faixa do topo.
    expect(screen.getByRole("region", { name: "Simulação" })).toHaveTextContent(/validade é uma data simulada/);
  });

  it("CRM ativo diz que o nome pode entrar nas recomendações", async () => {
    api.obterCredenciais.mockResolvedValue(credenciais("ativo"));
    tela();
    const efeito = await screen.findByRole("region", { name: "O que isso muda nas recomendações" });
    expect(efeito).toHaveTextContent(/o seu nome pode entrar nas recomendações/);
  });

  it("CRM vencido aparece como vencido, com a data no passado, e fora das recomendações", async () => {
    api.obterCredenciais.mockResolvedValue(credenciais("vencido"));
    tela();
    const registro = await screen.findByRole("region", { name: "Registro no CRM" });
    // O estado é dito em texto na etiqueta e no status: a cor não é o único sinal.
    expect(within(registro).getAllByText("Vencido")).toHaveLength(2);
    expect(within(registro).getByText(/^Venceu em \d{2}\/\d{2}\/\d{4}$/)).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "O que isso muda nas recomendações" }),
    ).toHaveTextContent(/o sistema não sugere o seu nome/);
  });

  it("CRM suspenso fica fora das recomendações", async () => {
    api.obterCredenciais.mockResolvedValue(credenciais("suspenso"));
    tela();
    const registro = await screen.findByRole("region", { name: "Registro no CRM" });
    expect(within(registro).getAllByText("Suspenso")).toHaveLength(2);
    expect(
      screen.getByRole("region", { name: "O que isso muda nas recomendações" }),
    ).toHaveTextContent(/CRM suspenso, o sistema não sugere/);
  });

  it("mostra a especialidade secundária quando existe, e diz quando não existe", async () => {
    api.obterCredenciais.mockResolvedValue(
      credenciais("ativo", { ...MEDICO, especialidadeSecundaria: "clinica_medica" }),
    );
    const { unmount } = tela();
    const comSecundaria = await screen.findByRole("region", { name: "Especialidades no cadastro" });
    expect(within(comSecundaria).getByText("Pediatria")).toBeInTheDocument();
    expect(within(comSecundaria).getByText("Clínica médica")).toBeInTheDocument();
    unmount();

    api.obterCredenciais.mockResolvedValue(credenciais("ativo"));
    tela();
    const semSecundaria = await screen.findByRole("region", { name: "Especialidades no cadastro" });
    expect(
      within(semSecundaria).getByText("Nenhuma especialidade secundária no cadastro."),
    ).toBeInTheDocument();
  });

  it("se o sistema não responde, avisa e oferece tentar de novo", async () => {
    api.obterCredenciais.mockRejectedValue(new Error("fora do ar"));
    tela();
    expect(
      await screen.findByText("Não foi possível carregar as credenciais", {}, { timeout: 8000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tentar de novo" })).toBeInTheDocument();
  }, 10_000);
});
