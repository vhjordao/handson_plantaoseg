// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { RegistroAuditoria } from "../types";
import { obterMundo } from "../../demo/mundo";
import {
  GENESIS,
  calcularHash,
  corpoDoRegistro,
  criarRegistro,
  jsonCanonico,
  verificarRegistros,
} from "./auditoria";
import { removerDadosPessoais } from "./privacidade";
import { sha256Hex, sha256PuroHex } from "./sha256";

const mundo = obterMundo();
const semente = (): RegistroAuditoria[] => structuredClone(mundo.auditoria);

/*
 * Vetores gerados pelo Python (`json.dumps(corpo, ensure_ascii=False, sort_keys=True)` e
 * `hashlib.sha256(texto.encode("utf-8")).hexdigest()`), com caracteres que costumam divergir:
 * aspas, quebra de linha, controle (U+001B), DEL, U+2028, emoji, ordem de chaves por ponto de código.
 */
const VETORES: Array<{ corpo: unknown; canonico: string; hash: string }> = [
  {
    corpo: {
      b: [1, 2, { d: true, c: null }],
      a: 1,
      e: 'ação: "ok"\n\t\\ \u001b \u007f   😀 日本',
    },
    canonico:
      '{"a": 1, "b": [1, 2, {"c": null, "d": true}], "e": "ação: \\"ok\\"\\n\\t\\\\ \\u001b \u007f   😀 日本"}',
    hash: "9381363355076be51a6875ae0f75315a0af50ff1e86664b06f02ee0383aa8389",
  },
  {
    corpo: { z: {}, y: [], x: "", w: -5, v: 0, u: 12345678901, t: false },
    canonico: '{"t": false, "u": 12345678901, "v": 0, "w": -5, "x": "", "y": [], "z": {}}',
    hash: "6db4f2bfd05c4a6544decd46927f90ac7d22dafd54ac270c124c5424a996f8d4",
  },
  {
    corpo: {
      seq: 3,
      details: {
        excecao: {
          alertas: ["carga recente alta: 9 plantões nos últimos 30 dias"],
          justificativa: "Cobertura de última hora, plantão 'noturno' — aprovado.",
        },
        mode: "humano",
      },
      prev_hash: "0".repeat(64),
    },
    canonico:
      '{"details": {"excecao": {"alertas": ["carga recente alta: 9 plantões nos últimos 30 dias"], "justificativa": "Cobertura de última hora, plantão \'noturno\' — aprovado."}, "mode": "humano"}, "prev_hash": "0000000000000000000000000000000000000000000000000000000000000000", "seq": 3}',
    hash: "135c8f6a2b0397f5868caf28234d90838413d970a8356231878392fa06e1e067",
  },
  {
    corpo: { Ä: 1, a: 2, Z: 3, é: 4, "10": 5, "9": 6 },
    canonico: '{"10": 5, "9": 6, "Z": 3, "a": 2, "Ä": 1, "é": 4}',
    hash: "cd05d80b345573d798ddcb24e4311c0b8b2340d7af336800d8f7c0ec8027f0c1",
  },
];

describe("JSON canônico idêntico ao do Python", () => {
  for (const [indice, vetor] of VETORES.entries()) {
    it(`vetor ${indice + 1}: mesmo texto e mesmo SHA-256`, async () => {
      expect(jsonCanonico(vetor.corpo)).toBe(vetor.canonico);
      expect(await sha256Hex(vetor.canonico)).toBe(vetor.hash);
    });
  }

  it("recusa o que o Python escreveria diferente: fracionário, indefinido, função", () => {
    expect(() => jsonCanonico({ a: 1.5 })).toThrow(TypeError);
    expect(() => jsonCanonico({ a: 2 ** 60 })).toThrow(TypeError);
    expect(() => jsonCanonico({ a: undefined })).toThrow(TypeError);
    expect(() => jsonCanonico(() => 1)).toThrow(TypeError);
  });
});

describe("SHA-256", () => {
  it("o cálculo em JavaScript confere com a Web Crypto, de vazio a vários blocos", async () => {
    const entradas = ["", "abc", "ação 日本 😀", "a".repeat(55), "a".repeat(56), "b".repeat(64), "c".repeat(1000)];
    for (const entrada of entradas) {
      const puro = sha256PuroHex(new TextEncoder().encode(entrada));
      expect(puro, entrada.slice(0, 12)).toBe(await sha256Hex(entrada));
    }
    expect(sha256PuroHex(new TextEncoder().encode("abc"))).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
});

describe("a cadeia gravada pelo Python", () => {
  it("verifica no TypeScript: os 43 registros da semente e os hashes originais", async () => {
    const trilha = semente();
    expect(trilha.length).toBeGreaterThan(30);
    expect(trilha[0]?.hashAnterior).toBe(GENESIS);
    expect(await verificarRegistros(trilha)).toEqual({
      integra: true,
      registros: trilha.length,
      primeiroInvalido: null,
    });
    for (const registro of trilha) expect(await calcularHash(registro)).toBe(registro.hash);
  });

  it("uma linha adulterada quebra a cadeia, no registro certo", async () => {
    const alterada = semente();
    const alvo = alterada.find((r) => r.acao === "recommendation_approved")!;
    alvo.detalhes = { ...alvo.detalhes, mode: "automatico" };
    expect(await verificarRegistros(alterada)).toEqual({
      integra: false,
      registros: alterada.length,
      primeiroInvalido: alvo.seq,
    });
  });

  it("detecta também troca de hash, de elo, de ator, remoção e troca de ordem", async () => {
    const quebras: Array<[string, (t: RegistroAuditoria[]) => void, number]> = [
      ["hash trocado", (t) => void (t[4]!.hash = "f".repeat(64)), 5],
      ["elo trocado", (t) => void (t[6]!.hashAnterior = GENESIS), 7],
      ["ator trocado", (t) => void (t[2]!.atorPseudoId = "coord-00000000"), 3],
      ["horário trocado", (t) => void (t[1]!.ocorridoEm = "2026-10-01T07:45:00"), 2],
      ["registro removido", (t) => void t.splice(10, 1), 11],
      ["ordem trocada", (t) => void ([t[3], t[4]] = [t[4]!, t[3]!]), 4],
      ["primeiro removido", (t) => void t.shift(), 1],
    ];
    for (const [nome, quebrar, esperado] of quebras) {
      const trilha = semente();
      quebrar(trilha);
      const resultado = await verificarRegistros(trilha);
      expect(resultado.integra, nome).toBe(false);
      expect(resultado.primeiroInvalido, nome).toBe(esperado);
    }
  });

  it("uma trilha vazia é íntegra", async () => {
    expect(await verificarRegistros([])).toEqual({ integra: true, registros: 0, primeiroInvalido: null });
  });
});

describe("novos registros", () => {
  const base = {
    ocorridoEm: "2026-10-01T09:00",
    papelAtor: "coordinator" as const,
    atorPseudoId: "coord-8d9766e0",
    acao: "recommendation_rejected" as const,
    entidadeTipo: "recommendation",
    entidadeId: "vaga-x:medico-y",
    modeloVersao: "logreg-v1",
    detalhes: { rank: 2, reason: null },
  };

  it("continua a cadeia da semente: seq seguinte, elo para o último hash e hash que verifica", async () => {
    const trilha = semente();
    const novo = await criarRegistro(trilha.at(-1), base);
    expect(novo.seq).toBe(trilha.length + 1);
    expect(novo.hashAnterior).toBe(trilha.at(-1)!.hash);
    expect(novo.ocorridoEm).toBe("2026-10-01T09:00:00");
    expect(novo.hash).toBe(await sha256Hex(jsonCanonico(corpoDoRegistro({ ...novo, hash: "" }))));
    expect((await verificarRegistros([...trilha, novo])).integra).toBe(true);
  });

  it("começa do gênese quando a trilha está vazia", async () => {
    const primeiro = await criarRegistro(undefined, base);
    expect(primeiro).toMatchObject({ seq: 1, hashAnterior: GENESIS });
  });

  it("recusa ação e papel desconhecidos e dado pessoal em qualquer nível dos detalhes", async () => {
    await expect(criarRegistro(undefined, { ...base, acao: "apagar" as never })).rejects.toThrow(RangeError);
    await expect(criarRegistro(undefined, { ...base, papelAtor: "admin" as never })).rejects.toThrow(RangeError);
    for (const detalhes of [{ name: "Ana" }, { CRM: "x" }, { a: { phone_sim: "1" } }, { l: [{ email: "e" }] }]) {
      await expect(criarRegistro(undefined, { ...base, detalhes })).rejects.toThrow("dado pessoal");
    }
  });

  it("guarda uma cópia: mudar o objeto de origem não altera o registro", async () => {
    const detalhes = { lista: ["a"] };
    const registro = await criarRegistro(undefined, { ...base, detalhes });
    detalhes.lista.push("b");
    expect(registro.detalhes).toEqual({ lista: ["a"] });
  });
});

describe("textos livres na trilha", () => {
  const nomes = mundo.personas.flatMap((p) => (p.papel === "medico" ? [p.medico.nome] : []));
  const doutor = mundo.personas.find((p) => p.papel === "medico")!;

  it("tira nome (com ou sem acento e caixa), CRM e telefone", () => {
    if (doutor.papel !== "medico") throw new Error("persona de médico esperada");
    const { nome, crm } = doutor.medico;
    const texto = `Aprovo ${nome.toUpperCase()} (${crm}); ligar para +55 00 96822-5309 ou CRM 123456.`;
    const limpo = removerDadosPessoais(texto, nomes);
    expect(limpo).not.toContain(nome.toUpperCase());
    expect(limpo).not.toContain(crm);
    expect(limpo).not.toMatch(/96822|123456/);
    // Sem acento e em minúsculas, para um nome que tem acento.
    const comAcento = nomes.find((n) => n !== n.normalize("NFD").replace(/\p{M}/gu, ""))!;
    const semAcento = comAcento.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
    expect(removerDadosPessoais(`Quem é ${semAcento}?`, nomes)).toBe("Quem é [nome removido]?");
  });

  it("tira o nome em partes e o que vem com o acento em separado (texto colado)", () => {
    const nomes = ["Felipe Ferraz Siqueira", "Olívia Ibarra Nogueira"];
    expect(removerDadosPessoais("Felipe Ferraz fez esse plantão", nomes)).toBe(
      "[nome removido] fez esse plantão",
    );
    expect(removerDadosPessoais("Falei com Siqueira ontem", nomes)).toBe(
      "Falei com [nome removido] ontem",
    );
    expect(removerDadosPessoais("Quem é Olívia?".normalize("NFD"), nomes)).toBe(
      "Quem é [nome removido]?",
    );
    // A parte só vale como palavra inteira, e parte curta não apaga nada.
    expect(removerDadosPessoais("Felipesco e Ferrazópolis", nomes)).toBe("Felipesco e Ferrazópolis");
    expect(removerDadosPessoais("Ana viu a banana", ["Ana Ramos Tavares"])).toBe("Ana viu a banana");
  });

  it("pega CRM em vários formatos, com UF, número e pontos", () => {
    const casos = [
      "CRM 123456",
      "crm-sp 123456",
      "CRM/SP: 123.456",
      "CRM nº 123456",
      "CRM n. 123456",
      "CRM n° 123456",
      "CRM 123456/SP",
      "CRM-SP 123456-SP",
      "SIM-SP-014",
    ];
    for (const caso of casos) {
      expect(removerDadosPessoais(`Chamar ${caso} hoje`)).toBe("Chamar [CRM removido] hoje");
    }
    // A UF só entra quando vem colada ao número; uma palavra depois dele fica.
    expect(removerDadosPessoais("CRM 123456 de plantão")).toBe("[CRM removido] de plantão");
    expect(removerDadosPessoais("o CRM do médico confere")).toBe("o CRM do médico confere");
  });

  it("pega telefone com e sem DDD, e-mail e número de documento", () => {
    const telefones = [
      "+55 11 99999-8888",
      "(11) 99999-8888",
      "11 3333-4444",
      "11999998888",
      "99999-8888",
      "3333 4444",
    ];
    for (const telefone of telefones) {
      expect(removerDadosPessoais(`ligar ${telefone}.`)).toBe("ligar [telefone removido].");
    }
    expect(removerDadosPessoais("escreva para ana.souza@hospital.com.br já")).toBe(
      "escreva para [e-mail removido] já",
    );
    expect(removerDadosPessoais("CPF 123.456.789-09 e CNPJ 12.345.678/0001-95")).toBe(
      "CPF [número removido] e CNPJ [número removido]",
    );
    expect(removerDadosPessoais("protocolo 123456789012")).toBe("protocolo [número removido]");
  });

  it("deixa passar texto comum, datas, horários e intervalos de anos", () => {
    const comum = "Cobertura de última hora para 02/10, das 19h às 7h, plantão de 12 h.";
    expect(removerDadosPessoais(comum, nomes)).toBe(comum);
    expect(removerDadosPessoais("início 2026-10-02T19:00:00", nomes)).toBe("início 2026-10-02T19:00:00");
    expect(removerDadosPessoais("escala de 2025-2026 e 3 plantões em 48 h")).toBe(
      "escala de 2025-2026 e 3 plantões em 48 h",
    );
  });
});
