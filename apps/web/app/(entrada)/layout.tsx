import { ArteDeFundo } from "@/components/dominio/arte-de-fundo";
import { FaixaDemonstracao } from "@/components/dominio/faixa-demonstracao";
import { CabecalhoPublico } from "@/components/layout/cabecalho-publico";
import { RodapePublico } from "@/components/layout/rodape-publico";

/**
 * Casca da entrada: o mesmo aviso e o mesmo rodapé do site, mas com o cabeçalho enxuto (marca e
 * Ajuda). Quem está aqui já veio para entrar, então o botão "Entrar" e as âncoras da landing só
 * atrapalhariam.
 */
export default function LayoutEntrada({ children }: LayoutProps<"/">) {
  return (
    <>
      <ArteDeFundo variante="rede" />
      <FaixaDemonstracao />
      <CabecalhoPublico enxuto />
      <main id="conteudo" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <RodapePublico />
    </>
  );
}
