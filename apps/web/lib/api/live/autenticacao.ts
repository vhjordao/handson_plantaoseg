/**
 * O login do sistema real (D1 do ADR 0015): e-mail e senha no Supabase Auth, pela rota do site
 * (`/api/sistema/auth`), sem biblioteca a mais. Os tokens ficam no `sessionStorage` desta aba, e somem quando ela fecha. A
 * senha só passa por aqui na hora de entrar e não é guardada.
 */
import { SessaoExpiradaError } from "../erros";
import type { ConfigLive } from "./config";

export { SessaoExpiradaError };

const CHAVE = "ps_login";
const MARGEM_MS = 60_000;

export interface Tokens {
  acesso: string;
  renovacao: string;
  /** Milissegundos desde a época em que o token de acesso vence. */
  expiraEm: number;
}

/** E-mail ou senha não conferem. A mensagem não diz qual dos dois, de propósito. */
export class LoginInvalidoError extends Error {
  constructor() {
    super("E-mail ou senha não conferem. Confira e tente de novo.");
    this.name = "LoginInvalidoError";
  }
}

function armazenamento(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

let emMemoria: Tokens | null = null;

export function lerTokens(): Tokens | null {
  const guardado = armazenamento()?.getItem(CHAVE);
  if (!guardado) return emMemoria;
  try {
    return JSON.parse(guardado) as Tokens;
  } catch {
    return null;
  }
}

function gravarTokens(tokens: Tokens): void {
  emMemoria = tokens;
  armazenamento()?.setItem(CHAVE, JSON.stringify(tokens));
}

export function limparLogin(): void {
  emMemoria = null;
  armazenamento()?.removeItem(CHAVE);
}

interface RespostaDoAuth {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

async function pedirTokens(
  config: ConfigLive,
  tipo: "password" | "refresh_token",
  corpo: Record<string, string>,
): Promise<Response> {
  return fetch(`${config.authUrl}/token?grant_type=${tipo}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });
}

function tokensDa(resposta: RespostaDoAuth): Tokens {
  return {
    acesso: resposta.access_token,
    renovacao: resposta.refresh_token,
    expiraEm: Date.now() + resposta.expires_in * 1000,
  };
}

export async function entrarComSenha(
  config: ConfigLive,
  email: string,
  senha: string,
): Promise<Tokens> {
  const resposta = await pedirTokens(config, "password", {
    email: email.trim(),
    password: senha,
  });
  if (resposta.status === 400 || resposta.status === 401) throw new LoginInvalidoError();
  if (!resposta.ok) throw new Error(`O login respondeu ${resposta.status}.`);
  const tokens = tokensDa((await resposta.json()) as RespostaDoAuth);
  gravarTokens(tokens);
  return tokens;
}

/** Troca o token de renovação por um novo par. O Supabase gira o de renovação a cada uso. */
export async function renovar(config: ConfigLive): Promise<string> {
  const atuais = lerTokens();
  if (!atuais) throw new SessaoExpiradaError();
  const resposta = await pedirTokens(config, "refresh_token", {
    refresh_token: atuais.renovacao,
  });
  if (!resposta.ok) {
    limparLogin();
    throw new SessaoExpiradaError();
  }
  const tokens = tokensDa((await resposta.json()) as RespostaDoAuth);
  gravarTokens(tokens);
  return tokens.acesso;
}

/** O token de acesso, renovado antes de vencer. */
export async function tokenDeAcesso(config: ConfigLive): Promise<string> {
  const tokens = lerTokens();
  if (!tokens) throw new SessaoExpiradaError();
  if (tokens.expiraEm - Date.now() > MARGEM_MS) return tokens.acesso;
  return renovar(config);
}
