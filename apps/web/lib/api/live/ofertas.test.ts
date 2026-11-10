// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EntradaInvalidaError, EstadoInvalidoError } from "../erros";
import { CascataSchema, ContestacaoSchema, OfertaSchema } from "../types";
import { AdaptadorLive } from "./adaptador";
import { limparLogin } from "./autenticacao";
import type { OpcoesHttp } from "./http";
import { medicoRestrito } from "./mapeamento";
import {
  cascataDoBanco,
  contestacaoDoBanco,
  ofertaDoBanco,
  statusDaOferta,
  type OfertaDoBanco,
  type RecomendacaoDoMedico,
  type VagaDaOfertaDoBanco,
} from "./ofertas";

const CONFIG: OpcoesHttp = {
  apiUrl: "/api/sistema/api",
  bancoUrl: "/api/sistema/banco",
  authUrl: "/api/sistema/auth",
  esperar: () => Promise.resolve(),
};

const json = (status: number, corpo: unknown) =>
  new Response(JSON.stringify(corpo), {
    status,
    headers: { "Content-Type": "application/json" },
  });

function tokensValidos() {
  window.sessionStorage.setItem(
    "ps_login",
    JSON.stringify({ acesso: "A1", renovacao: "R1", expiraEm: Date.now() + 3_600_000 }),
  );
}

beforeEach(() => {
  window.sessionStorage.clear();
  limparLogin();
});
afterEach(() => vi.restoreAllMocks());

// 19h em São Paulo é 22h em UTC.
const VAGA: VagaDaOfertaDoBanco = {
  id: "v1",
  specialty: "pediatria",
  starts_at: "2026-11-17T22:00:00+00:00",
  ends_at: "2026-11-18T10:00:00+00:00",
  urgency: "high",
  status: "offering",
  units: { id: "u1", name: "Hospital Modelo Centro", zone: "centro" },
};

function oferta(parcial: Partial<OfertaDoBanco>): OfertaDoBanco {
  return {
    id: "o1",
    shift_id: "v1",
    doctor_id: "d1",
    sequence_no: 1,
    sent_at: "2026-11-17T12:00:00+00:00", // 9h em São Paulo
    ttl_minutes: 2,
    responded_at: null,
    response: "pending",
    decline_reason: null,
    shifts: VAGA,
    ...parcial,
  };
}

const RECOMENDACAO: RecomendacaoDoMedico = {
  doctor_id: "d1",
  shift_id: "v1",
  rank: 1,
  features: { distance_km: 4.2, specialty_match: 1 },
  contributions: { distance_km: 0.1 },
  alerts: [],
  explicacao: {
    texto: "Mesma especialidade e perto do hospital.",
    fatoresCitados: ["specialty_match", "distance_km"],
    fonte: "template",
  },
};

const MEDICO = medicoRestrito("d1", "pediatria");

describe("status da oferta", () => {
  it("pendente dentro do prazo está aberta; com o prazo vencido, já é expirada", () => {
    expect(statusDaOferta(oferta({}), "2026-11-17T09:01:30")).toBe("aberta");
    expect(statusDaOferta(oferta({}), "2026-11-17T09:02:00")).toBe("expirada");
  });

  it("as respostas viram os estados da tela, e vaga fechada cancela a pendente", () => {
    expect(statusDaOferta(oferta({ response: "accepted" }), "2026-11-17T09:00:30")).toBe("aceita");
    expect(statusDaOferta(oferta({ response: "declined" }), "2026-11-17T09:00:30")).toBe("recusada");
    expect(statusDaOferta(oferta({ response: "expired" }), "2026-11-17T09:00:30")).toBe("expirada");
    const fechada = oferta({ shifts: { ...VAGA, status: "filled" } });
    expect(statusDaOferta(fechada, "2026-11-17T09:00:30")).toBe("cancelada");
  });
});

describe("oferta do banco", () => {
  it("traz o plantão, a distância, o prazo e o 'Por que você'", () => {
    const resultado = ofertaDoBanco(oferta({}), MEDICO, RECOMENDACAO, "2026-11-17T09:00:30");
    expect(OfertaSchema.parse(resultado)).toBeTruthy();
    expect(resultado.vaga.inicio).toBe("2026-11-17T19:00:00");
    expect(resultado.vaga.distanciaKm).toBe(4.2);
    expect(resultado.expiraEm).toBe("2026-11-17T09:02:00");
    expect(resultado.porQue.texto).toContain("Mesma especialidade");
  });

  it("a recusa volta com o motivo da tela (D4)", () => {
    const resultado = ofertaDoBanco(
      oferta({
        response: "declined",
        decline_reason: "fatigue",
        responded_at: "2026-11-17T12:01:00+00:00",
      }),
      MEDICO,
      null,
      "2026-11-17T09:03:00",
    );
    expect(resultado.motivoRecusa).toBe("cansaco");
    expect(resultado.respondidaEm).toBe("2026-11-17T09:01:00");
    expect(resultado.porQue.texto).toBe("");
  });
});

describe("cascata do banco", () => {
  it("o 1º recusou, o 2º está com a oferta e o 3º espera na fila", () => {
    const enviadas = [
      oferta({ id: "o2", doctor_id: "d2", sequence_no: 2, sent_at: "2026-11-17T12:01:00+00:00" }),
      oferta({
        response: "declined",
        decline_reason: "distance",
        responded_at: "2026-11-17T12:01:00+00:00",
      }),
    ];
    const medicos = new Map([
      ["d1", { ...MEDICO, nome: "Ana" }],
      ["d2", { ...medicoRestrito("d2", "pediatria"), nome: "Bruno" }],
      ["d3", { ...medicoRestrito("d3", "pediatria"), nome: "Carla" }],
    ]);
    const cascata = cascataDoBanco(
      "v1",
      VAGA,
      enviadas,
      ["d1", "d2", "d3"],
      medicos,
      new Map([["d1", RECOMENDACAO]]),
      "2026-11-17T09:01:30",
    );
    expect(CascataSchema.parse(cascata)).toBeTruthy();
    expect(cascata.ofertas.map((o) => [o.sequencia, o.medico.nome, o.status])).toEqual([
      [1, "Ana", "recusada"],
      [2, "Bruno", "aberta"],
      [3, "Carla", "na_fila"],
    ]);
    expect(cascata.atualId).toBe("o2");
    expect(cascata.ofertas[0]?.motivoRecusa).toBe("distancia");
    expect(cascata.ofertas[2]?.enviadaEm).toBeNull();
  });

  it("com a vaga preenchida, quem ficou na fila aparece cancelado", () => {
    const cascata = cascataDoBanco(
      "v1",
      { ...VAGA, status: "filled" },
      [oferta({ response: "accepted", responded_at: "2026-11-17T12:00:40+00:00" })],
      ["d1", "d2"],
      new Map([["d1", MEDICO]]),
      new Map(),
      "2026-11-17T09:05:00",
    );
    expect(cascata.ofertas.map((o) => o.status)).toEqual(["aceita", "cancelada"]);
    expect(cascata.atualId).toBeNull();
    // Quem a RLS não abre aparece só pelo pseudônimo.
    expect(cascata.ofertas[1]?.medico.nome).toBe("Médico d2");
  });
});

describe("contestação do banco", () => {
  it("o motivo e a resposta voltam no formato da tela (D8)", () => {
    const contestacao = contestacaoDoBanco(
      {
        id: "c1",
        protocol: "CT-0001",
        offer_id: "o1",
        shift_id: "v1",
        doctor_id: "d1",
        reason: "unfair_order",
        text: "A ordem ignorou que moro perto.",
        status: "answered",
        answer_text: "Conferimos: a distância foi usada.",
        answered_by: "a1",
        created_at: "2026-11-17T12:10:00+00:00",
        answered_at: "2026-11-17T12:20:00+00:00",
      },
      MEDICO,
      RECOMENDACAO,
    );
    expect(ContestacaoSchema.parse(contestacao)).toBeTruthy();
    expect(contestacao.motivo).toBe("ordem_injusta");
    expect(contestacao.status).toBe("respondida");
    expect(contestacao.resposta?.em).toBe("2026-11-17T09:20:00");
    expect(contestacao.recomendacao.posicao).toBe(1);
  });
});

describe("chamadas do médico", () => {
  it("aceitar manda 'accepted' sem motivo", async () => {
    tokensValidos();
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (entrada) => {
        const url = String(entrada);
        if (url.includes("/respond")) return json(200, { offer: {}, shift_status: "filled" });
        if (url.includes("/offers?")) return json(200, [oferta({ response: "accepted", responded_at: "2026-11-17T12:00:40+00:00" })]);
        return json(200, []);
      });
    const api = new AdaptadorLive(CONFIG);
    const resultado = await api.responderOferta({ ofertaId: "o1", resposta: "aceitar" });
    const chamada = fetch.mock.calls.find(([url]) => String(url).includes("/respond"));
    expect(JSON.parse(String(chamada?.[1]?.body))).toEqual({
      response: "accepted",
      decline_reason: null,
    });
    expect(resultado.status).toBe("aceita");
  });

  it("recusar manda o motivo da API, e sem motivo nem chama (D4)", async () => {
    tokensValidos();
    const fetch = vi.spyOn(globalThis, "fetch").mockImplementation(async (entrada) => {
      const url = String(entrada);
      if (url.includes("/respond")) return json(200, { offer: {}, shift_status: "offering" });
      if (url.includes("/offers?")) {
        return json(200, [
          oferta({ response: "declined", decline_reason: "schedule", responded_at: "2026-11-17T12:00:40+00:00" }),
        ]);
      }
      return json(200, []);
    });
    const api = new AdaptadorLive(CONFIG);
    await expect(api.responderOferta({ ofertaId: "o1", resposta: "recusar" })).rejects.toBeInstanceOf(
      EntradaInvalidaError,
    );
    expect(fetch).not.toHaveBeenCalled();
    await api.responderOferta({ ofertaId: "o1", resposta: "recusar", motivo: "agenda" });
    const chamada = fetch.mock.calls.find(([url]) => String(url).includes("/respond"));
    expect(JSON.parse(String(chamada?.[1]?.body)).decline_reason).toBe("schedule");
  });

  it("a resposta não se desfaz (D5)", async () => {
    const api = new AdaptadorLive(CONFIG);
    await expect(api.desfazerResposta()).rejects.toBeInstanceOf(EstadoInvalidoError);
  });

  it("contestar tira o telefone do texto e manda o motivo da API", async () => {
    tokensValidos();
    const fetch = vi.spyOn(globalThis, "fetch").mockImplementation(async (entrada) => {
      const url = String(entrada);
      if (url.includes("/offers/o1/contest")) return json(201, { id: "c1" });
      if (url.includes("/contestations?")) {
        return json(200, [
          {
            id: "c1",
            protocol: "CT-0001",
            offer_id: "o1",
            shift_id: "v1",
            doctor_id: "d1",
            reason: "wrong_data",
            text: "Moro perto",
            status: "open",
            answer_text: null,
            answered_by: null,
            created_at: "2026-11-17T12:10:00+00:00",
            answered_at: null,
          },
        ]);
      }
      return json(200, []);
    });
    const api = new AdaptadorLive(CONFIG);
    const contestacao = await api.contestar({
      ofertaId: "o1",
      motivo: "dado_errado",
      texto: "Moro perto, me liga no (11) 98765-4321",
    });
    const chamada = fetch.mock.calls.find(([url]) => String(url).includes("/offers/o1/contest"));
    const corpo = JSON.parse(String(chamada?.[1]?.body));
    expect(corpo.reason).toBe("wrong_data");
    expect(corpo.text).not.toContain("98765");
    expect(contestacao.protocolo).toBe("CT-0001");
  });
});
