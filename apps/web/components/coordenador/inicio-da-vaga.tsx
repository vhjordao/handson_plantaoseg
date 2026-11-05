import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { VAGA } from "@/lib/copy/coordenador";

/** O caminho de volta e o cabeçalho das telas de uma vaga. */
export function InicioDaVaga({ children }: { children: React.ReactNode }) {
  return (
    <header className="grid gap-2">
      <Link
        href="/coordenador/vagas"
        className="inline-flex min-h-[var(--alvo-min)] items-center gap-2 justify-self-start font-medium underline underline-offset-4 hover:no-underline"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        {VAGA.voltar}
      </Link>
      <div>{children}</div>
    </header>
  );
}
