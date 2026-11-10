/**
 * Rótulos em português para os códigos do backend (`lib/api/types.ts`).
 * Os textos das regras são os de `services/matching-api/app/rules.py` (`RULE_TEXTS`).
 */
import type {
  ChaveCampo,
  CodigoRegra,
  Especialidade,
  Fator,
  MotivoContestacao,
  MotivoRecusa,
  StatusOferta,
  StatusVaga,
  Urgencia,
} from "@/lib/api/types";

export const ROTULO_ESPECIALIDADE: Record<Especialidade, string> = {
  clinica_medica: "Clínica médica",
  pediatria: "Pediatria",
};

export const ROTULO_URGENCIA: Record<Urgencia, string> = {
  low: "baixa",
  medium: "média",
  high: "alta",
};

export const ROTULO_STATUS_VAGA: Record<StatusVaga, string> = {
  rascunho: "Rascunho",
  aguardando_decisao: "Aguardando sua decisão",
  oferta_em_andamento: "Oferta em andamento",
  preenchida: "Preenchida",
  sem_cobertura: "Sem cobertura",
};

export const ROTULO_STATUS_OFERTA: Record<StatusOferta, string> = {
  na_fila: "Na fila",
  aberta: "Aberta",
  aceita: "Aceita",
  recusada: "Recusada",
  expirada: "Expirada",
  cancelada: "Cancelada",
};

/** Os quatro motivos de recusa (D4), ditos para o médico. */
export const ROTULO_MOTIVO_RECUSA: Record<MotivoRecusa, string> = {
  distancia: "Distância",
  cansaco: "Cansaço",
  agenda: "Agenda",
  outro: "Outro motivo",
};

export const ROTULO_MOTIVO_CONTESTACAO: Record<MotivoContestacao, string> = {
  dado_errado: "Um dado sobre mim está errado",
  motivo_nao_faz_sentido: "O motivo não faz sentido",
  ordem_injusta: "A ordem me parece injusta",
  outro: "Outro motivo",
};

export const ROTULO_REGRA: Record<CodigoRegra, string> = {
  crm_inactive: "CRM não está ativo",
  specialty_mismatch: "Especialidade diferente da vaga",
  outside_radius: "Fora do raio de deslocamento do médico",
  unavailable: "Sem disponibilidade declarada para o horário da vaga",
  schedule_conflict: "Já tem plantão no mesmo horário",
  continuous_hours_exceeded: "Passaria do limite de horas contínuas",
  rest_violation: "Descanso mínimo entre plantões não respeitado",
};

export const ROTULO_FATOR: Record<Fator, string> = {
  specialty_match: "Especialidade da vaga",
  distance_km: "Distância até o hospital",
  availability_overlap_hours: "Disponibilidade para o horário",
  acceptance_rate_90d: "Aceite nas ofertas dos últimos 90 dias",
  attendance_rate_90d: "Comparecimento nos últimos 90 dias",
  hours_since_last_shift: "Descanso desde o último plantão",
  night_shift_preference_match: "Preferência pelo período",
};

export const ROTULO_CAMPO: Record<ChaveCampo, string> = {
  unidade: "Hospital",
  especialidade: "Especialidade",
  inicio: "Início",
  fim: "Fim",
  urgencia: "Urgência",
};

export const ROTULO_ORIGEM_CAMPO = {
  achei: "Está no texto",
  deduzi: "Calculado do texto",
  nao_achei: "Não está no texto",
} as const;
