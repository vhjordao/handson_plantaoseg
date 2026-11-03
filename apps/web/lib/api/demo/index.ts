/**
 * Adaptador `demo` de `PlantaoApi`: roda no navegador, sem rede, sobre as fixtures do pipeline
 * real e com o relógio simulado. Ver `adaptador.ts` e `lib/demo/README.md`.
 */
export { criarApiDemo } from "./adaptador";
export type { OpcoesApiDemo, PlantaoApiDemo } from "./adaptador";
export {
  CandidatoInvalidoError,
  EstadoInvalidoError,
  ForaDaGradeError,
  JustificativaObrigatoriaError,
  MENSAGEM_FORA_DA_GRADE,
  MIN_CARACTERES_JUSTIFICATIVA,
  NaoEncontradoError,
  SemRecomendacaoError,
} from "./erros";
