import type { ContagemOfertas } from "./types";

/**
 * Conta as ofertas feitas no sistema, por médico (D9 do ADR 0015): quantas, para quantos
 * médicos, e a parcela que foi para os 10% de médicos mais ofertados (arredondado para cima, no
 * mínimo um). É contagem do que aconteceu neste sistema, com dados sintéticos; não é simulação.
 */
export function contarOfertas(medicoIds: readonly string[]): ContagemOfertas {
  const porMedico = new Map<string, number>();
  for (const id of medicoIds) porMedico.set(id, (porMedico.get(id) ?? 0) + 1);
  const quantidades = [...porMedico.values()].sort((a, b) => b - a);
  const total = medicoIds.length;
  const topo = Math.max(1, Math.ceil(quantidades.length * 0.1));
  const doTopo = quantidades.slice(0, topo).reduce((soma, n) => soma + n, 0);
  return {
    total,
    medicos: quantidades.length,
    maximoPorMedico: quantidades[0] ?? 0,
    medicosNoTopo: quantidades.length ? topo : 0,
    parcelaDoTopo: total ? doTopo / total : null,
  };
}
