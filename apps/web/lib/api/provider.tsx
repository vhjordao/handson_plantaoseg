"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PlantaoApi } from "./plantao-api";

interface EstadoDaApi {
  /** A API da sessão, ou `null` enquanto o adaptador ainda está sendo carregado. */
  api: PlantaoApi | null;
  /** O adaptador não carregou (rede do local, pacote que falhou). Mostre "Tentar de novo". */
  falhou: boolean;
  tentarDeNovo: () => void;
}

const ApiContext = React.createContext<EstadoDaApi>({
  api: null,
  falhou: false,
  tentarDeNovo: () => {},
});

/**
 * Entrega a `PlantaoApi` às telas da plataforma. No modo `demo` (o único que existe nesta fase),
 * o adaptador roda no navegador, com o estado guardado em `sessionStorage` (se o navegador o
 * bloquear, o estado fica só em memória); ele é carregado sob demanda para a landing e a
 * entrada não pagarem o custo das fixtures. Se o carregamento falhar, as telas oferecem
 * "Tentar de novo" em vez de ficarem em "Carregando…" para sempre.
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
  const [falhou, setFalhou] = React.useState(false);
  const [tentativa, setTentativa] = React.useState(0);
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
    import("./demo")
      .then(({ criarApiDemo }) => {
        if (!ativo) return;
        let storage: Storage | null = null;
        try {
          storage = window.sessionStorage;
        } catch {
          storage = null; // navegador com o armazenamento bloqueado: o estado fica em memória
        }
        const novaApi = criarApiDemo({ storage });
        if (coordenadorId) novaApi.definirCoordenador(coordenadorId);
        setApi(novaApi);
        setFalhou(false);
      })
      .catch(() => {
        if (ativo) setFalhou(true);
      });
    return () => {
      ativo = false;
    };
  }, [coordenadorId, tentativa]);

  const tentarDeNovo = React.useCallback(() => {
    setFalhou(false);
    setTentativa((n) => n + 1);
  }, []);

  const valor = React.useMemo(() => ({ api, falhou, tentarDeNovo }), [api, falhou, tentarDeNovo]);

  return (
    <QueryClientProvider client={clienteDeConsultas}>
      <ApiContext.Provider value={valor}>{children}</ApiContext.Provider>
    </QueryClientProvider>
  );
}

/** A API da sessão, ou `null` enquanto o adaptador ainda está sendo carregado. */
export function useApi(): PlantaoApi | null {
  return React.useContext(ApiContext).api;
}

/** O estado completo, para quem precisa mostrar a falha de carregamento. */
export function useEstadoApi(): EstadoDaApi {
  return React.useContext(ApiContext);
}
