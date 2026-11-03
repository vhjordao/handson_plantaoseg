import { redirect } from "next/navigation";
import { CascaMedico } from "@/components/layout/casca-medico";
import { encontrarPersona } from "@/lib/session/personas";
import { lerSessao } from "@/lib/session/servidor";

/** O `proxy` já barra quem não tem sessão; aqui o servidor confere de novo e resolve a persona. */
export default async function LayoutMedico({ children }: LayoutProps<"/medico">) {
  const sessao = await lerSessao();
  const persona = sessao?.papel === "medico" ? encontrarPersona("medico", sessao.personaId) : null;
  if (!persona || persona.papel !== "medico") redirect("/entrar?papel=medico");
  return <CascaMedico persona={persona}>{children}</CascaMedico>;
}
