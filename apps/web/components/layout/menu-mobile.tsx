"use client";

import * as React from "react";
import Link from "next/link";
import { CircleHelp, Menu } from "lucide-react";
import { MarcaPlantao } from "@/components/dominio/marca-plantao";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { NavLink } from "@/components/layout/nav-link";
import { itensDaArea, type AreaDeNavegacao } from "@/lib/nav";

/** O menu de navegação do celular e do tablet estreito: abre como gaveta e fecha ao navegar. */
export function MenuMobile({
  area,
  className,
}: {
  area: AreaDeNavegacao;
  className?: string;
}) {
  const [aberto, setAberto] = React.useState(false);
  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className={className} aria-label="Abrir o menu">
          <Menu aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent side="left" closeLabel="Fechar o menu">
        <DialogTitle>
          <MarcaPlantao />
        </DialogTitle>
        <DialogDescription className="sr-only">Navegação principal da plataforma</DialogDescription>
        <nav aria-label="Principal" className="mt-6">
          <ul className="grid gap-1">
            {itensDaArea(area).map((item) => (
              <li key={item.id}>
                <NavLink
                  area={area}
                  id={item.id}
                  variante="lateral"
                  aoNavegar={() => setAberto(false)}
                />
              </li>
            ))}
            <li className="mt-3 border-t border-divisor pt-3">
              <Link
                href="/ajuda"
                onClick={() => setAberto(false)}
                className="flex min-h-[var(--alvo-min)] items-center gap-3 rounded-campo px-3 py-2 text-base font-medium hover:bg-tinta/[0.06]"
              >
                <CircleHelp aria-hidden="true" className="size-5" />
                Ajuda
              </Link>
            </li>
          </ul>
        </nav>
      </DialogContent>
    </Dialog>
  );
}
