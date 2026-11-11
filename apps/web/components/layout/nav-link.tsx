"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { encontrarItem, type AreaDeNavegacao } from "@/lib/nav";
import { cn } from "@/lib/utils";

/**
 * Link de navegação com o estado atual dito de três jeitos: `aria-current`, fundo e uma
 * barra no lado. A cor sozinha nunca é o sinal.
 *
 * Recebe só texto (`area` e `id`): o item, com a função `ativo` e o ícone, é resolvido aqui no
 * cliente, porque funções não atravessam a fronteira entre servidor e cliente.
 */
export function NavLink({
  area,
  id,
  variante,
  aoNavegar,
  recolhivel = false,
}: {
  area: AreaDeNavegacao;
  id: string;
  variante: "lateral" | "inferior" | "superior";
  aoNavegar?: () => void;
  /** Na barra lateral estreita (tablet), mostra só o ícone; o nome fica para o leitor de tela. */
  recolhivel?: boolean;
}) {
  const caminho = usePathname();
  const item = encontrarItem(area, id);
  if (!item) return null;
  const ativo = item.ativo(caminho);
  const Icone = item.icone;

  return (
    <Link
      href={item.href}
      aria-current={ativo ? "page" : undefined}
      onClick={aoNavegar}
      title={recolhivel ? item.rotulo : undefined}
      className={cn(
        "flex items-center text-base transition-[background-color,color,box-shadow] duration-150",
        recolhivel && "max-lg:justify-center max-lg:px-0",
        // Item atual: muda o fundo, o peso e a cor, e ganha um traço de 3 px (lateral e inferior)
        // ou vira um bloco de papel elevado (superior, como as abas). A cor sozinha nunca é o sinal.
        variante === "lateral" &&
          "min-h-[var(--alvo-min)] gap-3 rounded-campo px-3 py-2 hover:bg-tinta/[0.06]",
        variante === "lateral" &&
          (ativo
            ? "bg-acento-tom font-semibold text-acento-forte shadow-[inset_3px_0_0_var(--acento)]"
            : "font-medium text-tinta-suave hover:text-tinta"),
        variante === "superior" &&
          "min-h-[var(--alvo-min)] gap-2 rounded-campo border px-4 py-2",
        variante === "superior" &&
          (ativo
            ? "border-divisor bg-papel font-semibold text-acento-forte shadow-cartao"
            : "border-transparent font-medium text-tinta-suave hover:bg-tinta/[0.06] hover:text-tinta"),
        variante === "inferior" &&
          "min-h-14 min-w-0 flex-1 flex-col justify-center gap-0.5 rounded-campo px-2 py-1 text-center text-sm",
        variante === "inferior" &&
          (ativo
            ? "bg-acento-tom font-semibold text-acento-forte shadow-[inset_0_-3px_0_var(--acento)]"
            : "font-medium text-tinta-suave"),
      )}
    >
      <Icone aria-hidden="true" className="size-5 shrink-0" />
      <span
        className={cn(
          recolhivel && "max-lg:sr-only",
          // Com a letra muito ampliada, "Contestações" quebra em vez de passar da tela.
          variante === "inferior" && "[overflow-wrap:anywhere]",
        )}
      >
        {item.rotulo}
      </span>
    </Link>
  );
}
