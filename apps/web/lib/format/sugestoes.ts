/**
 * Como a ordem sugerida vira texto na tela: a faixa de chance, o aviso de chances parecidas e o
 * valor de cada variável. Nada aqui muda a ordem; é só como ela é lida.
 */
import type { Fator } from "@/lib/api/types";
import { comUnidade, formatarInteiro, formatarPercentual } from "./datas";

export type FaixaDeChance = "alta" | "media" | "baixa";

/**
 * Faixas largas de propósito: o número sugere uma precisão que uma simulação não tem (prompt de
 * frontend, 9.3). Os cortes são redondos, são escolha da interface e não vêm do modelo.
 */
export function faixaDeChance(score: number): FaixaDeChance {
  if (score >= 0.7) return "alta";
  return score >= 0.5 ? "media" : "baixa";
}

export const ROTULO_FAIXA_DE_CHANCE: Record<FaixaDeChance, string> = {
  alta: "Chance alta",
  media: "Chance média",
  baixa: "Chance baixa",
};

/** Até esta diferença, em pontos percentuais, a ordem entre os nomes é uma sugestão fraca. */
const DIFERENCA_DE_CHANCES_PARECIDAS = 5;

/**
 * Quando os nomes têm chances parecidas, a tela avisa que a ordem entre eles é fraca, para ela
 * não parecer mais certa do que é. Sem pelo menos dois nomes, não há o que comparar.
 */
export function chancesParecidas(scores: readonly number[]): { menor: string; maior: string } | null {
  if (scores.length < 2) return null;
  const emPontos = scores.map((score) => Math.round(score * 100));
  const menor = Math.min(...emPontos);
  const maior = Math.max(...emPontos);
  if (maior - menor > DIFERENCA_DE_CHANCES_PARECIDAS) return null;
  return { menor: `${formatarInteiro(menor)}%`, maior: `${formatarInteiro(maior)}%` };
}

/** O valor de uma variável do jeito que se fala na escala: "1,4 km", "95%", "prefere o período". */
export function valorDoFator(fator: Fator, valor: number): string {
  switch (fator) {
    case "specialty_match":
      return valor >= 1 ? "especialidade principal" : "especialidade secundária";
    case "distance_km":
      return comUnidade(valor, "km");
    case "availability_overlap_hours":
      return comUnidade(valor, "h", 0);
    case "acceptance_rate_90d":
    case "attendance_rate_90d":
      return formatarPercentual(valor);
    case "hours_since_last_shift":
      return comUnidade(valor, "h", 0);
    case "night_shift_preference_match":
      return valor >= 1 ? "prefere o período" : "não prefere o período";
  }
}

/** Abaixo disto, a variável não chega a mexer na ordem: mostrar uma barra seria falsa precisão. */
const CONTRIBUICAO_NEUTRA = 0.005;

export type SentidoDoFator = "favor" | "contra" | "neutro";

export function sentidoDoFator(contribuicao: number): SentidoDoFator {
  if (Math.abs(contribuicao) < CONTRIBUICAO_NEUTRA) return "neutro";
  return contribuicao > 0 ? "favor" : "contra";
}
