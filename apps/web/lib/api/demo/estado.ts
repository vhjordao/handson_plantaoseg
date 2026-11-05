/**
 * O estado da sessão do modo `demo`: o que mudou desde as fixtures (vagas publicadas, decisões,
 * nomes pulados, feedbacks, linhas novas da trilha e o relógio). Fica em memória e, quando a
 * interface passa um `Storage` (o `sessionStorage`), também lá, na chave `plantao-demo-v1`.
 *
 * Ao restaurar, o conteúdo é validado com Zod e conferido contra o mundo atual (as vagas de
 * exemplo e o começo da trilha, hash a hash). Se algo não bater, o estado é ignorado e a
 * demonstração recomeça limpa. Nunca se confia no que veio do armazenamento do navegador.
 */
import { z } from "zod";
import type { Mundo } from "../../demo/schema";
import {
  DataHoraSchema,
  DecisaoSchema,
  FeedbackExplicacaoInputSchema,
  PularInputSchema,
  RegistroAuditoriaSchema,
  VagaSchema,
} from "../types";

export const CHAVE_DE_ARMAZENAMENTO = "plantao-demo-v1";

/** Um nome pulado pelo coordenador (a trilha também ganha `recommendation_rejected`). */
export const PuloSchema = PularInputSchema.extend({ em: DataHoraSchema });
/** "Esta explicação ajudou?": só registrado, fora da trilha de hash e sem treinar nada. */
export const FeedbackGuardadoSchema = FeedbackExplicacaoInputSchema.extend({ em: DataHoraSchema });

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
  minutosAvancados: z.number().min(0),
  /** Persona de coordenador que está decidindo; nulo = o coordenador da unidade da vaga. */
  coordenadorId: z.string().nullable(),
});
export type DadosDaSessao = z.infer<typeof DadosDaSessaoSchema>;
export type Pulo = z.infer<typeof PuloSchema>;
export type FeedbackGuardado = z.infer<typeof FeedbackGuardadoSchema>;

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
