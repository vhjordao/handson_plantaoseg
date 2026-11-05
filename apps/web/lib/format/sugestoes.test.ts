import { describe, expect, it } from "vitest";
import { chancesParecidas, faixaDeChance, sentidoDoFator, valorDoFator } from "./sugestoes";

describe("faixa de chance", () => {
  it("mostra faixas largas, não o número", () => {
    expect(faixaDeChance(0.75)).toBe("alta");
    expect(faixaDeChance(0.7)).toBe("alta");
    expect(faixaDeChance(0.689)).toBe("media"); // o primeiro da vaga de exemplo
    expect(faixaDeChance(0.5)).toBe("media");
    expect(faixaDeChance(0.49)).toBe("baixa");
  });
});

describe("chances parecidas", () => {
  it("avisa quando a diferença é de até 5 pontos", () => {
    expect(chancesParecidas([0.689, 0.682, 0.669, 0.662, 0.658])).toEqual({ menor: "66%", maior: "69%" });
    expect(chancesParecidas([0.7, 0.65])).toEqual({ menor: "65%", maior: "70%" });
  });

  it("não avisa quando a ordem separa bem os nomes", () => {
    expect(chancesParecidas([0.748, 0.69, 0.653])).toBeNull();
  });

  it("não compara um nome sozinho", () => {
    expect(chancesParecidas([0.7])).toBeNull();
    expect(chancesParecidas([])).toBeNull();
  });
});

describe("valor de cada variável", () => {
  it("escreve como se fala na escala", () => {
    expect(valorDoFator("distance_km", 1.362)).toBe("1,4 km");
    expect(valorDoFator("availability_overlap_hours", 12)).toBe("12 h");
    expect(valorDoFator("acceptance_rate_90d", 0.392)).toBe("39%");
    expect(valorDoFator("attendance_rate_90d", 0.952)).toBe("95%");
    expect(valorDoFator("hours_since_last_shift", 132)).toBe("132 h");
    expect(valorDoFator("specialty_match", 1)).toBe("especialidade principal");
    expect(valorDoFator("specialty_match", 0.5)).toBe("especialidade secundária");
    expect(valorDoFator("night_shift_preference_match", 1)).toBe("prefere o período");
    expect(valorDoFator("night_shift_preference_match", 0)).toBe("não prefere o período");
  });
});

describe("sentido de cada variável", () => {
  it("separa o que ajuda, o que atrapalha e o que não mexe na ordem", () => {
    expect(sentidoDoFator(0.5284)).toBe("favor");
    expect(sentidoDoFator(-0.063)).toBe("contra");
    expect(sentidoDoFator(0)).toBe("neutro");
    expect(sentidoDoFator(0.004)).toBe("neutro");
    expect(sentidoDoFator(-0.004)).toBe("neutro");
  });
});
