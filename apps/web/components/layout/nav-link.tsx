"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ItemDeNavegacao } from "@/lib/nav";
import { cn } from "@/lib/utils";

/**
 * Link de navegação com o estado atual dito de três jeitos: `aria-current`, fundo e uma
 * barra no lado. A cor sozinha nunca é o sinal.
 */
export function NavLink({
  item,
  variante,
  aoNavegar,
  recolhivel = false,
}: {
  item: ItemDeNavegacao;
  variante: "lateral" | "inferior" | "superior";
  aoNavegar?: () => void;
  /** Na barra lateral estreita (tablet), mostra só o ícone; o nome fica para o leitor de tela. */
  recolhivel?: boolean;
}) {
  const caminho = usePathname();
  const ativo = item.ativo(caminho);
  const Icone = item.icone;

  return (
    <Link
      href={item.href}
      aria-current={ativo ? "page" : undefined}
      onClick={aoNavegar}
      title={recolhivel ? item.rotulo : undefined}
      className={cn(
        "flex items-center rounded-campo text-base transition-colors duration-150",
        recolhivel && "max-lg:justify-center max-lg:px-0",
        variante === "lateral" &&
          "min-h-[var(--alvo-min)] gap-3 border-l-4 px-3 py-2 hover:bg-tinta/10",
        variante === "lateral" &&
          (ativo ? "border-tinta bg-tinta/10 font-semibold" : "border-transparent font-medium"),
        variante === "superior" &&
          "min-h-[var(--alvo-min)] gap-2 border-b-4 px-3 py-2 hover:bg-tinta/10",
        variante === "superior" &&
          (ativo ? "border-tinta font-semibold" : "border-transparent font-medium"),
        variante === "inferior" &&
          "min-h-14 flex-1 flex-col justify-center gap-0.5 border-t-4 px-2 py-1 text-sm hover:bg-tinta/10",
        variante === "inferior" &&
          (ativo ? "border-tinta font-semibold" : "border-transparent font-medium text-tinta-suave"),
      )}
    >
      <Icone aria-hidden="true" className="size-5 shrink-0" />
      <span className={cn(recolhivel && "max-lg:sr-only")}>{item.rotulo}</span>
    </Link>
  );
}
