import { ArteDeFundo } from "@/components/dominio/arte-de-fundo";
import { FaixaDemonstracao } from "@/components/dominio/faixa-demonstracao";
import { CabecalhoPublico } from "@/components/layout/cabecalho-publico";
import { RodapePublico } from "@/components/layout/rodape-publico";

/** Casca do site público: aviso de demonstração, cabeçalho, conteúdo e rodapé. */
export default function LayoutPublico({ children }: LayoutProps<"/">) {
  return (
    <>
      <ArteDeFundo />
      <FaixaDemonstracao />
      <CabecalhoPublico />
      <main id="conteudo" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <RodapePublico />
    </>
  );
}
