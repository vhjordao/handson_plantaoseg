/**
 * Sessão por persona, sem senha (WCAG 3.3.8; ADR 0011).
 *
 * O cookie guarda só `{papel, personaId}`: nada pessoal. Na demonstração ele **não é assinado**,
 * porque tudo é simulação e não há dado real a proteger. No modo `live`, a persona passa a ser
 * um login anônimo do Supabase e este cookie deixa de ser a fonte da verdade.
 */
import { SessaoSchema, type Papel, type Sessao } from "@/lib/api/types";

export const COOKIE_SESSAO = "ps_sessao";
export const DURACAO_SESSAO_SEGUNDOS = 60 * 60 * 8;

export const ROTA_INICIAL: Record<Papel, string> = {
  coordenador: "/coordenador/vagas",
  medico: "/medico/ofertas",
  telao: "/telao",
};

export function lerSessaoDoValor(valor: string | undefined): Sessao | null {
  if (!valor) return null;
  try {
    const resultado = SessaoSchema.safeParse(JSON.parse(valor));
    return resultado.success ? resultado.data : null;
  } catch {
    return null;
  }
}

/** Só aceita voltar para uma rota do mesmo papel, para o parâmetro `de` não virar redirecionamento aberto. */
export function destinoSeguro(de: string | null | undefined, papel: Papel): string {
  if (de && de.startsWith(`/${papel}`) && !de.startsWith("//")) return de;
  return ROTA_INICIAL[papel];
}
