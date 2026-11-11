/**
 * Os números da tela de equidade (6.3). Todos vêm de experimentos com dados sintéticos e ficam
 * aqui copiados, com a fonte ao lado, para a tela não depender de um arquivo fora do site. Se um
 * experimento for refeito, estes valores mudam junto (D9 e D11 do ADR 0015).
 */

export const FONTES = {
  concentracao: "docs/resultados/metricas-concentracao.md",
  ranking: "docs/resultados/metricas-ranking.md",
  robustez: "docs/resultados/metricas-robustez.md",
  rodizio: "docs/adr/0017-rodizio-entre-equivalentes-na-api.md",
} as const;

/** 392 vagas de teste, 100 repetições por vaga. Parcelas de 0 a 1. */
export const CONCENTRACAO = {
  vagasDeTeste: 392,
  /** Os 10% de médicos mais expostos: que parcela das ofertas recebem (estimativa superior). */
  ofertasDosMaisExpostos: { manual: 0.311, soModelo: 0.821, comRodizio: 0.357 },
  /** Que parcela dos lugares do top-5 eles ocupam. */
  top5DosMaisExpostos: { soModelo: 0.507, comRodizio: 0.285 },
  /** Elegíveis que nunca aparecem no top-5. */
  nuncaAparecem: { soModelo: 0.471, comRodizio: 0.265 },
  /** O custo do rodízio. */
  chanceTop5: { soModelo: 0.712, comRodizio: 0.694 },
  tempoMedioMin: { soModelo: 47, comRodizio: 49, manual: 110 },
  /** Critério C5 da Entrega 3: 35% ou menos das ofertas com os 10% mais ofertados. */
  metaC5: 0.35,
} as const;

/** Participação no top-5 dividida pela participação entre os elegíveis (1,00 = proporcional). */
export const DISPARIDADE = [
  { atributo: "Gênero", grupo: "Feminino", elegiveis: 0.47, razaoModelo: 1.2, razaoBaseline: 1.37 },
  { atributo: "Gênero", grupo: "Masculino", elegiveis: 0.53, razaoModelo: 0.83, razaoBaseline: 0.67 },
  { atributo: "Faixa etária", grupo: "25 a 34", elegiveis: 0.252, razaoModelo: 1.13, razaoBaseline: 0.83 },
  { atributo: "Faixa etária", grupo: "35 a 44", elegiveis: 0.345, razaoModelo: 0.83, razaoBaseline: 0.79 },
  { atributo: "Faixa etária", grupo: "45 a 54", elegiveis: 0.261, razaoModelo: 0.92, razaoBaseline: 1.29 },
  { atributo: "Faixa etária", grupo: "55 ou mais", elegiveis: 0.142, razaoModelo: 1.34, razaoBaseline: 1.29 },
  { atributo: "Zona de residência", grupo: "Centro", elegiveis: 0.386, razaoModelo: 0.87, razaoBaseline: 0.79 },
  { atributo: "Zona de residência", grupo: "Leste", elegiveis: 0.131, razaoModelo: 0.01, razaoBaseline: 0 },
  { atributo: "Zona de residência", grupo: "Norte", elegiveis: 0.176, razaoModelo: 1.66, razaoBaseline: 1.83 },
  { atributo: "Zona de residência", grupo: "Oeste", elegiveis: 0.105, razaoModelo: 0.01, razaoBaseline: 0.11 },
  { atributo: "Zona de residência", grupo: "Sul", elegiveis: 0.203, razaoModelo: 1.82, razaoBaseline: 1.78 },
] as const;

/** A base sintética contra o cenário calibrado com a Demografia Médica no Brasil 2025 (D11). */
export const CALIBRADO = {
  fonte: "Demografia Médica no Brasil 2025, tabelas 3, 7 e 8 (totais nacionais de dezembro de 2024)",
  linhas: [
    { medida: "Redução do tempo contra o manual", base: "57%", calibrado: "55%" },
    { medida: "Chance de sucesso do top-5 (modelo)", base: "71,2%", calibrado: "69,7%" },
    { medida: "Lugares do top-5 com os 10% mais chamados", base: "51%", calibrado: "51%" },
  ],
  publicos: [
    { dado: "Mulheres na pediatria", amostra: "46,1%", estudo: "76,8%" },
    { dado: "Médicos com 55 anos ou mais", amostra: "14,0%", estudo: "26,8%" },
  ],
} as const;
