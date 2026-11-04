"use client";

import { skipToken, useQuery } from "@tanstack/react-query";
import { useApi } from "./provider";

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
