import { ACOES } from "@/lib/copy/comum";

/** Primeiro ponto de Tab da página: leva direto ao conteúdo (WCAG 2.4.1). */
export function PularParaConteudo() {
  return (
    <a
      href="#conteudo"
      className="sr-only rounded-campo bg-tinta px-4 py-2 font-semibold text-sobre-tinta focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100]"
    >
      {ACOES.pularParaOConteudo}
    </a>
  );
}
