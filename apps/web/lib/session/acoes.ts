"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Papel } from "@/lib/api/types";
import { encontrarPersona } from "./personas";
import { COOKIE_SESSAO, DURACAO_SESSAO_SEGUNDOS, destinoSeguro } from "./sessao";

/** Abre a sessão da persona escolhida e segue para a rota pedida (ou para a inicial do papel). */
async function abrirSessao(papel: "coordenador" | "medico", formData: FormData): Promise<never> {
  const personaId = formData.get("personaId");
  const de = formData.get("de");
  const persona = encontrarPersona(papel, typeof personaId === "string" ? personaId : null);
  if (!persona) redirect(`/entrar?papel=${papel}`);

  const jar = await cookies();
  jar.set(COOKIE_SESSAO, JSON.stringify({ papel, personaId: persona.id }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DURACAO_SESSAO_SEGUNDOS,
  });
  redirect(destinoSeguro(typeof de === "string" ? de : null, papel as Papel));
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
