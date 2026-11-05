/**
 * Esquemas (Zod) das fixtures do modo `demo`: `mundo.json` e `grade.json`.
 *
 * Os arquivos são gerados por `scripts/exportar_fixtures_web.py` a partir do pipeline real
 * (extração, regras, ranking, explicação e trilha de auditoria de `services/matching-api`) e
 * reaproveitam os tipos do contrato (`lib/api/types.ts`). Aqui só entram os formatos que o
 * contrato não tem: textos de exemplo, indicadores-base, casos de paridade da extração e as
 * `reservas` da cascata.
 */
import { z } from "zod";
import {
  CandidatoSchema,
  DataHoraSchema,
  DecisaoSchema,
  EspecialidadeSchema,
  FichaModeloSchema,
  PersonaSchema,
  PoliticaSchema,
  RecomendacaoSchema,
  RegistroAuditoriaSchema,
  UnidadeSchema,
  UrgenciaSchema,
  VagaSchema,
} from "../api/types";

/** Estilos de texto do gerador sintético (`shift_requests.csv`, coluna `style`). */
export const ESTILOS_DE_TEXTO = [
  "formal",
  "abreviado",
  "com_erros",
  "ambiguo",
  "adversarial",
] as const;

/** Um texto de vaga para clicar na tela "Nova vaga", tirado de `shift_requests.csv`. */
export const ExemploTextoSchema = z.object({
  id: z.string(),
  estilo: z.enum(ESTILOS_DE_TEXTO),
  /** Nome do estilo para a tela ("Formal", "Informal, com erros de digitação"...). */
  rotulo: z.string(),
  texto: z.string(),
  /** `id` da linha de origem em `shift_requests.csv`. */
  solicitacaoId: z.string(),
});
export type ExemploTexto = z.infer<typeof ExemploTextoSchema>;

/** Números de `docs/resultados/metricas-fluxo.json` (simulação) que partem os indicadores. */
export const IndicadoresBaseSchema = z.object({
  /** Fluxo "Regras + modelo", período de teste. */
  tempoMedioFluxoMin: z.number(),
  /** Processo manual simulado, período de teste. */
  tempoMedioManualMin: z.number(),
  pctPreenchidasComAntecedencia24h: z.number(),
  pctPreenchidasComAntecedencia24hManual: z.number(),
  /** Nulo: a aceitação das sugestões pelo coordenador não se mede sem usuários reais. */
  pctSugestoesAceitas: z.number().nullable(),
  fonte: z.string(),
});
export type IndicadoresBase = z.infer<typeof IndicadoresBaseSchema>;

/** Os campos do `ShiftFields` do backend, com os nomes do Python. */
export const CamposDoBackendSchema = z.object({
  unit_id: z.string().nullable(),
  specialty: EspecialidadeSchema.nullable(),
  starts_at: DataHoraSchema.nullable(),
  ends_at: DataHoraSchema.nullable(),
  urgency: UrgenciaSchema.nullable(),
});
export type CamposDoBackend = z.infer<typeof CamposDoBackendSchema>;

/**
 * A saída do `extract()` do Python para um texto, com o relógio da demonstração. O porte em
 * TypeScript (`lib/api/demo/leitura.ts`) precisa repetir `campos`, `source` e `flags`.
 */
export const CasoDeParidadeSchema = z.object({
  texto: z.string(),
  origem: z.enum(["exemplo", "vaga", "amostra", "caso_limite"]),
  campos: CamposDoBackendSchema,
  source: z.enum(["regras", "llm"]),
  flags: z.array(z.string()),
});
export type CasoDeParidade = z.infer<typeof CasoDeParidadeSchema>;

export const MundoSchema = z.object({
  /** O "agora" fixo da demonstração: quinta, 01/10/2026, 9h. */
  agora: DataHoraSchema,
  unidades: z.array(UnidadeSchema),
  politica: PoliticaSchema,
  fichaModelo: FichaModeloSchema,
  indicadoresBase: IndicadoresBaseSchema,
  /** 2 coordenadores e 12 médicos fictícios. */
  personas: z.array(PersonaSchema),
  exemplosTexto: z.array(ExemploTextoSchema),
  /** As seis vagas da demonstração, em todos os estados de tela. */
  vagas: z.array(VagaSchema),
  /** Por `vagaId`; a vaga em rascunho não tem recomendação. */
  recomendacoes: z.record(z.string(), RecomendacaoSchema),
  /**
   * Por `vagaId`: os candidatos das posições 6 a 8, que a lista de 5 do coordenador não traz
   * mas a cascata pode chamar. Dão um "Por que você" real aos médicos persona dessas vagas.
   */
  reservas: z.record(z.string(), z.array(CandidatoSchema)),
  /** Por `vagaId`: decisões já registradas (vagas com oferta em andamento ou preenchidas). */
  decisoes: z.record(z.string(), DecisaoSchema),
  /** A cadeia real do `AuditLog` do Python, com os hashes originais. */
  auditoria: z.array(RegistroAuditoriaSchema),
  paridade: z.array(CasoDeParidadeSchema),
});
export type Mundo = z.infer<typeof MundoSchema>;

/** A recomendação de uma janela da grade: a mesma do contrato, sem `vagaId` (não há vaga ainda). */
export const RecomendacaoDaGradeSchema = RecomendacaoSchema.omit({ vagaId: true });
export type RecomendacaoDaGrade = z.infer<typeof RecomendacaoDaGradeSchema>;

/** Chave: `"{unidadeId}|{especialidade}|{início "AAAA-MM-DDTHH:MM:SS"}"`. */
export const GradeSchema = z.record(z.string(), RecomendacaoDaGradeSchema);
export type Grade = z.infer<typeof GradeSchema>;
