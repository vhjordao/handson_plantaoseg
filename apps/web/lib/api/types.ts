/**
 * Contratos da interface com o backend, em Zod.
 *
 * Espelham `services/matching-api/app` (models, pipeline, rules, explain, audit e
 * llm/guardrails). Os códigos (`clinica_medica`, `high`, `outside_radius`...) são os do
 * backend: o texto em português vive em `lib/copy`, nunca aqui. Onde a tela quer algo que o
 * backend ainda não entrega, o campo é opcional e está marcado "ainda sem backend" (ver o
 * ADR 0014).
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// Vocabulário fechado
// ---------------------------------------------------------------------------

/** Data e hora locais como no backend: "2026-10-02T19:00:00", sem fuso. */
export const DataHoraSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/);
export type DataHora = z.infer<typeof DataHoraSchema>;

/**
 * Tamanho máximo dos textos digitados: o pedido de plantão que a IA lê e os textos livres
 * (justificativa, motivo, comentário). Entrada hostil não deixa a sessão nem a trilha incharem;
 * a tela usa os mesmos números em `maxLength` e no contador de caracteres.
 */
export const LIMITE_TEXTO_VAGA = 2000;
export const LIMITE_TEXTO_LIVRE = 1000;

export const ESPECIALIDADES = ["clinica_medica", "pediatria"] as const; // guardrails.SPECIALTIES
export const EspecialidadeSchema = z.enum(ESPECIALIDADES);
export type Especialidade = z.infer<typeof EspecialidadeSchema>;

export const URGENCIAS = ["low", "medium", "high"] as const; // guardrails.URGENCIES
export const UrgenciaSchema = z.enum(URGENCIAS);
export type Urgencia = z.infer<typeof UrgenciaSchema>;

/** As sete variáveis do ranking: `ranking/features.py::RANKING_FEATURES`. */
export const FATORES = [
  "specialty_match",
  "distance_km",
  "availability_overlap_hours",
  "acceptance_rate_90d",
  "attendance_rate_90d",
  "hours_since_last_shift",
  "night_shift_preference_match",
] as const;
export const FatorSchema = z.enum(FATORES);
export type Fator = z.infer<typeof FatorSchema>;

/** Regras que barram um candidato: `rules.py::RULE_TEXTS`. */
export const CODIGOS_REGRA = [
  "crm_inactive",
  "specialty_mismatch",
  "outside_radius",
  "unavailable",
  "schedule_conflict",
  "continuous_hours_exceeded",
  "rest_violation",
] as const;
export const CodigoRegraSchema = z.enum(CODIGOS_REGRA);
export type CodigoRegra = z.infer<typeof CodigoRegraSchema>;

/**
 * Ações que o backend grava: `audit.py::ACTIONS`. O teste `contrato-backend.test.ts` lê o
 * Python e falha se esta lista e a do backend deixarem de ser iguais.
 */
export const ACOES_AUDITORIA_BACKEND = [
  "shift_published",
  "extraction_confirmed",
  "recommendation_generated",
  "explanation_generated",
  "recommendation_approved",
  "recommendation_rejected",
  "recommendation_restored",
  "explanation_feedback",
  "contestation_opened",
  "contestation_answered",
  "offer_sent",
  "offer_accepted",
  "offer_declined",
  "offer_expired",
  "shift_uncovered",
] as const;
/** Ações do desenho ainda sem backend. Desde a fase 2 (06/11), nenhuma. */
export const ACOES_AUDITORIA_DESENHO = [] as const;
export const AcaoAuditoriaSchema = z.enum([
  ...ACOES_AUDITORIA_BACKEND,
  ...ACOES_AUDITORIA_DESENHO,
]);
export type AcaoAuditoria = z.infer<typeof AcaoAuditoriaSchema>;

// ---------------------------------------------------------------------------
// Pessoas, hospitais e política
// ---------------------------------------------------------------------------

export const UnidadeSchema = z.object({
  id: z.string(),
  nome: z.string(),
  zona: z.string(),
});
export type Unidade = z.infer<typeof UnidadeSchema>;

export const MedicoSchema = z.object({
  /** Pseudônimo estável (UUID do conjunto sintético). */
  id: z.string(),
  /** Oito primeiros caracteres do `id`: o que o telão e a trilha mostram. */
  pseudonimo: z.string(),
  /** `name_sim`: fictício. */
  nome: z.string(),
  /** `crm_sim`, por exemplo "SIM-SP-000083". */
  crm: z.string(),
  especialidade: EspecialidadeSchema,
  especialidadeSecundaria: EspecialidadeSchema.nullable(),
});
export type Medico = z.infer<typeof MedicoSchema>;

/** `policy_config`: limites do hospital. Configuração do projeto, não norma verificada. */
export const PoliticaSchema = z.object({
  maxHorasContinuas: z.number(),
  descansoMinimoHoras: z.number(),
  raioPadraoKm: z.number(),
  ttlOfertaMin: z.number(),
  topK: z.number().int(),
  permiteEspecialidadeSecundaria: z.boolean(),
});
export type Politica = z.infer<typeof PoliticaSchema>;

// ---------------------------------------------------------------------------
// Sessão: login (modo live) ou persona do modo de demonstração
// ---------------------------------------------------------------------------

export const PapelSchema = z.enum(["coordenador", "medico"]);
export type Papel = z.infer<typeof PapelSchema>;

export const PersonaCoordenadorSchema = z.object({
  papel: z.literal("coordenador"),
  id: z.string(),
  pseudoId: z.string(),
  nome: z.string(),
  cargo: z.string(),
  unidade: UnidadeSchema,
});
export const PersonaMedicoSchema = z.object({
  papel: z.literal("medico"),
  id: z.string(),
  medico: MedicoSchema,
});
export const PersonaSchema = z.discriminatedUnion("papel", [
  PersonaCoordenadorSchema,
  PersonaMedicoSchema,
]);
export type Persona = z.infer<typeof PersonaSchema>;

/**
 * O que o cookie de sessão guarda: o papel, a persona e o modo. Nada pessoal. Em `live` (login da
 * demonstração, D1 do ADR 0015), `personaId` é o médico do login, ou nulo para o coordenador; o
 * cookie só guia as rotas, e a API e a RLS conferem o login em toda leitura e escrita.
 */
export const SessaoSchema = z.object({
  papel: PapelSchema,
  personaId: z.string().nullable(),
  modo: z.enum(["demo", "live"]).default("demo"),
});
export type Sessao = z.infer<typeof SessaoSchema>;

// ---------------------------------------------------------------------------
// Vaga e leitura do texto livre
// ---------------------------------------------------------------------------

/** Estados de tela da vaga. `emRisco` é um alerta derivado, não um estado. */
export const StatusVagaSchema = z.enum([
  "rascunho",
  "aguardando_decisao",
  "oferta_em_andamento",
  "preenchida",
  "sem_cobertura",
]);
export type StatusVaga = z.infer<typeof StatusVagaSchema>;

export const VagaSchema = z.object({
  id: z.string(),
  unidade: UnidadeSchema,
  especialidade: EspecialidadeSchema.nullable(),
  inicio: DataHoraSchema.nullable(),
  fim: DataHoraSchema.nullable(),
  urgencia: UrgenciaSchema.nullable(),
  status: StatusVagaSchema,
  emRisco: z.boolean(),
  motivoRisco: z.string().nullable(),
  textoOriginal: z.string(),
  criadaEm: DataHoraSchema,
  preenchidaPor: z.object({ medicoId: z.string(), nome: z.string() }).nullable(),
  tempoAtePreencherMin: z.number().nullable(),
});
export type Vaga = z.infer<typeof VagaSchema>;

export const CHAVES_CAMPO = ["unidade", "especialidade", "inicio", "fim", "urgencia"] as const;
export const ChaveCampoSchema = z.enum(CHAVES_CAMPO);
export type ChaveCampo = z.infer<typeof ChaveCampoSchema>;

/**
 * Um campo lido do texto. `origem` diz de onde veio: "achei" (está escrito no texto),
 * "deduzi" (inferido, por exemplo "noturno" vira 19h às 7h) ou "nao_achei". Não há
 * percentual de confiança: o backend não o fornece e um número inventado seria falsa
 * precisão. `trecho` (posição no texto) é opcional: ainda sem backend.
 */
export const CampoLidoSchema = z.object({
  chave: ChaveCampoSchema,
  /** Valor normalizado: id da unidade, código da especialidade, ISO ou código de urgência. */
  valor: z.string().nullable(),
  origem: z.enum(["achei", "deduzi", "nao_achei"]),
  trecho: z
    .object({ inicio: z.number().int().nonnegative(), fim: z.number().int().nonnegative() })
    .nullish(),
});
export type CampoLido = z.infer<typeof CampoLidoSchema>;

export const LeituraSchema = z.object({
  /** Texto original. É entrada hostil: nunca vai para HTML sem escape. */
  texto: z.string(),
  campos: z.array(CampoLidoSchema),
  /** Chaves obrigatórias em branco (a urgência é opcional): o coordenador completa. */
  faltando: z.array(ChaveCampoSchema),
  fonte: z.enum(["regras", "llm"]),
  /** Códigos de `guardrails.detect_injection`; se houver algum, a IA não leu o texto. */
  sinais: z.array(z.string()),
  /** `llm_error` do backend: "llm_indisponivel" ou o código do guardrail. */
  erroIA: z.string().nullable(),
});
export type Leitura = z.infer<typeof LeituraSchema>;

export const ConfirmarVagaInputSchema = z.object({
  texto: z.string().max(LIMITE_TEXTO_VAGA),
  unidadeId: z.string(),
  especialidade: EspecialidadeSchema,
  inicio: DataHoraSchema,
  fim: DataHoraSchema,
  urgencia: UrgenciaSchema.nullable(),
  /** Chaves que a pessoa corrigiu em relação ao que a IA leu. */
  editados: z.array(ChaveCampoSchema),
  /** O rascunho que esta publicação conclui: ele sai da lista de vagas. */
  rascunhoId: z.string().optional(),
});
export type ConfirmarVagaInput = z.infer<typeof ConfirmarVagaInputSchema>;

/** Um pedido de exemplo para clicar na tela "Nova vaga". */
export const ExemploDeVagaSchema = z.object({
  id: z.string(),
  /** Nome do estilo ("Formal", "Ambíguo"...). */
  rotulo: z.string(),
  texto: z.string(),
});
export type ExemploDeVaga = z.infer<typeof ExemploDeVagaSchema>;

// ---------------------------------------------------------------------------
// Recomendação (a ordem sugerida)
// ---------------------------------------------------------------------------

export const ExplicacaoSchema = z.object({
  texto: z.string(),
  fatoresCitados: z.array(FatorSchema),
  /** "template": montado por regra a partir dos fatores. "llm": reescrito pela IA. */
  fonte: z.enum(["template", "llm"]),
});
export type Explicacao = z.infer<typeof ExplicacaoSchema>;

export const CandidatoSchema = z.object({
  posicao: z.number().int().min(1),
  medico: MedicoSchema,
  /** Probabilidade estimada de aceitar (0 a 1). A tela mostra faixa; o número fica em "Ver motivos". */
  score: z.number().min(0).max(1),
  /** Valor de cada variável do ranking para este candidato. */
  fatores: z.record(FatorSchema, z.number()),
  /** Contribuição de cada variável em relação à média dos elegíveis (positiva ou negativa). */
  contribuicoes: z.record(FatorSchema, z.number()),
  /** Alertas de jornada e de carga, no texto do backend (`rules.py`, `pipeline.py`). */
  alertas: z.array(z.string()),
  explicacao: ExplicacaoSchema,
  /** Código do guardrail se a reescrita da IA foi tentada e não valeu. */
  motivoFallback: z.string().nullable(),
  /**
   * Rodízio entre equivalentes (passo 7.2): só quando o nome mudou de lugar em relação ao modelo.
   * O modo de demonstração não tem histórico de indicações, então não usa.
   */
  rodizio: z.object({ posicaoDoModelo: z.number().int().min(1), indicacoesNaSemana: z.number().int().min(0) }).nullish(),
});
export type Candidato = z.infer<typeof CandidatoSchema>;

export const ExclusaoSchema = z.object({
  medico: MedicoSchema,
  codigoRegra: CodigoRegraSchema,
  /** `RULE_TEXTS`, no texto do backend. */
  textoRegra: z.string(),
  /** A evidência numérica da regra ("mora a 18,2 km; o raio declarado é 15 km"). Opcional. */
  evidencia: z.string().nullish(),
});
export type Exclusao = z.infer<typeof ExclusaoSchema>;

export const RecomendacaoSchema = z.object({
  vagaId: z.string(),
  /**
   * `pipeline.shift_key`: identificador estável da vaga ainda não publicada. No `live` a API
   * usa o id da vaga publicada, então ele passa a ser igual a `vagaId`.
   */
  chave: z.string(),
  modeloVersao: z.string(),
  geradaEm: DataHoraSchema,
  totalPool: z.number().int(),
  totalElegiveis: z.number().int(),
  candidatos: z.array(CandidatoSchema),
  exclusoesPorRegra: z.partialRecord(CodigoRegraSchema, z.number().int()),
  exemplosExcluidos: z.array(ExclusaoSchema),
});
export type Recomendacao = z.infer<typeof RecomendacaoSchema>;

export const FichaModeloSchema = z.object({
  versao: z.string(),
  tipo: z.string(),
  treinadoCom: z.string(),
  variaveisUsadas: z.array(z.object({ fator: FatorSchema, peso: z.number() })),
  variaveisNaoUsadas: z.array(z.object({ nome: z.string(), motivo: z.string() })),
  metricas: z.array(z.object({ nome: z.string(), valor: z.string() })),
  classeDeRisco: z.object({ preliminar: z.string(), observacao: z.string() }),
  limites: z.array(z.string()),
});
export type FichaModelo = z.infer<typeof FichaModeloSchema>;

// ---------------------------------------------------------------------------
// Decisão humana
// ---------------------------------------------------------------------------

export const AprovarInputSchema = z.object({
  vagaId: z.string(),
  /** Quem receberá a oferta, na ordem em que o coordenador confirmou. Só recomendados. */
  medicoIds: z.array(z.string()).min(1),
  /** Obrigatória quando algum aprovado tem alerta de jornada (exceção humana). */
  justificativa: z.string().max(LIMITE_TEXTO_LIVRE).optional(),
});
export type AprovarInput = z.infer<typeof AprovarInputSchema>;

export const DecisaoSchema = z.object({
  id: z.string(),
  vagaId: z.string(),
  medicoIds: z.array(z.string()),
  decididoPor: z.object({ pseudoId: z.string(), nome: z.string(), cargo: z.string() }),
  em: DataHoraSchema,
  excecao: z.object({ alertas: z.array(z.string()), justificativa: z.string() }).nullable(),
});
export type Decisao = z.infer<typeof DecisaoSchema>;

export const PularInputSchema = z.object({
  vagaId: z.string(),
  medicoId: z.string(),
  motivo: z.string().max(LIMITE_TEXTO_LIVRE).optional(),
});
export type PularInput = z.infer<typeof PularInputSchema>;

export const DesfazerPuloInputSchema = PularInputSchema.pick({ vagaId: true, medicoId: true });
export type DesfazerPuloInput = z.infer<typeof DesfazerPuloInputSchema>;

/** O que já foi decidido na vaga, para a tela voltar igual depois de recarregar. */
export const EstadoDaDecisaoSchema = z.object({
  decisao: DecisaoSchema.nullable(),
  /** `id` de quem a pessoa pulou: esses nomes voltam marcados e não podem ser aprovados. */
  pulados: z.array(z.string()),
});
export type EstadoDaDecisao = z.infer<typeof EstadoDaDecisaoSchema>;

export const FeedbackExplicacaoInputSchema = z.object({
  vagaId: z.string(),
  medicoId: z.string(),
  ajudou: z.boolean(),
  comentario: z.string().max(LIMITE_TEXTO_LIVRE).optional(),
});
export type FeedbackExplicacaoInput = z.infer<typeof FeedbackExplicacaoInputSchema>;

// ---------------------------------------------------------------------------
// Oferta, cascata e contestação (UI-2; ainda sem backend)
// ---------------------------------------------------------------------------

export const StatusOfertaSchema = z.enum([
  "na_fila",
  "aberta",
  "aceita",
  "recusada",
  "expirada",
  "cancelada",
]);
export type StatusOferta = z.infer<typeof StatusOfertaSchema>;

export const OfertaSchema = z.object({
  id: z.string(),
  vagaId: z.string(),
  medico: MedicoSchema,
  sequencia: z.number().int().min(1),
  status: StatusOfertaSchema,
  enviadaEm: DataHoraSchema.nullable(),
  expiraEm: DataHoraSchema.nullable(),
  respondidaEm: DataHoraSchema.nullable(),
  ttlMin: z.number(),
  motivoRecusa: z.string().nullable(),
  vaga: z.object({
    unidade: UnidadeSchema,
    especialidade: EspecialidadeSchema,
    inicio: DataHoraSchema,
    fim: DataHoraSchema,
    urgencia: UrgenciaSchema.nullable(),
    distanciaKm: z.number().nullable(),
  }),
  /** "Por que você": a mesma explicação que o coordenador viu. */
  porQue: ExplicacaoSchema,
  fatores: z.record(FatorSchema, z.number()),
  contribuicoes: z.record(FatorSchema, z.number()),
  alertas: z.array(z.string()),
});
export type Oferta = z.infer<typeof OfertaSchema>;

export const CascataSchema = z.object({
  vagaId: z.string(),
  ofertas: z.array(OfertaSchema),
  /** Id da oferta aberta agora, se houver. */
  atualId: z.string().nullable(),
});
export type Cascata = z.infer<typeof CascataSchema>;

export const RespostaOfertaInputSchema = z.object({
  ofertaId: z.string(),
  resposta: z.enum(["aceitar", "recusar"]),
  motivo: z.string().max(LIMITE_TEXTO_LIVRE).optional(),
});
export type RespostaOfertaInput = z.infer<typeof RespostaOfertaInputSchema>;

export const MOTIVOS_CONTESTACAO = [
  "dado_errado",
  "motivo_nao_faz_sentido",
  "ordem_injusta",
  "outro",
] as const;
export const MotivoContestacaoSchema = z.enum(MOTIVOS_CONTESTACAO);
export type MotivoContestacao = z.infer<typeof MotivoContestacaoSchema>;

export const ContestarInputSchema = z.object({
  ofertaId: z.string(),
  motivo: MotivoContestacaoSchema,
  texto: z.string().min(1).max(LIMITE_TEXTO_LIVRE),
});
export type ContestarInput = z.infer<typeof ContestarInputSchema>;

export const ContestacaoSchema = z.object({
  id: z.string(),
  protocolo: z.string(),
  ofertaId: z.string(),
  vagaId: z.string(),
  medico: MedicoSchema,
  motivo: MotivoContestacaoSchema,
  texto: z.string(),
  criadaEm: DataHoraSchema,
  status: z.enum(["aberta", "respondida"]),
  recomendacao: z.object({ posicao: z.number().int(), explicacao: ExplicacaoSchema }),
  resposta: z
    .object({ texto: z.string(), porNome: z.string(), em: DataHoraSchema })
    .nullable(),
});
export type Contestacao = z.infer<typeof ContestacaoSchema>;

// ---------------------------------------------------------------------------
// Auditoria e indicadores
// ---------------------------------------------------------------------------

/** Uma linha da trilha: `audit.py`. Só pseudônimos; nunca nome, CRM ou telefone. */
export const RegistroAuditoriaSchema = z.object({
  seq: z.number().int().min(1),
  ocorridoEm: DataHoraSchema,
  papelAtor: z.enum(["coordinator", "doctor", "system"]),
  atorPseudoId: z.string(),
  acao: AcaoAuditoriaSchema,
  entidadeTipo: z.string(),
  entidadeId: z.string(),
  modeloVersao: z.string().nullable(),
  detalhes: z.record(z.string(), z.unknown()),
  hashAnterior: z.string(),
  hash: z.string(),
});
export type RegistroAuditoria = z.infer<typeof RegistroAuditoriaSchema>;

export const VerificacaoCadeiaSchema = z.object({
  integra: z.boolean(),
  registros: z.number().int(),
  /** `seq` do primeiro registro que não confere, se houver. */
  primeiroInvalido: z.number().int().nullable(),
});
export type VerificacaoCadeia = z.infer<typeof VerificacaoCadeiaSchema>;

export const IndicadoresSchema = z.object({
  /** Sempre "simulado": os números vêm de `docs/resultados/metricas-fluxo.md` e dos eventos da demonstração. */
  rotulo: z.literal("simulado"),
  tempoMedioAtePreencherMin: z.number(),
  pctPreenchidasComAntecedencia24h: z.number(),
  pctSugestoesAceitas: z.number().nullable(),
  /** O processo manual simulado, nas mesmas vagas de teste: é o "contra X" que o painel mostra. */
  linhaDeBase: z
    .object({
      tempoMedioAtePreencherMin: z.number(),
      pctPreenchidasComAntecedencia24h: z.number(),
    })
    .nullish(),
  vagasPublicadas: z.number().int(),
  decisoesHumanas: z.number().int(),
  aceites: z.number().int(),
  fonte: z.string(),
});
export type Indicadores = z.infer<typeof IndicadoresSchema>;

// ---------------------------------------------------------------------------
// Eventos (barramento do `demo`; no `live`, consulta a cada 3 s, ADR 0015, D7)
// ---------------------------------------------------------------------------

export type EventoPlantao =
  | { tipo: "vaga_publicada"; vagaId: string; em: DataHora }
  | { tipo: "recomendacao_gerada"; vagaId: string; em: DataHora }
  | { tipo: "decisao_registrada"; vagaId: string; medicoIds: string[]; em: DataHora }
  | { tipo: "oferta_enviada"; ofertaId: string; vagaId: string; medicoId: string; em: DataHora }
  | {
      tipo: "oferta_respondida";
      ofertaId: string;
      vagaId: string;
      status: StatusOferta;
      em: DataHora;
    }
  | { tipo: "vaga_preenchida"; vagaId: string; medicoId: string; em: DataHora }
  | { tipo: "contestacao_aberta"; contestacaoId: string; em: DataHora }
  | { tipo: "contestacao_respondida"; contestacaoId: string; em: DataHora };
