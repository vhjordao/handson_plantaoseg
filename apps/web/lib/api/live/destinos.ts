/**
 * Os endereços de verdade, só no servidor da web (variáveis sem `NEXT_PUBLIC_`). Nunca chegam ao
 * navegador: a rota `/api/sistema` os usa para repassar as chamadas. Só a rota e as ações de
 * servidor importam este arquivo; no navegador, as variáveis nem existem.
 */
export interface DestinosDoSistema {
  apiUrl: string;
  supabaseUrl: string;
  chaveAnonima: string;
}

const semBarraFinal = (url: string) => url.replace(/\/+$/, "");

export function lerDestinos(): DestinosDoSistema | null {
  const apiUrl = process.env.API_URL;
  const supabaseUrl = process.env.SUPABASE_URL;
  const chaveAnonima = process.env.SUPABASE_ANON_KEY;
  if (!apiUrl || !supabaseUrl || !chaveAnonima) return null;
  return {
    apiUrl: semBarraFinal(apiUrl),
    supabaseUrl: semBarraFinal(supabaseUrl),
    chaveAnonima,
  };
}

/** Rotas da API que a tela pode chamar. As internas (`/internal`) nunca passam. */
const API_PERMITIDA =
  /^(me|policy|model-card|shifts(\/[0-9a-f-]{36}(\/(recommendations|approve|skip|unskip|feedback|decision))?|\/extract)?|offers\/[0-9a-f-]{36}\/(respond|contest)|contestations\/[0-9a-f-]{36}\/answer)$/;

/** Tabelas que a tela lê sob RLS. Escrever no banco pela web não existe. */
const TABELAS = new Set([
  "shifts",
  "units",
  "offers",
  "doctors",
  "recommendations",
  "recommendation_exclusions",
  "explanations",
  "audit_log",
  "contestations",
]);

export type Destino =
  { tipo: "api"; url: string } | { tipo: "banco"; url: string } | { tipo: "auth"; url: string };

/** O destino de um caminho de `/api/sistema`, ou `null` se ele não for permitido. */
export function destinoDe(
  destinos: DestinosDoSistema,
  partes: string[],
  metodo: string,
  busca: string,
): Destino | null {
  const [porta, ...resto] = partes;
  const caminho = resto.join("/");
  if (porta === "api" && (metodo === "GET" || metodo === "POST") && API_PERMITIDA.test(caminho)) {
    return { tipo: "api", url: `${destinos.apiUrl}/${caminho}${busca}` };
  }
  if (porta === "banco" && metodo === "GET" && resto.length === 1 && TABELAS.has(caminho)) {
    return {
      tipo: "banco",
      url: `${destinos.supabaseUrl}/rest/v1/${caminho}${busca}`,
    };
  }
  if (porta === "auth" && metodo === "POST" && caminho === "token") {
    const tipo = new URLSearchParams(busca).get("grant_type");
    if (tipo !== "password" && tipo !== "refresh_token") return null;
    return {
      tipo: "auth",
      url: `${destinos.supabaseUrl}/auth/v1/token${busca}`,
    };
  }
  return null;
}
