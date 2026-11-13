import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TelaDeCredenciais } from "@/components/medico/tela-de-credenciais";
import { lerSessao } from "@/lib/session/servidor";

export const metadata: Metadata = { title: "Credenciais" };

/** O id vem da sessão, no servidor: a tela nunca escolhe de quem são as credenciais. */
export default async function Credenciais() {
  const sessao = await lerSessao();
  if (sessao?.papel !== "medico" || !sessao.personaId) redirect("/entrar?papel=medico");
  return <TelaDeCredenciais medicoId={sessao.personaId} />;
}
