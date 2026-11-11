import { Fustat } from "next/font/google";
import { FaixaDemonstracao } from "@/components/dominio/faixa-demonstracao";
import { CabecalhoPublico } from "@/components/layout/cabecalho-publico";
import { RodapePublico } from "@/components/layout/rodape-publico";

// Títulos da página inicial. Um peso só e só o alfabeto latino: cerca de 25 KB, baixados apenas
// nas páginas públicas (a plataforma não carrega esta fonte).
const fustat = Fustat({
  variable: "--font-fustat",
  subsets: ["latin"],
  weight: ["700"],
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

/** Casca do site público: aviso de demonstração, cabeçalho, conteúdo e rodapé. */
export default function LayoutPublico({ children }: LayoutProps<"/">) {
  return (
    <div className={`${fustat.variable} contents`}>
      <FaixaDemonstracao />
      <CabecalhoPublico />
      <main id="conteudo" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <RodapePublico />
    </div>
  );
}
