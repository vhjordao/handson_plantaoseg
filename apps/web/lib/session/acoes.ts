"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_SESSAO } from "./sessao";

/** Encerra a sessão da persona e volta à página inicial. */
export async function sair(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_SESSAO);
  redirect("/");
}
