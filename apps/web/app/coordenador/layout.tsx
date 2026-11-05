import { redirect } from "next/navigation";
import { CascaCoordenador } from "@/components/layout/casca-coordenador";
import { encontrarPersona } from "@/lib/session/personas";
import { lerSessao } from "@/lib/session/servidor";

/** O `proxy` já barra quem não tem sessão; aqui o servidor confere de novo e resolve a persona. */
export default async function LayoutCoordenador({ children }: LayoutProps<"/coordenador">) {
  const sessao = await lerSessao();
  const persona =
    sessao?.papel === "coordenador" ? encontrarPersona("coordenador", sessao.personaId) : null;
  if (!persona || persona.papel !== "coordenador") redirect("/entrar?papel=coordenador");
  return <CascaCoordenador persona={persona}>{children}</CascaCoordenador>;
}
