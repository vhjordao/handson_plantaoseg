/**
 * O estado da sessão do modo `demo`: o que mudou desde as fixtures (vagas publicadas, decisões,
 * nomes pulados, feedbacks, ofertas e contestações da cascata, linhas novas da trilha e o
 * relógio). Fica em memória e, quando a
 * interface passa um `Storage` (o `sessionStorage`), também lá, na chave `plantao-demo-v1`.
 *
 * Ao restaurar, o conteúdo é validado com Zod e conferido contra o mundo atual (as vagas de
 * exemplo e o começo da trilha, hash a hash). Se algo não bater, o estado é ignorado e a
 * demonstração recomeça limpa. Nunca se confia no que veio do armazenamento do navegador.
 */
import { z } from "zod";
import type { Mundo } from "../../demo/schema";
import {
  ContestacaoSchema,
  DataHoraSchema,
  DecisaoSchema,
  FeedbackExplicacaoInputSchema,
  MotivoRecusaSchema,
  PularInputSchema,
  RegistroAuditoriaSchema,
  VagaSchema,
} from "../types";
import { somarMinutos } from "./datas";

export const CHAVE_DE_ARMAZENAMENTO = "plantao-demo-v1";

/** Um nome pulado pelo coordenador (a trilha também ganha `recommendation_rejected`). */
export const PuloSchema = PularInputSchema.extend({ em: DataHoraSchema });
/** "Esta explicação ajudou?": só registrado, fora da trilha de hash e sem treinar nada. */
export const FeedbackGuardadoSchema = FeedbackExplicacaoInputSchema.extend({ em: DataHoraSchema });

/**
 * Uma oferta enviada na cascata da demonstração (4.6). Só o que muda: o plantão, o médico e o
 * "Por que você" vêm da vaga e da recomendação na hora de ler. Quem foi aprovado e ainda não foi
 * chamado não tem oferta: aparece "na fila", como no sistema real.
 */
export const OfertaGuardadaSchema = z.object({
  id: z.string(),
  vagaId: z.string(),
  medicoId: z.string(),
  sequencia: z.number().int().min(1),
  status: z.enum(["aberta", "aceita", "recusada", "expirada"]),
  enviadaEm: DataHoraSchema,
  respondidaEm: DataHoraSchema.nullable(),
  motivoRecusa: MotivoRecusaSchema.nullable(),
});

export const DadosDaSessaoSchema = z.object({
  versao: z.literal(1),
  vagas: z.array(VagaSchema),
  /** Chave da grade de cada vaga criada na sessão (as de exemplo têm a recomendação no mundo). */
  chavesDaGrade: z.record(z.string(), z.string()),
  /** Rascunhos já publicados: ficam em `vagas` (são do mundo), mas saem da lista. */
  rascunhosConcluidos: z.array(z.string()).default([]),
  decisoes: z.record(z.string(), DecisaoSchema),
  pulos: z.array(PuloSchema),
  feedbacks: z.array(FeedbackGuardadoSchema),
  auditoria: z.array(RegistroAuditoriaSchema),
  /** Sessões guardadas antes da 4.6 não têm ofertas nem contestações: começam vazias. */
  ofertas: z.array(OfertaGuardadaSchema).default([]),
  contestacoes: z.array(ContestacaoSchema).default([]),
  minutosAvancados: z.number().min(0),
  /** Persona de coordenador que está decidindo; nulo = o coordenador da unidade da vaga. */
  coordenadorId: z.string().nullable(),
});
export type DadosDaSessao = z.infer<typeof DadosDaSessaoSchema>;
export type Pulo = z.infer<typeof PuloSchema>;
export type FeedbackGuardado = z.infer<typeof FeedbackGuardadoSchema>;
export type OfertaGuardada = z.infer<typeof OfertaGuardadaSchema>;

/**
 * As ofertas das vagas de exemplo que já têm decisão nas fixtures, para a cascata delas não
 * aparecer vazia. Em andamento: o 1º aprovado está com a oferta desde a decisão. Preenchida:
 * quem veio antes de quem aceitou deixou o prazo passar, um de cada vez, e quem aceitou recebeu
 * a oferta quando o anterior expirou. Tudo é simulação, como o resto das fixtures.
 */
export function ofertasDeExemplo(mundo: Mundo, jaTem: ReadonlySet<string>): OfertaGuardada[] {
  const ttl = mundo.politica.ttlOfertaMin;
  const ofertas: OfertaGuardada[] = [];
  for (const vaga of mundo.vagas) {
    const decisao = mundo.decisoes[vaga.id];
    if (!decisao || jaTem.has(vaga.id)) continue;
    const oferta = (indice: number, status: OfertaGuardada["status"]): OfertaGuardada => {
      const enviadaEm = somarMinutos(decisao.em, indice * ttl);
      return {
        id: `oferta-${vaga.id}-${indice + 1}`,
        vagaId: vaga.id,
        medicoId: decisao.medicoIds[indice] as string,
        sequencia: indice + 1,
        status,
        enviadaEm,
        respondidaEm: status === "aceita" ? enviadaEm : null,
        motivoRecusa: null,
      };
    };
    if (vaga.status === "oferta_em_andamento" && decisao.medicoIds.length > 0) {
      ofertas.push(oferta(0, "aberta"));
    } else if (vaga.status === "preenchida" && vaga.preenchidaPor) {
      const quem = decisao.medicoIds.indexOf(vaga.preenchidaPor.medicoId);
      for (let i = 0; i < quem; i++) ofertas.push(oferta(i, "expirada"));
      if (quem >= 0) ofertas.push(oferta(quem, "aceita"));
    }
  }
  return ofertas;
}

/** O ponto de partida: as vagas, as decisões e a trilha das fixtures, copiadas. */
export function estadoInicial(mundo: Mundo): DadosDaSessao {
  return structuredClone({
    versao: 1 as const,
    vagas: mundo.vagas,
    chavesDaGrade: {},
    rascunhosConcluidos: [],
    decisoes: mundo.decisoes,
    pulos: [],
    feedbacks: [],
    auditoria: mundo.auditoria,
    ofertas: ofertasDeExemplo(mundo, new Set()),
    contestacoes: [],
    minutosAvancados: 0,
    coordenadorId: null,
  });
}

/** O estado guardado vem do mesmo mundo? (vagas de exemplo presentes e trilha começando igual) */
function ehDoMesmoMundo(dados: DadosDaSessao, mundo: Mundo): boolean {
  const ids = new Set(dados.vagas.map((vaga) => vaga.id));
  return (
    mundo.vagas.every((vaga) => ids.has(vaga.id)) &&
    mundo.auditoria.every((registro, i) => dados.auditoria[i]?.hash === registro.hash)
  );
}

/** Lê e valida o estado guardado; qualquer problema (ou falta de `Storage`) devolve `null`. */
export function restaurarEstado(
  armazenamento: Storage | null | undefined,
  mundo: Mundo,
): DadosDaSessao | null {
  if (!armazenamento) return null;
  try {
    const bruto = armazenamento.getItem(CHAVE_DE_ARMAZENAMENTO);
    if (bruto === null) return null;
    const lido = DadosDaSessaoSchema.safeParse(JSON.parse(bruto));
    return lido.success && ehDoMesmoMundo(lido.data, mundo) ? lido.data : null;
  } catch {
    return null; // JSON quebrado ou armazenamento bloqueado (janela privada, por exemplo)
  }
}

export function persistirEstado(
  armazenamento: Storage | null | undefined,
  dados: DadosDaSessao,
): void {
  if (!armazenamento) return;
  try {
    armazenamento.setItem(CHAVE_DE_ARMAZENAMENTO, JSON.stringify(dados));
  } catch {
    // Sem espaço ou sem permissão: a demonstração segue só em memória.
  }
}

export function esquecerEstado(armazenamento: Storage | null | undefined): void {
  if (!armazenamento) return;
  try {
    armazenamento.removeItem(CHAVE_DE_ARMAZENAMENTO);
  } catch {
    // idem
  }
}
