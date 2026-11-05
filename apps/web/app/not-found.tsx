import type { Metadata } from "next";
import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { FaixaDemonstracao } from "@/components/dominio/faixa-demonstracao";
import { MarcaPlantao } from "@/components/dominio/marca-plantao";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Página não encontrada" };

export default function NaoEncontrada() {
  return (
    <>
      <FaixaDemonstracao />
      <main
        id="conteudo"
        tabIndex={-1}
        className="mx-auto w-full max-w-[640px] flex-1 px-4 py-16 outline-none"
      >
        <Link
          href="/"
          aria-label="PlantãoSeguro, página inicial"
          className="inline-flex min-h-[var(--alvo-min)] items-center rounded-campo"
        >
          <MarcaPlantao />
        </Link>
        <EmptyState
          className="mt-10"
          icon={FileQuestion}
          headingLevel="h1"
          title="Não encontramos esta página"
          action={
            <Button asChild>
              <Link href="/">Voltar ao início</Link>
            </Button>
          }
        >
          O endereço pode ter mudado ou estar digitado errado. Volte ao início e entre pela
          demonstração.
        </EmptyState>
      </main>
    </>
  );
}
