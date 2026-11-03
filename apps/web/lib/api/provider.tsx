"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PlantaoApi } from "./plantao-api";

const ApiContext = React.createContext<PlantaoApi | null>(null);

/**
 * Entrega a `PlantaoApi` às telas da plataforma. No modo `demo` (o único que existe nesta fase),
 * o adaptador roda no navegador, com o estado guardado em `sessionStorage`; ele é carregado
 * sob demanda para a landing e a entrada não pagarem o custo das fixtures. Enquanto não
 * chega, `useApi()` devolve `null` e as telas mostram o esqueleto.
 */
export function ApiProvider({
  children,
  coordenadorId,
}: {
  children: React.ReactNode;
  /** A persona de coordenador que decide nesta sessão: é quem aparece no selo "Decidido por". */
  coordenadorId?: string;
}) {
  const [api, setApi] = React.useState<PlantaoApi | null>(null);
  const [clienteDeConsultas] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 15_000, retry: false, refetchOnWindowFocus: false },
        },
      }),
  );

  React.useEffect(() => {
    let ativo = true;
    void import("./demo").then(({ criarApiDemo }) => {
      if (!ativo) return;
      const novaApi = criarApiDemo({ storage: window.sessionStorage });
      if (coordenadorId) novaApi.definirCoordenador(coordenadorId);
      setApi(novaApi);
    });
    return () => {
      ativo = false;
    };
  }, [coordenadorId]);

  return (
    <QueryClientProvider client={clienteDeConsultas}>
      <ApiContext.Provider value={api}>{children}</ApiContext.Provider>
    </QueryClientProvider>
  );
}

/** A API da sessão, ou `null` enquanto o adaptador ainda está sendo carregado. */
export function useApi(): PlantaoApi | null {
  return React.useContext(ApiContext);
}
