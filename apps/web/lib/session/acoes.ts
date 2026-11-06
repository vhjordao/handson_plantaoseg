"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Papel } from "@/lib/api/types";
import { lerDestinos } from "@/lib/api/live/destinos";
import { encontrarPersona, listarPersonasDemo } from "./personas";
import { COOKIE_SESSAO, DURACAO_SESSAO_SEGUNDOS, destinoSeguro } from "./sessao";

/**
 * O cookie só leva `Secure` quando a conexão é https. No plano B (o build em `next start` num
 * notebook, aberto por http na rede local), um cookie `Secure` seria descartado pelo celular, e
 * "Entrar" voltaria para `/entrar` em laço. Na Vercel, o proxy informa `x-forwarded-proto: https`.
 */
async function conexaoSegura(): Promise<boolean> {
  const cabecalhos = await headers();
  const protocolo = cabecalhos.get("x-forwarded-proto");
  if (protocolo) return protocolo.split(",")[0].trim() === "https";
  return cabecalhos.get("origin")?.startsWith("https://") ?? false;
}

/** Abre a sessão da persona escolhida e segue para a rota pedida (ou para a inicial do papel). */
async function abrirSessao(papel: "coordenador" | "medico", formData: FormData): Promise<never> {
  const personaId = formData.get("personaId");
  const de = formData.get("de");
  const persona = encontrarPersona(papel, typeof personaId === "string" ? personaId : null);
  if (!persona) redirect(`/entrar?papel=${papel}`);

  await gravarSessao({ papel, personaId: persona.id, modo: "demo" });
  redirect(destinoSeguro(typeof de === "string" ? de : null, papel as Papel));
}

async function gravarSessao(sessao: {
  papel: "coordenador" | "medico";
  personaId: string | null;
  modo: "demo" | "live";
}): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_SESSAO, JSON.stringify(sessao), {
    httpOnly: true,
    sameSite: "lax",
    secure: await conexaoSegura(),
    path: "/",
    maxAge: DURACAO_SESSAO_SEGUNDOS,
  });
}

export type ResultadoDoLogin = { destino: string } | { erro: string };

/**
 * Abre a sessão do sistema real (D1 do ADR 0015). O papel não vem do navegador: o servidor pergunta
 * à API quem é o dono do token (`/me`), e o perfil vem do banco. O token não fica no cookie.
 */
export async function entrarComLogin(
  tokenDeAcesso: string,
  de: string | null,
): Promise<ResultadoDoLogin> {
  const destinos = lerDestinos();
  if (!destinos) return { erro: "O sistema real não está ligado neste endereço." };
  let perfil: { role: string; doctor_id: string | null };
  try {
    const resposta = await fetch(`${destinos.apiUrl}/me`, {
      headers: { Authorization: `Bearer ${tokenDeAcesso}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (resposta.status === 403) return { erro: "Este login ainda não tem acesso ao sistema." };
    if (!resposta.ok) return { erro: "Não foi possível confirmar o login. Tente de novo." };
    perfil = await resposta.json();
  } catch {
    return {
      erro: "O sistema real não respondeu. Tente de novo ou entre no modo de demonstração.",
    };
  }
  const papel = perfil.role === "doctor" ? "medico" : "coordenador";
  await gravarSessao({
    papel,
    personaId: papel === "medico" ? perfil.doctor_id : null,
    modo: "live",
  });
  return { destino: destinoSeguro(de, papel) };
}

/** O sistema real não respondeu: segue com a primeira persona do mesmo papel, no modo demonstração. */
export async function trocarParaDemonstracao(formData: FormData): Promise<void> {
  const papel = formData.get("papel") === "medico" ? "medico" : "coordenador";
  const { coordenadores, medicos } = listarPersonasDemo();
  const persona = papel === "medico" ? medicos[0] : coordenadores[0];
  if (!persona) redirect("/entrar");
  await gravarSessao({ papel, personaId: persona.id, modo: "demo" });
  redirect(destinoSeguro(null, papel));
}

export async function entrarComoCoordenador(formData: FormData): Promise<void> {
  await abrirSessao("coordenador", formData);
}

export async function entrarComoMedico(formData: FormData): Promise<void> {
  await abrirSessao("medico", formData);
}

/** Encerra a sessão da persona e volta à página inicial. */
export async function sair(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_SESSAO);
  redirect("/");
}
