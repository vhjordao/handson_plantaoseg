"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * A largura da área do médico: o painel inicial usa a largura toda, como o painel do modelo
 * visual; as outras telas (ofertas, contestações e conta) ficam numa coluna estreita, que se
 * lê melhor no celular e no computador.
 */
export function ColunaDoMedico({ children }: { children: React.ReactNode }) {
  const caminho = usePathname();
  return <div className={cn("mx-auto w-full", caminho === "/medico" ? "" : "max-w-[760px]")}>{children}</div>;
}
