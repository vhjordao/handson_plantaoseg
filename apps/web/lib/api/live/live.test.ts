// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CandidatoInvalidoError,
  EntradaInvalidaError,
  EstadoInvalidoError,
  JustificativaObrigatoriaError,
  SessaoExpiradaError,
} from "../erros";
import { ApiIndisponivelError } from "../plantao-api";
import {
  EstadoDaDecisaoSchema,
  FATORES,
  LeituraSchema,
  RecomendacaoSchema,
  VagaSchema,
} from "../types";
import { AdaptadorLive } from "./adaptador";
import { entrarComSenha, lerTokens, limparLogin } from "./autenticacao";
import { chamarApi, erroDaApi, type OpcoesHttp } from "./http";
import {
  amostraDeExcluidos,
  estadoDaApi,
  leituraDaApi,
  medicoRestrito,
  recomendacaoDaApi,
  vagaDoBanco,
  type RecomendacaoDaApi,
} from "./mapeamento";
import { agoraLocal, localDoBanco } from "./tempo";

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
    JSON.stringify({
      acesso: "A1",
      renovacao: "R1",
      expiraEm: Date.now() + 3_600_000,
    }),
  );
}

beforeEach(() => {
  window.sessionStorage.clear();
  limparLogin();
});
afterEach(() => vi.restoreAllMocks());

describe("tempo", () => {
  it("converte o instante do banco para a hora de São Paulo", () => {
    expect(localDoBanco("2026-11-07T22:00:00+00:00")).toBe("2026-11-07T19:00:00");
  });
  it("o relógio é o do sistema, três horas antes do UTC", () => {
    expect(agoraLocal(Date.UTC(2026, 10, 17, 12, 30))).toBe("2026-11-17T09:30:00");
  });
});

describe("mapeamento", () => {
  it("a leitura da API vira a da tela, e a urgência ausente entra em faltando (D10)", () => {
    const leitura = leituraDaApi("Pediatra amanhã à noite, Modelo Centro", {
      extracted: {
        unit_id: "u1",
        specialty: "pediatria",
        starts_at: "2026-11-08T19:00:00",
        ends_at: "2026-11-09T07:00:00",
        urgency: null,
      },
      readings: [
        { key: "unit_id", origin: "found", span: { start: 25, end: 38 } },
        { key: "specialty", origin: "found", span: { start: 0, end: 8 } },
        { key: "starts_at", origin: "inferred", span: { start: 9, end: 15 } },
        { key: "ends_at", origin: "inferred", span: null },
        { key: "urgency", origin: "missing", span: null },
      ],
      missing_required: [],
      source: "regras",
      flags: [],
      llm_error: null,
    });
    expect(LeituraSchema.parse(leitura)).toBeTruthy();
    expect(leitura.campos.find((c) => c.chave === "especialidade")).toMatchObject({
      origem: "achei",
      trecho: { inicio: 0, fim: 8 },
    });
    expect(leitura.campos.find((c) => c.chave === "inicio")?.origem).toBe("deduzi");
    expect(leitura.campos.find((c) => c.chave === "urgencia")?.origem).toBe("nao_achei");
    expect(leitura.faltando).toEqual(["urgencia"]);
  });

  it("a vaga do banco ganha o estado da tela e o risco de menos de 24 h", () => {
    const vaga = vagaDoBanco(
      {
        id: "v1",
        specialty: "pediatria",
        starts_at: "2026-11-17T22:00:00+00:00",
        ends_at: "2026-11-18T10:00:00+00:00",
        urgency: "high",
        status: "offered",
        published_at: "2026-11-17T12:00:00+00:00",
        filled_at: null,
        units: { id: "u1", name: "Hospital Modelo Centro", zone: "centro" },
        shift_requests: { raw_text: "Preciso de pediatra" },
      },
      "2026-11-17T10:00:00",
    );
    expect(VagaSchema.parse(vaga)).toBeTruthy();
    expect(vaga.status).toBe("oferta_em_andamento");
    expect(vaga.inicio).toBe("2026-11-17T19:00:00");
    expect(vaga.emRisco).toBe(true);
    expect(vaga.textoOriginal).toBe("Preciso de pediatra");
  });

  it("a recomendação da API vira a da tela, com quem ficou de fora sem o cadastro", () => {
    const resposta: RecomendacaoDaApi = {
      shift_id: "v1",
      model_version: "logreg-v1",
      generated_at: "2026-11-17T09:00:00.123",
      pool_size: 12,
      eligible_count: 7,
      candidates: [
        {
          rank: 1,
          doctor_id: "d0000001-aaaa",
          score: 0.81,
          features: Object.fromEntries(FATORES.map((f) => [f, 1])),
          contributions: Object.fromEntries(FATORES.map((f) => [f, 0.1])),
          alerts: [],
          explanation: {
            text: "Mora perto",
            factors_cited: ["distance_km"],
            source: "template",
          },
          explanation_fallback: null,
        },
      ],
      exclusions: Array.from({ length: 6 }, (_, i) => ({
        doctor_id: `e000000${i}-bbbb`,
        rule_code: "outside_radius",
        rule_text: "Fora do raio",
        evidence: "Mora a 18,2 km; o raio declarado é 15 km.",
      })),
      excluded_by_rule: { outside_radius: 6 },
    };
    const medicos = new Map([
      [
        "d0000001-aaaa",
        {
          id: "d0000001-aaaa",
          pseudonimo: "d0000001",
          nome: "Ana",
          crm: "SIM-SP-1",
          especialidade: "pediatria" as const,
          especialidadeSecundaria: null,
        },
      ],
    ]);
    const recomendacao = recomendacaoDaApi(resposta, medicos, "pediatria");
    expect(RecomendacaoSchema.parse(recomendacao)).toBeTruthy();
    expect(recomendacao.geradaEm).toBe("2026-11-17T09:00:00");
    expect(recomendacao.candidatos[0]?.medico.nome).toBe("Ana");
    expect(recomendacao.exemplosExcluidos).toHaveLength(4);
    expect(recomendacao.exemplosExcluidos[0]?.medico.crm).toBe("Cadastro restrito");
  });

  it("a amostra de excluídos para em 12", () => {
    const regras = ["outside_radius", "unavailable", "schedule_conflict", "rest_violation"];
    const muitos = regras.flatMap((regra) =>
      Array.from({ length: 5 }, (_, i) => ({
        medico: medicoRestrito(`${regra}-${i}`, "pediatria"),
        codigoRegra: regra as "outside_radius",
        textoRegra: regra,
      })),
    );
    expect(amostraDeExcluidos(muitos)).toHaveLength(12);
  });

  it("o estado da decisão traz a exceção e os pulados", () => {
    const estado = estadoDaApi({
      shift_id: "v1",
      approved_doctor_ids: ["d1"],
      decided_by: "a1000000-0000",
      decided_at: "2026-11-17T09:05:00",
      exception: {
        alerts: ["Descanso curto"],
        justification: "Combinado com a direção",
      },
      skipped: ["d2"],
    });
    expect(EstadoDaDecisaoSchema.parse(estado)).toBeTruthy();
    expect(estado.decisao?.excecao?.justificativa).toBe("Combinado com a direção");
    expect(estado.pulados).toEqual(["d2"]);
  });
});

describe("erros da API", () => {
  it("cada código vira a classe que a tela reconhece", () => {
    expect(erroDaApi(422, "justificativa_obrigatoria", "")).toBeInstanceOf(
      JustificativaObrigatoriaError,
    );
    expect(erroDaApi(422, "medico_pulado", "Pulado")).toBeInstanceOf(CandidatoInvalidoError);
    expect(erroDaApi(409, "ja_aprovada", "Já aprovada")).toBeInstanceOf(EstadoInvalidoError);
    expect(erroDaApi(422, "data_fora_da_janela", "Fora")).toBeInstanceOf(EntradaInvalidaError);
    expect(erroDaApi(401, "token_ausente", "")).toBeInstanceOf(SessaoExpiradaError);
  });
});

describe("chamadas", () => {
  it("depois de um 429, espera e tenta de novo", async () => {
    tokensValidos();
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(json(429, { erro: "muitas" }))
      .mockResolvedValueOnce(json(200, { ok: true }));
    await expect(chamarApi(CONFIG, "GET", "/policy")).resolves.toEqual({
      ok: true,
    });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("com 401, renova o token uma vez e repete", async () => {
    tokensValidos();
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(json(401, { erro: "token_ausente" }))
      .mockResolvedValueOnce(
        json(200, {
          access_token: "A2",
          refresh_token: "R2",
          expires_in: 3600,
        }),
      )
      .mockResolvedValueOnce(json(200, { ok: true }));
    await expect(chamarApi(CONFIG, "GET", "/me")).resolves.toEqual({
      ok: true,
    });
    expect(lerTokens()?.acesso).toBe("A2");
    expect(fetch.mock.calls[2]?.[1]?.headers).toMatchObject({
      Authorization: "Bearer A2",
    });
  });

  it("sem resposta, avisa a tela e lança API indisponível (plano B)", async () => {
    tokensValidos();
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("rede"));
    const aviso = vi.fn();
    await expect(
      chamarApi({ ...CONFIG, aoFicarIndisponivel: aviso }, "GET", "/policy"),
    ).rejects.toBeInstanceOf(ApiIndisponivelError);
    expect(aviso).toHaveBeenCalled();
  });

  it("sem login nesta aba, pede para entrar de novo", async () => {
    await expect(chamarApi(CONFIG, "GET", "/policy")).rejects.toBeInstanceOf(SessaoExpiradaError);
  });

  it("o login guarda os tokens só nesta aba", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      json(200, { access_token: "A9", refresh_token: "R9", expires_in: 3600 }),
    );
    await entrarComSenha(CONFIG, " coordenador.demo@plantaoseguro.invalid ", "segredo");
    expect(lerTokens()?.acesso).toBe("A9");
  });

  it("vaga sem urgência não é publicada (D10)", async () => {
    tokensValidos();
    const api = new AdaptadorLive(CONFIG);
    await expect(
      api.confirmarVaga({
        texto: "Pediatra",
        unidadeId: "u1",
        especialidade: "pediatria",
        inicio: "2026-11-18T19:00:00",
        fim: "2026-11-19T07:00:00",
        urgencia: null,
        editados: [],
      }),
    ).rejects.toBeInstanceOf(EntradaInvalidaError);
  });

  it("aprovar manda a justificativa sem o nome do médico", async () => {
    tokensValidos();
    window.sessionStorage.setItem(
      "ps_sugestoes:v1",
      JSON.stringify({
        candidatos: [{ medico: { nome: "Felipe Ferraz Siqueira" } }],
      }),
    );
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(json(200, { action: "oferta_enviada" }))
      .mockResolvedValueOnce(
        json(200, {
          shift_id: "v1",
          approved_doctor_ids: ["d1"],
          decided_by: "a1",
          decided_at: "2026-11-17T09:05:00",
          exception: null,
          skipped: [],
        }),
      );
    const api = new AdaptadorLive(CONFIG);
    const decisao = await api.aprovar({
      vagaId: "v1",
      medicoIds: ["d1"],
      justificativa: "Felipe Ferraz confirmou por telefone",
    });
    const corpo = JSON.parse(String(fetch.mock.calls[0]?.[1]?.body));
    expect(corpo.justification).not.toContain("Felipe");
    expect(decisao.medicoIds).toEqual(["d1"]);
  });
});

describe("rota do sistema", () => {
  const DESTINOS = {
    apiUrl: "https://api.exemplo",
    supabaseUrl: "https://banco.exemplo",
    chaveAnonima: "anonima",
  };
  const id = "e0000000-0000-4000-8000-00000000000a";

  it("deixa passar só as rotas da tela, nunca as internas", async () => {
    const { destinoDe } = await import("./destinos");
    expect(destinoDe(DESTINOS, ["api", "shifts", id, "approve"], "POST", "")?.url).toBe(
      `https://api.exemplo/shifts/${id}/approve`,
    );
    expect(destinoDe(DESTINOS, ["api", "internal", "reload"], "POST", "")).toBeNull();
    expect(destinoDe(DESTINOS, ["api", "shifts", id, "advance"], "POST", "")).toBeNull();
  });

  it("no banco, só leitura e só as tabelas da lista", async () => {
    const { destinoDe } = await import("./destinos");
    expect(destinoDe(DESTINOS, ["banco", "shifts"], "GET", "?select=id")?.url).toBe(
      "https://banco.exemplo/rest/v1/shifts?select=id",
    );
    expect(destinoDe(DESTINOS, ["banco", "shifts"], "POST", "")).toBeNull();
    expect(destinoDe(DESTINOS, ["banco", "shift_compensation"], "GET", "")).toBeNull();
    expect(destinoDe(DESTINOS, ["banco", "profiles"], "GET", "")).toBeNull();
  });

  it("no login, só o token por senha ou renovação", async () => {
    const { destinoDe } = await import("./destinos");
    expect(destinoDe(DESTINOS, ["auth", "token"], "POST", "?grant_type=password")).not.toBeNull();
    expect(destinoDe(DESTINOS, ["auth", "signup"], "POST", "")).toBeNull();
    expect(destinoDe(DESTINOS, ["auth", "token"], "POST", "?grant_type=id_token")).toBeNull();
  });
});
