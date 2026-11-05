/** Textos que aparecem em várias telas. Tudo em português do Brasil, em caixa de frase. */

export const PRODUTO = "PlantãoSeguro";

export const FAIXA_DEMONSTRACAO =
  "Ambiente de demonstração: dados sintéticos, sem validade médica ou legal.";

export const AVISO_DADOS_REAIS = "Não digite dados reais. Tudo aqui é simulação.";

export const REPOSITORIO = "https://github.com/vhjordao/handson_plantaoseg";

/** Caminho do código no GitHub, para o "Como conferir" de cada compromisso. */
export function linkNoRepositorio(caminho: string): string {
  return `${REPOSITORIO}/blob/main/${caminho}`;
}

export const ACOES = {
  entrar: "Entrar",
  entrarNaDemonstracao: "Entrar na demonstração",
  comoFunciona: "Como funciona",
  ajuda: "Ajuda",
  sair: "Sair",
  voltar: "Voltar",
  fechar: "Fechar",
  menu: "Menu",
  pularParaOConteudo: "Pular para o conteúdo",
} as const;

export const VOZES = {
  ia: {
    rotulo: "Sugestão da IA",
    legenda: "Traço tracejado",
    explicacao: "A IA sugeriu e ainda ninguém decidiu.",
  },
  humano: {
    rotulo: "Decisão humana",
    legenda: "Traço contínuo e selo",
    explicacao: "Uma pessoa responsável assumiu a decisão.",
  },
  regra: {
    rotulo: "Regra do sistema",
    legenda: "Cinza, sem destaque",
    explicacao: "Uma regra fixa, igual para todos, que se pode conferir.",
  },
} as const;

export type ChaveVoz = keyof typeof VOZES;
