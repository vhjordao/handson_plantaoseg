import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiProvider, useApi, useEstadoApi } from "./provider";

const criarApiDemo = vi.fn();
vi.mock("./demo", () => ({ criarApiDemo: (...args: unknown[]) => criarApiDemo(...args) }));

/** Uma tela mínima: o que o usuário veria em cada estado do carregamento. */
function Painel() {
  const api = useApi();
  const { falhou, tentarDeNovo } = useEstadoApi();
  if (falhou) return <button onClick={tentarDeNovo}>Tentar de novo</button>;
  return <p>{api ? "pronto" : "carregando"}</p>;
}

beforeEach(() => {
  criarApiDemo.mockReset();
});

describe("ApiProvider", () => {
  it("entrega a API depois de carregar o adaptador, sem tela vazia no meio", async () => {
    criarApiDemo.mockReturnValue({ definirCoordenador: vi.fn() });
    render(
      <ApiProvider>
        <Painel />
      </ApiProvider>,
    );
    expect(screen.getByText("carregando")).toBeInTheDocument();
    expect(await screen.findByText("pronto")).toBeInTheDocument();
  });

  it("se o adaptador não carregar, oferece tentar de novo em vez de carregar para sempre", async () => {
    criarApiDemo.mockImplementationOnce(() => {
      throw new Error("o pacote do adaptador não carregou");
    });
    criarApiDemo.mockReturnValue({ definirCoordenador: vi.fn() });
    render(
      <ApiProvider>
        <Painel />
      </ApiProvider>,
    );
    await userEvent.click(await screen.findByRole("button", { name: "Tentar de novo" }));
    expect(await screen.findByText("pronto")).toBeInTheDocument();
    expect(criarApiDemo).toHaveBeenCalledTimes(2);
  });

  it("repassa ao adaptador a persona de coordenador que decide nesta sessão", async () => {
    const definirCoordenador = vi.fn();
    criarApiDemo.mockReturnValue({ definirCoordenador });
    render(
      <ApiProvider coordenadorId="coord-1">
        <Painel />
      </ApiProvider>,
    );
    await screen.findByText("pronto");
    expect(definirCoordenador).toHaveBeenCalledWith("coord-1");
  });

  it("segue em memória quando o navegador bloqueia o sessionStorage", async () => {
    criarApiDemo.mockReturnValue({ definirCoordenador: vi.fn() });
    const acessar = vi.spyOn(window, "sessionStorage", "get").mockImplementation(() => {
      throw new DOMException("bloqueado", "SecurityError");
    });
    render(
      <ApiProvider>
        <Painel />
      </ApiProvider>,
    );
    expect(await screen.findByText("pronto")).toBeInTheDocument();
    expect(criarApiDemo).toHaveBeenCalledWith({ storage: null });
    acessar.mockRestore();
  });
});
