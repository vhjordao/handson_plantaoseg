/**
 * Onde o modo real chama (fase 3 do roteiro). O navegador só conversa com o próprio site, em
 * `/api/sistema`: a rota do servidor repassa à API e ao Supabase (`app/api/sistema`). Assim, o
 * endereço do servidor da API e a chave anônima ficam fora do JavaScript público, e a chave de
 * serviço nunca existe na web. Sem `NEXT_PUBLIC_SISTEMA_REAL=1`, a entrada com login não aparece.
 */
export interface ConfigLive {
  /** A API de matching, pela rota do site. */
  apiUrl: string;
  /** O PostgREST do Supabase (só leitura, sob RLS), pela rota do site. */
  bancoUrl: string;
  /** O Supabase Auth (só o token), pela rota do site. */
  authUrl: string;
}

export const ROTA_DO_SISTEMA = "/api/sistema";

export function lerConfigLive(): ConfigLive | null {
  // Escrita por extenso: o Next só embute no pacote o que aparece assim.
  if (process.env.NEXT_PUBLIC_SISTEMA_REAL !== "1") return null;
  return {
    apiUrl: `${ROTA_DO_SISTEMA}/api`,
    bancoUrl: `${ROTA_DO_SISTEMA}/banco`,
    authUrl: `${ROTA_DO_SISTEMA}/auth`,
  };
}
