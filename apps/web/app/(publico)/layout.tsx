import "@fontsource/open-sauce-one/latin-400.css";
import "@fontsource/open-sauce-one/latin-600.css";
import "@fontsource/open-sauce-one/latin-700.css";
import "@fontsource/open-sauce-one/latin-800.css";
import { FaixaDemonstracao } from "@/components/dominio/faixa-demonstracao";
import { CabecalhoPublico } from "@/components/layout/cabecalho-publico";
import { RodapePublico } from "@/components/layout/rodape-publico";

/**
 * Casca do site público: aviso de demonstração, cabeçalho, conteúdo e rodapé. O texto usa a Open
 * Sauce One (OFL), servida pelo próprio site e baixada só nas páginas públicas: quatro pesos, só o
 * alfabeto latino, cerca de 24 KB cada.
 */
export default function LayoutPublico({ children }: LayoutProps<"/">) {
  return (
    <div className="fonte-vitrine contents">
      <FaixaDemonstracao />
      <CabecalhoPublico />
      <main id="conteudo" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <RodapePublico />
    </div>
  );
}
