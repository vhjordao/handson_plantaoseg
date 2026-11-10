import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TelaDeContestacoes } from "@/components/medico/tela-de-contestacoes";
import { lerSessao } from "@/lib/session/servidor";

export const metadata: Metadata = { title: "Contestações" };

export default async function Contestacoes() {
  const sessao = await lerSessao();
  if (sessao?.papel !== "medico" || !sessao.personaId) redirect("/entrar?papel=medico");
  return <TelaDeContestacoes medicoId={sessao.personaId} />;
}
