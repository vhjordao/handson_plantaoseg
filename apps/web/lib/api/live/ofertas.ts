/**
 * Ofertas, cascata e contestações do sistema real (fase 4 do roteiro), do formato do banco para o
 * contrato da tela. Funções puras: os testes as conferem sem rede.
 *
 * O banco só guarda as ofertas já enviadas. Quem a coordenação aprovou e ainda não foi chamado
 * vem da decisão (`/shifts/{id}/decision`) e aparece "na fila". O prazo vem de `sent_at` e de
 * `ttl_minutes`: uma oferta pendente com o prazo vencido já é "expirada" na tela, mesmo antes de o
 * n8n pedir à API que chame o próximo.
 */
import { lerDataHora, somarMinutos } from "../demo/datas";
import {
  FATORES,
  type Cascata,
  type Contestacao,
  type DataHora,
  type Explicacao,
  type Fator,
  type Medico,
  type MotivoContestacao,
  type MotivoRecusa,
  type Oferta,
  type StatusOferta,
} from "../types";
import { medicoRestrito, unidadeDoBanco } from "./mapeamento";
import { localDoBanco } from "./tempo";

// --- Formatos do banco e da API ----------------------------------------------------------------

export type MotivoRecusaDaApi = "distance" | "fatigue" | "schedule" | "other";
export type MotivoContestacaoDaApi = "wrong_data" | "explanation_unclear" | "unfair_order" | "other";

export interface VagaDaOfertaDoBanco {
  id: string;
  specialty: string;
  starts_at: string;
  ends_at: string;
  urgency: string | null;
  status: string;
  units: { id: string; name: string; zone: string } | null;
}

export interface OfertaDoBanco {
  id: string;
  shift_id: string;
  doctor_id: string;
  sequence_no: number;
  sent_at: string;
  ttl_minutes: number;
  responded_at: string | null;
  response: "pending" | "accepted" | "declined" | "expired";
  decline_reason: MotivoRecusaDaApi | null;
  shifts: VagaDaOfertaDoBanco | null;
}

/** A recomendação de um médico numa vaga, com o texto do "Por que você". */
export interface RecomendacaoDoMedico {
  doctor_id: string;
  shift_id: string;
  rank: number;
  features: Record<string, number>;
  contributions: Record<string, number>;
  alerts: string[];
  explicacao: Explicacao | null;
}

export interface ContestacaoDoBanco {
  id: string;
  protocol: string;
  offer_id: string;
  shift_id: string;
  doctor_id: string;
  reason: MotivoContestacaoDaApi;
  text: string;
  status: "open" | "answered";
  answer_text: string | null;
  answered_by: string | null;
  created_at: string;
  answered_at: string | null;
}

// --- Motivos ------------------------------------------------------------------------------------

export const MOTIVO_RECUSA_PARA_API: Record<MotivoRecusa, MotivoRecusaDaApi> = {
  distancia: "distance",
  cansaco: "fatigue",
  agenda: "schedule",
  outro: "other",
};

const MOTIVO_RECUSA_DA_API: Record<MotivoRecusaDaApi, MotivoRecusa> = {
  distance: "distancia",
  fatigue: "cansaco",
  schedule: "agenda",
  other: "outro",
};

export const MOTIVO_CONTESTACAO_PARA_API: Record<MotivoContestacao, MotivoContestacaoDaApi> = {
  dado_errado: "wrong_data",
  motivo_nao_faz_sentido: "explanation_unclear",
  ordem_injusta: "unfair_order",
  outro: "other",
};

const MOTIVO_CONTESTACAO_DA_API: Record<MotivoContestacaoDaApi, MotivoContestacao> = {
  wrong_data: "dado_errado",
  explanation_unclear: "motivo_nao_faz_sentido",
  unfair_order: "ordem_injusta",
  other: "outro",
};

// --- Oferta -------------------------------------------------------------------------------------

const VAGAS_FECHADAS = new Set(["filled", "uncovered", "cancelled"]);

/** O status na tela. Pendente com o prazo vencido já conta como expirada. */
export function statusDaOferta(
  linha: Pick<OfertaDoBanco, "response" | "sent_at" | "ttl_minutes"> & {
    shifts?: { status: string } | null;
  },
  agora: DataHora,
): StatusOferta {
  if (linha.response === "accepted") return "aceita";
  if (linha.response === "declined") return "recusada";
  if (linha.response === "expired") return "expirada";
  if (linha.shifts && VAGAS_FECHADAS.has(linha.shifts.status)) return "cancelada";
  const expira = somarMinutos(localDoBanco(linha.sent_at), linha.ttl_minutes);
  return lerDataHora(agora) >= lerDataHora(expira) ? "expirada" : "aberta";
}

const EXPLICACAO_VAZIA: Explicacao = { texto: "", fatoresCitados: [], fonte: "template" };

/** As sete variáveis sempre presentes: a que não veio do banco entra como zero. */
function completarFatores(valores: Record<string, number> | undefined): Record<Fator, number> {
  return Object.fromEntries(FATORES.map((f) => [f, valores?.[f] ?? 0])) as Record<Fator, number>;
}

export function ofertaDoBanco(
  linha: OfertaDoBanco,
  medico: Medico,
  recomendacao: RecomendacaoDoMedico | null,
  agora: DataHora,
): Oferta {
  const vaga = linha.shifts;
  if (!vaga || !vaga.units) {
    throw new RangeError(`A oferta ${linha.id} chegou sem a vaga.`);
  }
  const enviadaEm = localDoBanco(linha.sent_at);
  const distancia = recomendacao?.features.distance_km;
  return {
    id: linha.id,
    vagaId: linha.shift_id,
    medico,
    sequencia: linha.sequence_no,
    status: statusDaOferta(linha, agora),
    enviadaEm,
    expiraEm: somarMinutos(enviadaEm, linha.ttl_minutes),
    respondidaEm: linha.responded_at ? localDoBanco(linha.responded_at) : null,
    ttlMin: linha.ttl_minutes,
    motivoRecusa: linha.decline_reason ? MOTIVO_RECUSA_DA_API[linha.decline_reason] : null,
    vaga: {
      unidade: unidadeDoBanco(vaga.units),
      especialidade: vaga.specialty as Oferta["vaga"]["especialidade"],
      inicio: localDoBanco(vaga.starts_at),
      fim: localDoBanco(vaga.ends_at),
      urgencia: (vaga.urgency ?? null) as Oferta["vaga"]["urgencia"],
      distanciaKm: typeof distancia === "number" ? distancia : null,
    },
    porQue: recomendacao?.explicacao ?? EXPLICACAO_VAZIA,
    fatores: completarFatores(recomendacao?.features),
    contribuicoes: completarFatores(recomendacao?.contributions),
    alertas: recomendacao?.alerts ?? [],
  };
}

/**
 * A cascata da vaga: as ofertas enviadas, na ordem em que saíram, e depois quem foi aprovado e
 * ainda não foi chamado. `vaga` é a da própria vaga, para quem está na fila.
 */
export function cascataDoBanco(
  vagaId: string,
  vaga: VagaDaOfertaDoBanco,
  enviadas: OfertaDoBanco[],
  aprovados: string[],
  medicos: Map<string, Medico>,
  recomendacoes: Map<string, RecomendacaoDoMedico>,
  agora: DataHora,
): Cascata {
  const especialidade = vaga.specialty as Medico["especialidade"];
  const medicoDe = (id: string) => medicos.get(id) ?? medicoRestrito(id, especialidade);
  const ordenadas = [...enviadas].sort((a, b) => a.sequence_no - b.sequence_no);
  const ofertas: Oferta[] = ordenadas.map((linha) =>
    ofertaDoBanco(
      { ...linha, shifts: linha.shifts ?? vaga },
      medicoDe(linha.doctor_id),
      recomendacoes.get(linha.doctor_id) ?? null,
      agora,
    ),
  );
  const chamados = new Set(ordenadas.map((o) => o.doctor_id));
  const fechada = VAGAS_FECHADAS.has(vaga.status);
  let sequencia = ofertas.length;
  for (const medicoId of aprovados) {
    if (chamados.has(medicoId)) continue;
    sequencia += 1;
    const recomendacao = recomendacoes.get(medicoId) ?? null;
    const distancia = recomendacao?.features.distance_km;
    ofertas.push({
      id: `fila-${vagaId}-${medicoId}`,
      vagaId,
      medico: medicoDe(medicoId),
      sequencia,
      status: fechada ? "cancelada" : "na_fila",
      enviadaEm: null,
      expiraEm: null,
      respondidaEm: null,
      ttlMin: ordenadas[0]?.ttl_minutes ?? 0,
      motivoRecusa: null,
      vaga: {
        unidade: unidadeDoBanco(vaga.units ?? { id: "", name: "", zone: "" }),
        especialidade,
        inicio: localDoBanco(vaga.starts_at),
        fim: localDoBanco(vaga.ends_at),
        urgencia: (vaga.urgency ?? null) as Oferta["vaga"]["urgencia"],
        distanciaKm: typeof distancia === "number" ? distancia : null,
      },
      porQue: recomendacao?.explicacao ?? EXPLICACAO_VAZIA,
      fatores: completarFatores(recomendacao?.features),
      contribuicoes: completarFatores(recomendacao?.contributions),
      alertas: recomendacao?.alerts ?? [],
    });
  }
  const atual = ofertas.find((o) => o.status === "aberta");
  return { vagaId, ofertas, atualId: atual?.id ?? null };
}

// --- Contestação --------------------------------------------------------------------------------

export function contestacaoDoBanco(
  linha: ContestacaoDoBanco,
  medico: Medico,
  recomendacao: RecomendacaoDoMedico | null,
): Contestacao {
  return {
    id: linha.id,
    protocolo: linha.protocol,
    ofertaId: linha.offer_id,
    vagaId: linha.shift_id,
    medico,
    motivo: MOTIVO_CONTESTACAO_DA_API[linha.reason],
    texto: linha.text,
    criadaEm: localDoBanco(linha.created_at),
    status: linha.status === "answered" ? "respondida" : "aberta",
    recomendacao: {
      posicao: recomendacao?.rank ?? 0,
      explicacao: recomendacao?.explicacao ?? EXPLICACAO_VAZIA,
    },
    resposta:
      linha.status === "answered" && linha.answer_text && linha.answered_at
        ? {
            texto: linha.answer_text,
            porNome: "Coordenação",
            em: localDoBanco(linha.answered_at),
          }
        : null,
  };
}
