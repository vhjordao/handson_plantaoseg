import type { Metadata } from "next";
import Link from "next/link";
import { FilePlus2 } from "lucide-react";
import { PainelDeVagas } from "@/components/coordenador/painel-de-vagas";
import { Button } from "@/components/ui/button";
import { CabecalhoDePagina } from "@/components/ui/cabecalho-de-pagina";

export const metadata: Metadata = { title: "Vagas" };

export default function Vagas() {
  return (
    <div className="grid gap-5">
      <CabecalhoDePagina
        titulo="Vagas"
        descricao="As vagas da rede, do pedido em texto livre à oferta aceita. Você decide quem recebe cada oferta."
        acoes={
          <Button asChild variant="escuro">
            <Link href="/coordenador/vagas/nova">
              <FilePlus2 aria-hidden="true" />
              Nova vaga
            </Link>
          </Button>
        }
      />
      <PainelDeVagas />
    </div>
  );
}
