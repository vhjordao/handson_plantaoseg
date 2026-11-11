import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PainelDoMedico } from "@/components/medico/painel-do-medico";
import { encontrarPersona, personaDoLogin } from "@/lib/session/personas";
import { lerSessao } from "@/lib/session/servidor";

export const metadata: Metadata = { title: "Início" };

/**
 * O painel inicial do médico. O id vem da sessão, no servidor: a tela nunca escolhe de quem são
 * as ofertas. No sistema real, o perfil vem do login; no modo de demonstração, da persona.
 */
export default async function MedicoInicio() {
  const sessao = await lerSessao();
  if (sessao?.papel !== "medico" || !sessao.personaId) redirect("/entrar?papel=medico");
  const persona =
    sessao.modo === "live"
      ? personaDoLogin("medico", sessao.personaId)
      : encontrarPersona("medico", sessao.personaId);
  const medico = persona?.papel === "medico" ? persona.medico : null;
  return <PainelDoMedico medicoId={sessao.personaId} medico={medico} />;
}
