import type { Metadata } from "next";
import Link from "next/link";
import { FilePlus2 } from "lucide-react";
import { PainelDeVagas } from "@/components/coordenador/painel-de-vagas";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Vagas" };

export default function Vagas() {
  return (
    <div className="mx-auto grid w-full max-w-[1100px] gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-semibold">Vagas</h1>
          <p className="mt-1 max-w-[56ch] text-tinta-suave">
            As vagas da rede, do pedido em texto livre à oferta aceita. Você decide quem recebe cada
            oferta.
          </p>
        </div>
        <Button asChild>
          <Link href="/coordenador/vagas/nova">
            <FilePlus2 aria-hidden="true" />
            Nova vaga
          </Link>
        </Button>
      </header>
      <PainelDeVagas />
    </div>
  );
}
