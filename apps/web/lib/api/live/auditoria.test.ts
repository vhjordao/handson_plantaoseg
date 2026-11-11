import { describe, expect, it } from "vitest";
import linhas from "./__fixtures__/trilha-do-banco.json";
import { hashDoRegistro, horarioDoHash, textoDoHash, verificarTrilhaDoBanco, type RegistroDoBanco } from "./auditoria";

// Linhas reais da trilha do banco (dados sintéticos, só pseudônimos), lidas em 11/11/2026 junto
// com o texto que o próprio Postgres resume no hash (`texto_no_banco`).
const doBanco = linhas as (RegistroDoBanco & { texto_no_banco: string })[];

describe("trilha do sistema real", () => {
  it("monta o mesmo texto que o Postgres resume no hash", () => {
    for (const linha of doBanco) expect(textoDoHash(linha)).toBe(linha.texto_no_banco);
  });

  it("recalcula no navegador o hash gravado pelo banco", async () => {
    for (const linha of doBanco) expect(await hashDoRegistro(linha)).toBe(linha.hash);
  });

  it("converte o horário para UTC com seis casas, sem perder microssegundos", () => {
    expect(horarioDoHash("2026-11-04 19:50:49.004102+00")).toBe("2026-11-04T19:50:49.004102Z");
    expect(horarioDoHash("2026-11-04T19:50:49.0041+00:00")).toBe("2026-11-04T19:50:49.004100Z");
    expect(horarioDoHash("2026-11-04T16:50:49-03:00")).toBe("2026-11-04T19:50:49.000000Z");
  });

  it("confere o começo da cadeia e conta como lacuna o que esta sessão não vê", async () => {
    const tres = doBanco.filter((l) => l.seq <= 3);
    expect(await verificarTrilhaDoBanco(tres)).toEqual({ integra: true, registros: 3, primeiroInvalido: null, lacunas: 0 });
    const resultado = await verificarTrilhaDoBanco(doBanco);
    expect(resultado.integra).toBe(true);
    expect(resultado.lacunas).toBeGreaterThan(0);
  });

  it("acusa o registro alterado", async () => {
    const alterada = doBanco.map((l) => (l.seq === 2 ? { ...l, details_texto: l.details_texto.replace("high", "low") } : l));
    const resultado = await verificarTrilhaDoBanco(alterada);
    expect(resultado).toMatchObject({ integra: false, primeiroInvalido: 2 });
  });
});
