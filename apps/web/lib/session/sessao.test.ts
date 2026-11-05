// @vitest-environment node
import { describe, expect, it } from "vitest";
import { destinoSeguro, lerSessaoDoValor, ROTA_INICIAL } from "./sessao";

describe("lerSessaoDoValor", () => {
  it("lê o cookie de cada papel", () => {
    expect(lerSessaoDoValor('{"papel":"coordenador","personaId":"coord-1"}')).toEqual({
      papel: "coordenador",
      personaId: "coord-1",
    });
    expect(lerSessaoDoValor('{"papel":"medico","personaId":"med-7"}')).toEqual({
      papel: "medico",
      personaId: "med-7",
    });
    expect(lerSessaoDoValor('{"papel":"telao","personaId":null}')).toEqual({
      papel: "telao",
      personaId: null,
    });
  });

  it("trata cookie ausente, quebrado ou de outro formato como sem sessão", () => {
    const invalidos = [
      undefined,
      "",
      "não é json",
      "{",
      "null",
      "[]",
      '"coordenador"',
      "{}",
      '{"papel":"admin","personaId":"x"}',
      '{"papel":"medico"}',
      '{"papel":"medico","personaId":7}',
    ];
    for (const valor of invalidos) expect(lerSessaoDoValor(valor)).toBeNull();
  });

  it("descarta campos que não são da sessão", () => {
    const sessao = lerSessaoDoValor('{"papel":"medico","personaId":"med-7","admin":true}');
    expect(sessao).toEqual({ papel: "medico", personaId: "med-7" });
  });
});

describe("destinoSeguro", () => {
  it("volta para a rota pedida quando ela é do mesmo papel", () => {
    expect(destinoSeguro("/coordenador/vagas/nova", "coordenador")).toBe("/coordenador/vagas/nova");
    expect(destinoSeguro("/coordenador", "coordenador")).toBe("/coordenador");
    expect(destinoSeguro("/coordenador?filtro=risco", "coordenador")).toBe("/coordenador?filtro=risco");
    expect(destinoSeguro("/medico/ofertas", "medico")).toBe("/medico/ofertas");
  });

  it("cai na rota inicial do papel quando falta o destino", () => {
    for (const papel of ["coordenador", "medico", "telao"] as const) {
      expect(destinoSeguro(undefined, papel)).toBe(ROTA_INICIAL[papel]);
      expect(destinoSeguro(null, papel)).toBe(ROTA_INICIAL[papel]);
      expect(destinoSeguro("", papel)).toBe(ROTA_INICIAL[papel]);
    }
  });

  it("não deixa o parâmetro `de` virar redirecionamento aberto nem trocar de papel", () => {
    const hostis = [
      "//exemplo.com/coordenador/vagas",
      "https://exemplo.com/coordenador",
      "/\\exemplo.com",
      "/medico/ofertas", // rota de outro papel
      "/coordenadorx",
      "/coordenador-outro",
      "coordenador/vagas",
      "javascript:alert(1)",
      " /coordenador/vagas",
    ];
    for (const de of hostis) {
      expect(destinoSeguro(de, "coordenador")).toBe(ROTA_INICIAL.coordenador);
    }
    expect(destinoSeguro("/coordenador/vagas", "medico")).toBe(ROTA_INICIAL.medico);
  });
});
