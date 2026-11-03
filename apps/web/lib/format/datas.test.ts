// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  comUnidade,
  formatarAgora,
  formatarDia,
  formatarHora,
  formatarIntervalo,
  formatarNumero,
  formatarPercentual,
} from "./datas";

describe("datas e horas em português", () => {
  it("escreve o relógio de parede sem deslocar o fuso", () => {
    expect(formatarHora("2026-10-02T19:00:00")).toBe("19h");
    expect(formatarHora("2026-10-03T07:00:00")).toBe("7h");
    expect(formatarHora("2026-10-01T09:12:00")).toBe("9h12");
  });

  it("escreve o dia da semana e a data", () => {
    expect(formatarDia("2026-10-02T19:00:00")).toBe("sexta, 02/10");
    expect(formatarDia("2026-10-03T07:00:00")).toBe("sábado, 03/10");
    expect(formatarAgora("2026-10-01T09:00:00")).toBe("quinta, 01/10, 9h");
  });

  it("escreve o intervalo do plantão que passa da meia-noite", () => {
    expect(formatarIntervalo("2026-10-02T19:00:00", "2026-10-03T07:00:00")).toBe(
      "sexta, 02/10, 19h às 7h",
    );
  });

  it("aceita a data sem segundos", () => {
    expect(formatarHora("2026-10-02T19:00")).toBe("19h");
  });
});

describe("números em português", () => {
  it("usa vírgula decimal e espaço não separável antes da unidade", () => {
    expect(formatarNumero(1.4)).toBe("1,4");
    expect(comUnidade(1.4, "km")).toBe("1,4 km");
    expect(comUnidade(12, "h", 0)).toBe("12 h");
  });

  it("escreve a fração como percentual inteiro", () => {
    expect(formatarPercentual(0.69)).toBe("69%");
  });
});
