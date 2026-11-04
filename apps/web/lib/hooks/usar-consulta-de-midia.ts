import * as React from "react";

/**
 * Diz se uma consulta de mídia (`"(min-width: 1024px)"`) vale agora, e acompanha as mudanças.
 * No servidor e na primeira pintura do navegador vale `false`, para o HTML coincidir; a
 * resposta certa entra logo depois da hidratação.
 */
export function useConsultaDeMidia(consulta: string): boolean {
  const assinar = React.useCallback(
    (aviso: () => void) => {
      const lista = window.matchMedia(consulta);
      lista.addEventListener("change", aviso);
      return () => lista.removeEventListener("change", aviso);
    },
    [consulta],
  );
  return React.useSyncExternalStore(
    assinar,
    () => window.matchMedia(consulta).matches,
    () => false,
  );
}
