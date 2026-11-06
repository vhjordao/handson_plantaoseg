import { redirect } from "next/navigation";
import { CascaMedico } from "@/components/layout/casca-medico";
import { encontrarPersona, personaDoLogin } from "@/lib/session/personas";
import { lerSessao } from "@/lib/session/servidor";

/** O `proxy` já barra quem não tem sessão; aqui o servidor confere de novo e resolve a persona. */
export default async function LayoutMedico({ children }: LayoutProps<"/medico">) {
  const sessao = await lerSessao();
  const live = sessao?.modo === "live";
  const persona =
    sessao?.papel !== "medico"
      ? null
      : live
        ? personaDoLogin("medico", sessao.personaId)
        : encontrarPersona("medico", sessao.personaId);
  if (!persona || persona.papel !== "medico") redirect("/entrar?papel=medico");
  return (
    <CascaMedico persona={persona} modo={live ? "live" : "demo"}>
      {children}
    </CascaMedico>
  );
}
