import { redirect } from "next/navigation";
import { CascaCoordenador } from "@/components/layout/casca-coordenador";
import { encontrarPersona, personaDoLogin } from "@/lib/session/personas";
import { lerSessao } from "@/lib/session/servidor";

/** O `proxy` já barra quem não tem sessão; aqui o servidor confere de novo e resolve a persona. */
export default async function LayoutCoordenador({ children }: LayoutProps<"/coordenador">) {
  const sessao = await lerSessao();
  const live = sessao?.modo === "live";
  const persona =
    sessao?.papel !== "coordenador"
      ? null
      : live
        ? personaDoLogin("coordenador", null)
        : encontrarPersona("coordenador", sessao.personaId);
  if (!persona || persona.papel !== "coordenador") redirect("/entrar?papel=coordenador");
  return (
    <CascaCoordenador persona={persona} modo={live ? "live" : "demo"}>
      {children}
    </CascaCoordenador>
  );
}
