/**
 * O que a API e o banco devolvem, em inglês e `snake_case`, vira o contrato da tela (ADR 0014).
 * Funções puras: os testes as conferem sem rede.
 */
import { minutosEntre } from "../demo/datas";
import type {
  Candidato,
  CampoLido,
  ChaveCampo,
  CodigoRegra,
  Decisao,
  EstadoDaDecisao,
  Exclusao,
  FichaModelo,
  Fator,
  Leitura,
  Medico,
  Politica,
  Recomendacao,
  StatusVaga,
  Unidade,
  Vaga,
  DataHora,
} from "../types";
import { localDaApi, localDoBanco } from "./tempo";

// --- Formatos da API e do banco ---------------------------------------------------------------

export interface LeituraDaApi {
  extracted: {
    unit_id: string | null;
    specialty: string | null;
    starts_at: string | null;
    ends_at: string | null;
    urgency: string | null;
  };
  readings: {
    key: string;
    origin: string;
    span: { start: number; end: number } | null;
  }[];
  missing_required: string[];
  source: "regras" | "llm";
  flags: string[];
  llm_error: string | null;
}

export interface VagaDoBanco {
  id: string;
  specialty: string;
  starts_at: string;
  ends_at: string;
  urgency: string;
  status: string;
  published_at: string;
  filled_at: string | null;
  units: { id: string; name: string; zone: string } | null;
  shift_requests: { raw_text: string } | null;
}

export interface MedicoDoBanco {
  id: string;
  name_sim: string;
  crm_sim: string;
  specialty: string;
  secondary_specialty: string | null;
}

export interface CandidatoDaApi {
  rank: number;
  doctor_id: string;
  score: number;
  features: Record<string, number>;
  contributions: Record<string, number>;
  alerts: string[];
  explanation: {
    text: string;
    factors_cited: string[];
    source: "template" | "llm";
  };
  explanation_fallback: string | null;
  /** Rodízio (passo 7.2): a posição só pelo modelo e as aparições no top-5 em 7 dias. */
  model_rank?: number;
  exposure_7d?: number;
}

export interface ExclusaoDaApi {
  doctor_id: string;
  rule_code: string;
  rule_text: string;
  evidence?: string | null;
}

export interface RecomendacaoDaApi {
  shift_id: string;
  model_version: string;
  generated_at: string;
  pool_size: number;
  eligible_count: number;
  candidates: CandidatoDaApi[];
  exclusions: ExclusaoDaApi[];
  excluded_by_rule: Record<string, number>;
  rotation?: { delta: number; window_days: number } | null;
}

export interface DecisaoDaApi {
  shift_id: string;
  approved_doctor_ids: string[] | null;
  decided_by: string | null;
  decided_at: string | null;
  exception: { alerts: string[]; justification: string } | null;
  skipped: string[];
}

export interface PoliticaDaApi {
  max_continuous_hours: number;
  min_rest_hours: number;
  default_radius_km: number;
  offer_ttl_minutes: number;
  top_k: number;
  allow_secondary_specialty: boolean;
  rotation_delta?: number;
  rotation_window_days?: number;
}

export interface FichaDaApi {
  version: string;
  type: string;
  trained_on: string;
  features_used: { feature: string; weight: number }[];
  features_not_used: { name: string; reason: string }[];
  metrics: { name: string; value: string }[];
  risk_class: { preliminary: string; note: string };
  limits: string[];
}

// --- Leitura ----------------------------------------------------------------------------------

const CHAVE_DA_API: Record<string, ChaveCampo> = {
  unit_id: "unidade",
  specialty: "especialidade",
  starts_at: "inicio",
  ends_at: "fim",
  urgency: "urgencia",
};
const ORIGEM: Record<string, CampoLido["origem"]> = {
  found: "achei",
  inferred: "deduzi",
  missing: "nao_achei",
};

/**
 * A leitura do texto. No sistema real a urgência também entra em `faltando` quando não foi lida:
 * a API e o banco a exigem, e a tela pergunta por ela (D10 do ADR 0015).
 */
export function leituraDaApi(texto: string, resposta: LeituraDaApi): Leitura {
  const valores = resposta.extracted;
  const campos: CampoLido[] = resposta.readings.map((item) => {
    const chave = CHAVE_DA_API[item.key] as ChaveCampo;
    const bruto = valores[item.key as keyof LeituraDaApi["extracted"]];
    const valor = bruto && (chave === "inicio" || chave === "fim") ? localDaApi(bruto) : bruto;
    return {
      chave,
      valor: valor ?? null,
      origem: valor ? (ORIGEM[item.origin] ?? "deduzi") : "nao_achei",
      trecho: valor && item.span ? { inicio: item.span.start, fim: item.span.end } : null,
    };
  });
  const faltando = resposta.missing_required.map((chave) => CHAVE_DA_API[chave] as ChaveCampo);
  if (!valores.urgency) faltando.push("urgencia");
  return {
    texto,
    campos,
    faltando,
    fonte: resposta.source,
    sinais: resposta.flags,
    erroIA: resposta.llm_error,
  };
}

// --- Vaga -------------------------------------------------------------------------------------

const STATUS: Record<string, StatusVaga> = {
  open: "aguardando_decisao",
  offered: "oferta_em_andamento",
  filled: "preenchida",
  uncovered: "sem_cobertura",
  // A tela não tem "cancelada": a vaga recusada inteira deixa de ter quem chamar.
  cancelled: "sem_cobertura",
};

export function unidadeDoBanco(linha: { id: string; name: string; zone: string }): Unidade {
  return { id: linha.id, nome: linha.name, zona: linha.zone };
}

/**
 * A vaga do banco no formato da tela. "Em risco" segue a regra da demonstração: começa em menos de
 * 24 h e ninguém aceitou ainda.
 */
export function vagaDoBanco(
  linha: VagaDoBanco,
  agora: DataHora,
  preenchidaPor: { medicoId: string; nome: string } | null = null,
): Vaga {
  const status = STATUS[linha.status] ?? "aguardando_decisao";
  const inicio = localDoBanco(linha.starts_at);
  const publicada = localDoBanco(linha.published_at);
  const aberta = status === "aguardando_decisao" || status === "oferta_em_andamento";
  const faltamHoras = minutosEntre(inicio, agora) / 60;
  const emRisco = aberta && faltamHoras >= 0 && faltamHoras < 24;
  return {
    id: linha.id,
    unidade: linha.units
      ? unidadeDoBanco(linha.units)
      : { id: "", nome: "Hospital da rede simulada", zona: "" },
    especialidade: linha.specialty as Vaga["especialidade"],
    inicio,
    fim: localDoBanco(linha.ends_at),
    urgencia: linha.urgency as Vaga["urgencia"],
    status,
    emRisco,
    motivoRisco: emRisco
      ? `Começa em ${Math.round(faltamHoras)} h e nenhuma oferta foi aceita`
      : null,
    textoOriginal: linha.shift_requests?.raw_text ?? "",
    criadaEm: publicada,
    preenchidaPor,
    tempoAtePreencherMin: linha.filled_at
      ? Math.round(minutosEntre(localDoBanco(linha.filled_at), publicada))
      : null,
  };
}

// --- Médicos ----------------------------------------------------------------------------------

export function medicoDoBanco(linha: MedicoDoBanco): Medico {
  return {
    id: linha.id,
    pseudonimo: linha.id.slice(0, 8),
    nome: linha.name_sim,
    crm: linha.crm_sim,
    especialidade: linha.specialty as Medico["especialidade"],
    especialidadeSecundaria: (linha.secondary_specialty ??
      null) as Medico["especialidadeSecundaria"],
  };
}

/**
 * Quem ficou de fora pelas regras: a RLS não abre o cadastro dele ao coordenador. A tela só mostra
 * o pseudônimo e a evidência, então o resto fica neutro.
 */
export function medicoRestrito(id: string, especialidade: Medico["especialidade"]): Medico {
  const pseudonimo = id.slice(0, 8);
  return {
    id,
    pseudonimo,
    nome: `Médico ${pseudonimo}`,
    crm: "Cadastro restrito",
    especialidade,
    especialidadeSecundaria: null,
  };
}

// --- Recomendação -----------------------------------------------------------------------------

/** Uma amostra de quem ficou de fora: até 4 por regra e 12 no total, como a demonstração. */
export function amostraDeExcluidos(exclusoes: Exclusao[]): Exclusao[] {
  const porRegra = new Map<string, number>();
  const amostra: Exclusao[] = [];
  for (const exclusao of exclusoes) {
    const vistos = porRegra.get(exclusao.codigoRegra) ?? 0;
    if (vistos >= 4 || amostra.length >= 12) continue;
    porRegra.set(exclusao.codigoRegra, vistos + 1);
    amostra.push(exclusao);
  }
  return amostra;
}

function candidatoDaApi(item: CandidatoDaApi, medico: Medico): Candidato {
  return {
    posicao: item.rank,
    medico,
    score: item.score,
    fatores: item.features as Record<Fator, number>,
    contribuicoes: item.contributions as Record<Fator, number>,
    alertas: item.alerts,
    explicacao: {
      texto: item.explanation.text,
      fatoresCitados: item.explanation.factors_cited as Fator[],
      fonte: item.explanation.source,
    },
    motivoFallback: item.explanation_fallback,
    rodizio:
      item.model_rank && item.model_rank !== item.rank
        ? { posicaoDoModelo: item.model_rank, indicacoesNaSemana: item.exposure_7d ?? 0 }
        : null,
  };
}

export function recomendacaoDaApi(
  resposta: RecomendacaoDaApi,
  medicos: Map<string, Medico>,
  especialidade: Medico["especialidade"],
): Recomendacao {
  const exclusoes: Exclusao[] = resposta.exclusions.map((item) => ({
    medico: medicos.get(item.doctor_id) ?? medicoRestrito(item.doctor_id, especialidade),
    codigoRegra: item.rule_code as CodigoRegra,
    textoRegra: item.rule_text,
    evidencia: item.evidence ?? null,
  }));
  return {
    vagaId: resposta.shift_id,
    chave: resposta.shift_id,
    modeloVersao: resposta.model_version,
    geradaEm: localDaApi(resposta.generated_at),
    totalPool: resposta.pool_size,
    totalElegiveis: resposta.eligible_count,
    candidatos: resposta.candidates.map((item) =>
      candidatoDaApi(
        item,
        medicos.get(item.doctor_id) ?? medicoRestrito(item.doctor_id, especialidade),
      ),
    ),
    exclusoesPorRegra: resposta.excluded_by_rule as Recomendacao["exclusoesPorRegra"],
    exemplosExcluidos: amostraDeExcluidos(exclusoes),
  };
}

// --- Decisão, política e ficha ----------------------------------------------------------------

export const CARGO_DO_LOGIN = "Coordenação de escala";

export function estadoDaApi(resposta: DecisaoDaApi): EstadoDaDecisao {
  const decisao: Decisao | null =
    resposta.approved_doctor_ids && resposta.decided_at
      ? {
          id: `decisao-${resposta.shift_id}`,
          vagaId: resposta.shift_id,
          medicoIds: resposta.approved_doctor_ids,
          decididoPor: {
            pseudoId: (resposta.decided_by ?? "").slice(0, 8),
            nome: "Coordenação (login da demonstração)",
            cargo: CARGO_DO_LOGIN,
          },
          em: localDaApi(resposta.decided_at),
          excecao: resposta.exception
            ? {
                alertas: resposta.exception.alerts,
                justificativa: resposta.exception.justification,
              }
            : null,
        }
      : null;
  return { decisao, pulados: resposta.skipped };
}

export function politicaDaApi(resposta: PoliticaDaApi): Politica {
  return {
    maxHorasContinuas: resposta.max_continuous_hours,
    descansoMinimoHoras: resposta.min_rest_hours,
    raioPadraoKm: resposta.default_radius_km,
    ttlOfertaMin: resposta.offer_ttl_minutes,
    topK: resposta.top_k,
    permiteEspecialidadeSecundaria: resposta.allow_secondary_specialty,
  };
}

export function fichaDaApi(resposta: FichaDaApi): FichaModelo {
  return {
    versao: resposta.version,
    tipo: resposta.type,
    treinadoCom: resposta.trained_on,
    variaveisUsadas: resposta.features_used.map((item) => ({
      fator: item.feature as Fator,
      peso: item.weight,
    })),
    variaveisNaoUsadas: resposta.features_not_used.map((item) => ({
      nome: item.name,
      motivo: item.reason,
    })),
    metricas: resposta.metrics.map((item) => ({
      nome: item.name,
      valor: item.value,
    })),
    classeDeRisco: {
      preliminar: resposta.risk_class.preliminary,
      observacao: resposta.risk_class.note,
    },
    limites: resposta.limits,
  };
}
