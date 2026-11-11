import { Construction } from "lucide-react";
import { IconeEmCirculo, Painel } from "@/components/ui/painel";

/**
 * Tela que o plano prevê mas que ainda não foi feita. Em vez de uma página vazia, diz o que ela
 * vai fazer e em que fase chega, com franqueza. A fase de cada tela está em docs/design/prompt-frontend.md, seção 16.
 */
export function TelaEmConstrucao({ titulo, descricao }: { titulo: string; descricao: string }) {
  return (
    <div className="mx-auto w-full max-w-[720px]">
      <h1 className="font-titulo text-[1.75rem] leading-9 font-medium sm:text-[2rem] sm:leading-10">
        {titulo}
      </h1>
      <Painel className="mt-5 flex items-start gap-4">
        <IconeEmCirculo icone={Construction} tom="atencao" />
        <div className="min-w-0">
          <p className="font-semibold">Esta tela ainda está em construção</p>
          <p className="mt-1 text-tinta-suave">{descricao}</p>
        </div>
      </Painel>
    </div>
  );
}
