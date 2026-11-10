import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CascataDaVaga } from "@/components/coordenador/cascata-da-vaga";
import { medicoRestrito } from "@/lib/api/live/mapeamento";
import { cascataDoBanco, ofertaDoBanco, type OfertaDoBanco } from "@/lib/api/live/ofertas";
import { NaoImplementadoError } from "@/lib/api/plantao-api";
import { ApiProvider } from "@/lib/api/provider";
import type { Oferta, Vaga } from "@/lib/api/types";
import { TelaDeOfertas } from "./tela-de-ofertas";

/** A API falsa entra pelo adaptador `live`, como no sistema real; a rede não é usada. */
const api = {
  modo: "live" as const,
  agora: vi.fn(() => "2026-11-17T09:00:30"),
  listarOfertas: vi.fn(),
  listarContestacoes: vi.fn(),
  responderOferta: vi.fn(),
  contestar: vi.fn(),
  obterCascata: vi.fn(),
};
vi.mock("@/lib/api/live", () => ({
  criarApiLive: () => api,
  lerConfigLive: () => ({ apiUrl: "a", bancoUrl: "b", authUrl: "c" }),
}));

const VAGA_DO_BANCO = {
  id: "v1",
  specialty: "pediatria",
  starts_at: "2026-11-17T22:00:00+00:00",
  ends_at: "2026-11-18T10:00:00+00:00",
  urgency: "high",
  status: "offering",
  units: { id: "u1", name: "Hospital Modelo Centro", zone: "centro" },
};

function linha(parcial: Partial<OfertaDoBanco> = {}): OfertaDoBanco {
  return {
    id: "o1",
    shift_id: "v1",
    doctor_id: "d1",
    sequence_no: 1,
    sent_at: "2026-11-17T12:00:00+00:00",
    ttl_minutes: 2,
    responded_at: null,
    response: "pending",
    decline_reason: null,
    shifts: VAGA_DO_BANCO,
    ...parcial,
  };
}

const OFERTA_ABERTA: Oferta = ofertaDoBanco(
  linha(),
  { ...medicoRestrito("d1", "pediatria"), nome: "Ana Lima" },
  {
    doctor_id: "d1",
    shift_id: "v1",
    rank: 1,
    features: { distance_km: 4.2 },
    contributions: {},
    alerts: [],
    explicacao: {
      texto: "Mesma especialidade e a 4 km do hospital.",
      fatoresCitados: ["distance_km"],
      fonte: "template",
    },
  },
  "2026-11-17T09:00:30",
);

function telaDeOfertas() {
  return render(
    <ApiProvider modo="live" papel="medico">
      <TelaDeOfertas medicoId="d1" />
    </ApiProvider>,
  );
}

beforeEach(() => {
  for (const fn of Object.values(api)) if (typeof fn === "function") fn.mockReset?.();
  api.agora.mockReturnValue("2026-11-17T09:00:30");
  api.listarOfertas.mockResolvedValue([OFERTA_ABERTA]);
  api.listarContestacoes.mockResolvedValue([]);
});

describe("tela de ofertas (4.1 e 4.2)", () => {
  it("mostra o plantão, a distância, o prazo e o 'Por que você'", async () => {
    telaDeOfertas();
    const cartao = await screen.findByRole("article", { name: /Pediatria, Hospital Modelo Centro/ });
    expect(within(cartao).getByText("Mesma especialidade e a 4 km do hospital.")).toBeInTheDocument();
    expect(within(cartao).getByText("4,2 km")).toBeInTheDocument();
    expect(within(cartao).getByText(/Responda até 9h02/)).toBeInTheDocument();
    expect(within(cartao).getByText("faltam 1 min 30 s")).toBeInTheDocument();
    expect(api.listarOfertas).toHaveBeenCalledWith("d1");
  });

  it("recusar pede um dos quatro motivos e confirmação antes de chamar (D4 e D5)", async () => {
    const usuario = userEvent.setup();
    api.responderOferta.mockResolvedValue({ ...OFERTA_ABERTA, status: "recusada" });
    telaDeOfertas();
    await usuario.click(await screen.findByRole("button", { name: "Recusar" }));
    const dialogo = await screen.findByRole("dialog", { name: "Recusar este plantão?" });
    // O foco vai ao título, não ao botão: Enter sem ler não recusa.
    expect(within(dialogo).getByRole("heading", { name: "Recusar este plantão?" })).toHaveFocus();
    await usuario.click(within(dialogo).getByRole("button", { name: "Sim, recusar" }));
    expect(within(dialogo).getByText("Escolha um dos motivos.")).toBeInTheDocument();
    expect(api.responderOferta).not.toHaveBeenCalled();
    await usuario.click(within(dialogo).getByRole("radio", { name: "Cansaço" }));
    await usuario.click(within(dialogo).getByRole("button", { name: "Sim, recusar" }));
    expect(api.responderOferta).toHaveBeenCalledWith({
      ofertaId: "o1",
      resposta: "recusar",
      motivo: "cansaco",
    });
    expect(
      await screen.findByText("Você recusou. A oferta seguiu para o próximo nome."),
    ).toBeInTheDocument();
  });

  it("aceitar confirma antes e não leva motivo", async () => {
    const usuario = userEvent.setup();
    api.responderOferta.mockResolvedValue({ ...OFERTA_ABERTA, status: "aceita" });
    telaDeOfertas();
    await usuario.click(await screen.findByRole("button", { name: "Aceitar o plantão" }));
    const dialogo = await screen.findByRole("dialog", { name: "Aceitar este plantão?" });
    expect(within(dialogo).queryByRole("radio")).toBeNull();
    await usuario.click(within(dialogo).getByRole("button", { name: "Sim, aceitar" }));
    expect(api.responderOferta).toHaveBeenCalledWith({
      ofertaId: "o1",
      resposta: "aceitar",
      motivo: undefined,
    });
  });

  it("contestar exige o motivo e o texto, e avisa o protocolo (4.3)", async () => {
    const usuario = userEvent.setup();
    api.contestar.mockResolvedValue({ protocolo: "CT-0001" });
    telaDeOfertas();
    await usuario.click(await screen.findByRole("button", { name: "Contestar a recomendação" }));
    const dialogo = await screen.findByRole("dialog", { name: "Contestar esta recomendação" });
    await usuario.click(within(dialogo).getByRole("button", { name: "Enviar a contestação" }));
    expect(within(dialogo).getByText("Escolha o que não está certo.")).toBeInTheDocument();
    expect(within(dialogo).getByText("Escreva o que está errado.")).toBeInTheDocument();
    await usuario.click(within(dialogo).getByRole("radio", { name: "A ordem me parece injusta" }));
    await usuario.type(within(dialogo).getByLabelText("Explique em poucas palavras"), "Moro perto.");
    await usuario.click(within(dialogo).getByRole("button", { name: "Enviar a contestação" }));
    expect(api.contestar).toHaveBeenCalledWith({
      ofertaId: "o1",
      motivo: "ordem_injusta",
      texto: "Moro perto.",
    });
    expect(await screen.findByText(/protocolo CT-0001/)).toBeInTheDocument();
  });

  it("sem oferta aberta, explica que a próxima aparece sozinha", async () => {
    api.listarOfertas.mockResolvedValue([]);
    telaDeOfertas();
    expect(
      await screen.findByRole("heading", { level: 2, name: "Nenhuma oferta esperando resposta" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/aparece aqui sozinha/)).toBeInTheDocument();
  });

  it("no modo que ainda não tem ofertas, diz isso em vez de quebrar", async () => {
    api.listarOfertas.mockRejectedValue(new NaoImplementadoError("listarOfertas", "demo"));
    telaDeOfertas();
    expect(await screen.findByText(/não estão disponíveis neste modo/)).toBeInTheDocument();
  });
});

describe("cascata na tela da vaga (4.5)", () => {
  const vaga = { id: "v1", status: "oferta_em_andamento" } as Vaga;

  it("mostra quem recusou e por quê, quem está com a oferta e quem espera", async () => {
    api.obterCascata.mockResolvedValue(
      cascataDoBanco(
        "v1",
        VAGA_DO_BANCO,
        [
          linha({
            response: "declined",
            decline_reason: "distance",
            responded_at: "2026-11-17T12:01:00+00:00",
          }),
          linha({ id: "o2", doctor_id: "d2", sequence_no: 2, sent_at: "2026-11-17T12:00:00+00:00" }),
        ],
        ["d1", "d2", "d3"],
        new Map([
          ["d1", { ...medicoRestrito("d1", "pediatria"), nome: "Ana Lima" }],
          ["d2", { ...medicoRestrito("d2", "pediatria"), nome: "Bruno Reis" }],
          ["d3", { ...medicoRestrito("d3", "pediatria"), nome: "Carla Dias" }],
        ]),
        new Map(),
        "2026-11-17T09:00:30",
      ),
    );
    render(
      <ApiProvider modo="live">
        <CascataDaVaga vaga={vaga} />
      </ApiProvider>,
    );
    const lista = await screen.findByRole("list");
    const passos = within(lista).getAllByRole("listitem");
    expect(passos.map((p) => p.textContent)).toEqual([
      expect.stringMatching(/1º.*Ana Lima.*Recusada.*às 9h01, motivo: distância/),
      expect.stringMatching(/2º.*Bruno Reis.*Aberta.*1 min 30 s para responder/),
      expect.stringMatching(/3º.*Carla Dias.*Na fila/),
    ]);
  });

  it("num modo sem a cascata, a seção não aparece", async () => {
    api.obterCascata.mockRejectedValue(new NaoImplementadoError("obterCascata", "demo"));
    const { container } = render(
      <ApiProvider modo="live">
        <CascataDaVaga vaga={vaga} />
      </ApiProvider>,
    );
    await vi.waitFor(() => expect(api.obterCascata).toHaveBeenCalled());
    await vi.waitFor(() => expect(container.querySelector("section")).toBeNull());
  });
});
