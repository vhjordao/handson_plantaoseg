/**
 * As duas portas do modo real: a API de matching, para tudo o que escreve, e o Supabase, para o
 * que se lê sob RLS (3.2 do roteiro). Os erros da API viram as classes de `erros.ts`, que a tela já
 * sabe mostrar (3.3). Depois de um 429 a chamada espera e tenta de novo; sem resposta, a tela é
 * avisada de que pode seguir no modo de demonstração (3.4).
 */
import {
  CandidatoInvalidoError,
  EntradaInvalidaError,
  EstadoInvalidoError,
  JustificativaObrigatoriaError,
} from "../erros";
import { ApiIndisponivelError } from "../plantao-api";
import { renovar, SessaoExpiradaError, tokenDeAcesso } from "./autenticacao";
import type { ConfigLive } from "./config";

export interface OpcoesHttp extends ConfigLive {
  /** Chamado quando a API ou o banco não respondem: a tela oferece o modo de demonstração. */
  aoFicarIndisponivel?: () => void;
  /** Para os testes: espera sem relógio de verdade. */
  esperar?: (ms: number) => Promise<void>;
}

const PRAZO_MS = 15_000;
const TENTATIVAS_429 = 2;

const esperarDeVerdade = (ms: number) => new Promise<void>((pronto) => setTimeout(pronto, ms));

const ESTADO = new Set([
  "vaga_nao_aberta",
  "ja_aprovada",
  "ja_recomendada",
  "sem_recomendacao",
  "sem_aprovacao",
  "oferta_expirada",
  "oferta_ja_fechada",
  "conflito_de_agenda",
  "ja_contestada",
  "ja_respondida",
  "vaga_nao_encontrada",
  "unidade_nao_encontrada",
  "oferta_nao_encontrada",
  "contestacao_nao_encontrada",
]);
const ENTRADA = new Set(["data_fora_da_janela", "texto_obrigatorio", "entrada_invalida"]);

/** O código da API vira a classe que a tela reconhece. A mensagem da API já está em português. */
export function erroDaApi(status: number, codigo: string, mensagem: string): Error {
  if (codigo === "justificativa_obrigatoria") return new JustificativaObrigatoriaError();
  if (codigo === "medico_pulado" || codigo === "fora_da_recomendacao") {
    return new CandidatoInvalidoError(mensagem);
  }
  if (status === 401) return new SessaoExpiradaError();
  if (status === 403) return new EstadoInvalidoError("Este login não tem acesso a esta ação.");
  if (ENTRADA.has(codigo) || status === 422) {
    return new EntradaInvalidaError(mensagem || "Confira os campos e tente de novo.");
  }
  if (ESTADO.has(codigo)) return new EstadoInvalidoError(mensagem);
  return new EstadoInvalidoError(mensagem || "Não foi possível concluir. Tente de novo.");
}

async function comPrazo(url: string, init: RequestInit): Promise<Response> {
  const controle = new AbortController();
  const relogio = setTimeout(() => controle.abort(), PRAZO_MS);
  try {
    return await fetch(url, { ...init, signal: controle.signal });
  } finally {
    clearTimeout(relogio);
  }
}

async function corpoDoErro(resposta: Response): Promise<{ erro: string; mensagem: string }> {
  try {
    const corpo = (await resposta.json()) as {
      erro?: string;
      mensagem?: string;
    };
    return { erro: corpo.erro ?? "", mensagem: corpo.mensagem ?? "" };
  } catch {
    return { erro: "", mensagem: "" };
  }
}

/**
 * Uma chamada autenticada. Renova o token uma vez se a API disser 401, tenta de novo depois de um
 * 429 e trata falta de resposta e erro 5xx como "API indisponível".
 */
async function autenticada(
  opcoes: OpcoesHttp,
  montar: (token: string) => [string, RequestInit],
): Promise<Response> {
  const esperar = opcoes.esperar ?? esperarDeVerdade;
  let renovou = false;
  for (let tentativa = 0; ; tentativa++) {
    const token = await tokenDeAcesso(opcoes);
    let resposta: Response;
    try {
      resposta = await comPrazo(...montar(token));
    } catch (causa) {
      opcoes.aoFicarIndisponivel?.();
      throw new ApiIndisponivelError(causa);
    }
    if (resposta.status === 401 && !renovou) {
      renovou = true;
      await renovar(opcoes);
      continue;
    }
    if (resposta.status === 429 && tentativa < TENTATIVAS_429) {
      await esperar(1000 * (tentativa + 1));
      continue;
    }
    if (resposta.status >= 500 || resposta.status === 429) {
      opcoes.aoFicarIndisponivel?.();
      throw new ApiIndisponivelError(resposta.status);
    }
    return resposta;
  }
}

/** Chama a API de matching. O corpo, se houver, vai em JSON. */
export async function chamarApi<T>(
  opcoes: OpcoesHttp,
  metodo: "GET" | "POST",
  caminho: string,
  corpo?: unknown,
): Promise<T> {
  const resposta = await autenticada(opcoes, (token) => [
    `${opcoes.apiUrl}${caminho}`,
    {
      method: metodo,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(corpo === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    },
  ]);
  if (!resposta.ok) {
    const { erro, mensagem } = await corpoDoErro(resposta);
    throw erroDaApi(resposta.status, erro, mensagem);
  }
  return (resposta.status === 204 ? undefined : await resposta.json()) as T;
}

/** Lê do banco sob RLS, com a chave anônima e o login. `caminho` é o do PostgREST. */
export async function lerTabela<T>(opcoes: OpcoesHttp, caminho: string): Promise<T[]> {
  const resposta = await autenticada(opcoes, (token) => [
    `${opcoes.bancoUrl}/${caminho}`,
    { headers: { Authorization: `Bearer ${token}` } },
  ]);
  if (!resposta.ok) {
    if (resposta.status === 401) throw new SessaoExpiradaError();
    throw new EstadoInvalidoError("Não foi possível ler os dados. Tente de novo.");
  }
  return (await resposta.json()) as T[];
}
