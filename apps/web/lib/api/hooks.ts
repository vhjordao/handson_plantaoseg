"use client";

import { skipToken, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NaoImplementadoError, type PlantaoApi } from "./plantao-api";
import { useApi } from "./provider";
import type {
  AprovarInput,
  ConfirmarVagaInput,
  ContestarInput,
  DesfazerPuloInput,
  FeedbackExplicacaoInput,
  PularInput,
  RespostaOfertaInput,
} from "./types";

/** Consultas de leitura. A chave inclui o modo, para trocar de `demo` para `live` sem misturar o cache. */
export function useVagas() {
  const api = useApi();
  return useQuery({
    queryKey: [api?.modo, "vagas"],
    queryFn: api ? () => api.listarVagas() : skipToken,
  });
}

export function useIndicadores() {
  const api = useApi();
  return useQuery({
    queryKey: [api?.modo, "indicadores"],
    queryFn: api ? () => api.obterIndicadores() : skipToken,
  });
}

/** `vagaId` nulo não consulta nada: é a tela de nova vaga sem rascunho para continuar. */
export function useVaga(vagaId: string | null) {
  const api = useApi();
  return useQuery({
    queryKey: [api?.modo, "vaga", vagaId],
    queryFn: api && vagaId ? () => api.obterVaga(vagaId) : skipToken,
  });
}

/** `habilitado` é falso enquanto a vaga é rascunho: ainda não existem sugestões para ela. */
export function useSugestoes(vagaId: string, habilitado: boolean) {
  const api = useApi();
  return useQuery({
    queryKey: [api?.modo, "sugestoes", vagaId],
    queryFn: api && habilitado ? () => api.obterSugestoes(vagaId) : skipToken,
  });
}

export function useEstadoDaDecisao(vagaId: string) {
  const api = useApi();
  return useQuery({
    queryKey: [api?.modo, "decisao", vagaId],
    queryFn: api ? () => api.obterEstadoDaDecisao(vagaId) : skipToken,
  });
}

export function usePolitica() {
  const api = useApi();
  return useQuery({
    queryKey: [api?.modo, "politica"],
    queryFn: api ? () => api.obterPolitica() : skipToken,
  });
}

export function useFichaModelo() {
  const api = useApi();
  return useQuery({
    queryKey: [api?.modo, "ficha-modelo"],
    queryFn: api ? () => api.obterFichaModelo() : skipToken,
  });
}

export function useUnidades() {
  const api = useApi();
  return useQuery({
    queryKey: [api?.modo, "unidades"],
    queryFn: api ? () => api.listarUnidades() : skipToken,
  });
}

export function useExemplosDeVaga() {
  const api = useApi();
  return useQuery({
    queryKey: [api?.modo, "exemplos-de-vaga"],
    queryFn: api ? () => api.listarExemplosDeVaga() : skipToken,
  });
}

/** A API para as ações: a tela só as oferece depois de a API ter carregado. */
function useApiCarregada(): () => PlantaoApi {
  const api = useApi();
  return () => {
    if (!api) throw new Error("A API ainda não carregou.");
    return api;
  };
}

/** Toda ação que muda o estado refaz as leituras da tela, para nenhuma ficar para trás. */
function useRefazerLeituras(): () => Promise<void> {
  const clienteDeConsultas = useQueryClient();
  const api = useApi();
  return () => clienteDeConsultas.invalidateQueries({ queryKey: [api?.modo] });
}

export function useLerVaga() {
  const apiCarregada = useApiCarregada();
  return useMutation({ mutationFn: (texto: string) => apiCarregada().lerVaga(texto) });
}

export function useConfirmarVaga() {
  const apiCarregada = useApiCarregada();
  const refazer = useRefazerLeituras();
  return useMutation({
    mutationFn: async (input: ConfirmarVagaInput) => {
      const api = apiCarregada();
      const antes = await api.listarVagas();
      const vaga = await api.confirmarVaga(input);
      // Publicar a mesma janela devolve a vaga que já existe: a tela avisa, para não surpreender.
      return { vaga, jaExistia: antes.some((v) => v.id === vaga.id) };
    },
    onSuccess: refazer,
  });
}

export function useAprovar() {
  const apiCarregada = useApiCarregada();
  const refazer = useRefazerLeituras();
  return useMutation({
    mutationFn: (input: AprovarInput) => apiCarregada().aprovar(input),
    onSuccess: refazer,
  });
}

export function usePular() {
  const apiCarregada = useApiCarregada();
  const refazer = useRefazerLeituras();
  return useMutation({
    mutationFn: (input: PularInput) => apiCarregada().pular(input),
    onSuccess: refazer,
  });
}

export function useDesfazerPulo() {
  const apiCarregada = useApiCarregada();
  const refazer = useRefazerLeituras();
  return useMutation({
    mutationFn: (input: DesfazerPuloInput) => apiCarregada().desfazerPulo(input),
    onSuccess: refazer,
  });
}

export function useFeedbackDaExplicacao() {
  const apiCarregada = useApiCarregada();
  return useMutation({
    mutationFn: (input: FeedbackExplicacaoInput) => apiCarregada().enviarFeedbackExplicacao(input),
  });
}

// --- Médico e cascata (fase 4) --------------------------------------------------------------------

/** Sem Realtime (D7 do ADR 0015): as telas da cascata e das ofertas consultam a cada 3 segundos. */
export const INTERVALO_DE_CONSULTA_MS = 3_000;

/** As ofertas do médico. Consulta de novo a cada 3 s, para a oferta nova aparecer sozinha. */
export function useOfertas(medicoId: string) {
  const api = useApi();
  return useQuery({
    queryKey: [api?.modo, "ofertas", medicoId],
    queryFn: api ? () => api.listarOfertas(medicoId) : skipToken,
    refetchInterval: INTERVALO_DE_CONSULTA_MS,
    retry: (falhas, erro) => !(erro instanceof NaoImplementadoError) && falhas < 2,
  });
}

/** A cascata da vaga, para o coordenador. `acompanhar` falso para de consultar (vaga fechada). */
export function useCascata(vagaId: string, habilitado: boolean, acompanhar: boolean) {
  const api = useApi();
  return useQuery({
    queryKey: [api?.modo, "cascata", vagaId],
    queryFn: api && habilitado ? () => api.obterCascata(vagaId) : skipToken,
    refetchInterval: acompanhar ? INTERVALO_DE_CONSULTA_MS : false,
    retry: (falhas, erro) => !(erro instanceof NaoImplementadoError) && falhas < 2,
  });
}

export function useContestacoes(filtro?: { medicoId?: string }) {
  const api = useApi();
  return useQuery({
    queryKey: [api?.modo, "contestacoes", filtro?.medicoId ?? "todas"],
    queryFn: api ? () => api.listarContestacoes(filtro) : skipToken,
    retry: (falhas, erro) => !(erro instanceof NaoImplementadoError) && falhas < 2,
  });
}

export function useResponderOferta() {
  const apiCarregada = useApiCarregada();
  const refazer = useRefazerLeituras();
  return useMutation({
    mutationFn: (input: RespostaOfertaInput) => apiCarregada().responderOferta(input),
    onSuccess: refazer,
  });
}

export function useContestar() {
  const apiCarregada = useApiCarregada();
  const refazer = useRefazerLeituras();
  return useMutation({
    mutationFn: (input: ContestarInput) => apiCarregada().contestar(input),
    onSuccess: refazer,
  });
}

// --- Fase D: auditoria, contestações do coordenador e equidade ----------------------------------

export function useAuditoria(vagaId: string | null) {
  const api = useApi();
  return useQuery({
    queryKey: [api?.modo, "auditoria", vagaId ?? "todas"],
    queryFn: api ? () => api.listarAuditoria(vagaId ? { vagaId } : { limite: 200 }) : skipToken,
    retry: (falhas, erro) => !(erro instanceof NaoImplementadoError) && falhas < 2,
  });
}

/** A verificação da cadeia roda só quando a pessoa pede (lê a trilha inteira). */
export function useVerificarCadeia() {
  const apiCarregada = useApiCarregada();
  return useMutation({ mutationFn: () => apiCarregada().verificarCadeia() });
}

export function useResponderContestacao() {
  const apiCarregada = useApiCarregada();
  const refazer = useRefazerLeituras();
  return useMutation({
    mutationFn: (input: { id: string; texto: string }) => apiCarregada().responderContestacao(input),
    onSuccess: refazer,
  });
}

export function useContagemOfertas() {
  const api = useApi();
  return useQuery({
    queryKey: [api?.modo, "contagem-ofertas"],
    queryFn: api ? () => api.contarOfertas() : skipToken,
    retry: (falhas, erro) => !(erro instanceof NaoImplementadoError) && falhas < 2,
  });
}
