"use client";

import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

/** Erro inesperado: diz o que houve e o que fazer, sem culpar a pessoa e sem jargão. */
export default function Erro({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="conteudo" tabIndex={-1} className="mx-auto w-full max-w-[640px] flex-1 px-4 py-16 outline-none">
      <title>Algo deu errado | PlantãoSeguro</title>
      <EmptyState
        icon={TriangleAlert}
        headingLevel="h1"
        title="Algo deu errado nesta tela"
        action={
          <div className="flex flex-wrap gap-3">
            <Button onClick={reset}>Tentar de novo</Button>
            <Button asChild variant="secondary">
              <Link href="/">Voltar ao início</Link>
            </Button>
          </div>
        }
      >
        Não foi possível mostrar esta página agora. Tente de novo; se continuar, volte ao início e
        entre pela demonstração. Nada do que você fez foi perdido, porque tudo aqui é simulação.
      </EmptyState>
    </main>
  );
}
