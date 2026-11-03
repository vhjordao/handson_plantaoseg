import { cookies } from "next/headers";
import type { Sessao } from "@/lib/api/types";
import { COOKIE_SESSAO, lerSessaoDoValor } from "./sessao";

/** A sessão da requisição atual, lida no servidor. `null` se não houver ou se for inválida. */
export async function lerSessao(): Promise<Sessao | null> {
  const jar = await cookies();
  return lerSessaoDoValor(jar.get(COOKIE_SESSAO)?.value);
}
