/**
 * Erros de domínio de `PlantaoApi`: qualquer adaptador (`demo` agora, `live` depois) os lança, e
 * a tela os reconhece pela classe, sem saber qual adaptador respondeu. A tela decide o texto
 * final; estas mensagens são o padrão, em português, e dizem o que houve e o que fazer.
 */

export const MENSAGEM_FORA_DA_GRADE =
  "Na demonstração, as sugestões existem para plantões de 12 h (das 7h às 19h ou das 19h às 7h) nos próximos 8 dias.";

/** O plantão não cabe em nenhuma janela da grade de recomendações pré-calculadas. */
export class ForaDaGradeError extends Error {
  constructor() {
    super(MENSAGEM_FORA_DA_GRADE);
    this.name = "ForaDaGradeError";
  }
}

export const MIN_CARACTERES_JUSTIFICATIVA = 10;

/** Aprovar candidato com alerta de jornada exige justificativa escrita (exceção humana). */
export class JustificativaObrigatoriaError extends Error {
  constructor() {
    super(
      `Um dos candidatos tem alerta de jornada. Escreva a justificativa da exceção, com pelo menos ${MIN_CARACTERES_JUSTIFICATIVA} caracteres.`,
    );
    this.name = "JustificativaObrigatoriaError";
  }
}

/** Só se aprova quem foi recomendado e não foi pulado, e pelo menos um candidato. */
export class CandidatoInvalidoError extends Error {
  constructor(mensagem = "Só é possível aprovar candidatos recomendados, e pelo menos um.") {
    super(mensagem);
    this.name = "CandidatoInvalidoError";
  }
}

/** A vaga ou o candidato não existe na demonstração. */
export class NaoEncontradoError extends Error {
  constructor(o_que: string) {
    super(`${o_que} não existe na demonstração.`);
    this.name = "NaoEncontradoError";
  }
}

/** A vaga ainda não tem sugestões (rascunho: faltam campos para consultar a grade). */
export class SemRecomendacaoError extends Error {
  constructor() {
    super("Esta vaga ainda é um rascunho. Complete o início e o fim para ver as sugestões.");
    this.name = "SemRecomendacaoError";
  }
}

/** A ação não cabe no estado atual da vaga (por exemplo, decidir duas vezes). */
export class EstadoInvalidoError extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "EstadoInvalidoError";
  }
}

/** O que a tela enviou não cabe no contrato: texto longo demais, data malformada. */
export class EntradaInvalidaError extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "EntradaInvalidaError";
  }
}

const ERROS_DE_DOMINIO = [
  ForaDaGradeError,
  JustificativaObrigatoriaError,
  CandidatoInvalidoError,
  NaoEncontradoError,
  SemRecomendacaoError,
  EstadoInvalidoError,
  EntradaInvalidaError,
];

/**
 * O texto que a tela mostra para um erro: o do domínio, que diz o que houve e o que fazer, ou o
 * padrão que a tela passa. Um erro de programação nunca chega ao usuário com a mensagem técnica.
 */
export function mensagemDoErro(erro: unknown, padrao: string): string {
  const conhecido = ERROS_DE_DOMINIO.some((Classe) => erro instanceof Classe);
  return conhecido ? (erro as Error).message : padrao;
}
