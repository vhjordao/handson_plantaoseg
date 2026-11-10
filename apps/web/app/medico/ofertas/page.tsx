import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TelaDeOfertas } from "@/components/medico/tela-de-ofertas";
import { lerSessao } from "@/lib/session/servidor";

export const metadata: Metadata = { title: "Ofertas" };

/** O id do médico vem da sessão, no servidor: a tela nunca escolhe de quem são as ofertas. */
export default async function Ofertas() {
  const sessao = await lerSessao();
  if (sessao?.papel !== "medico" || !sessao.personaId) redirect("/entrar?papel=medico");
  return <TelaDeOfertas medicoId={sessao.personaId} />;
}
