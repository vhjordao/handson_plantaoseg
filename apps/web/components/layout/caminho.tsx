"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { itensDaArea, type AreaDeNavegacao } from "@/lib/nav";

const RAIZ: Record<AreaDeNavegacao, { rotulo: string; href: string }> = {
  coordenador: { rotulo: "Coordenação", href: "/coordenador/vagas" },
  medico: { rotulo: "Médico", href: "/medico" },
};

/**
 * O caminho até a página atual ("Coordenação › Vagas › Detalhes da vaga"), montado a partir do
 * menu: não precisa de configuração por página. Só os passos anteriores são links.
 */
export function Caminho({ area }: { area: AreaDeNavegacao }) {
  const caminho = usePathname();
  const item = itensDaArea(area).find((i) => i.ativo(caminho));
  const passos: { rotulo: string; href?: string }[] = [{ rotulo: RAIZ[area].rotulo, href: RAIZ[area].href }];
  if (item) {
    const maisFundo = caminho !== item.href && caminho.startsWith(`${item.href}/`);
    passos.push({ rotulo: item.rotulo, href: maisFundo ? item.href : undefined });
    if (maisFundo) passos.push({ rotulo: area === "coordenador" ? "Detalhes da vaga" : "Detalhes" });
  }

  return (
    <nav aria-label="Você está em" className="min-w-0">
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-sm text-tinta-suave">
        {passos.map((passo, i) => {
          const ultimo = i === passos.length - 1;
          return (
            <li key={`${passo.rotulo}-${i}`} className="inline-flex items-center gap-1">
              {passo.href && !ultimo ? (
                <Link href={passo.href} className="inline-flex min-h-6 items-center rounded-sm underline-offset-4 hover:text-tinta hover:underline">
                  {passo.rotulo}
                </Link>
              ) : (
                <span className={ultimo ? "font-medium text-tinta" : undefined}>{passo.rotulo}</span>
              )}
              {!ultimo ? <ChevronRight aria-hidden="true" className="size-3.5 opacity-70" /> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
