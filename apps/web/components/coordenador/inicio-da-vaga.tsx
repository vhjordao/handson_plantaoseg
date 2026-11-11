import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { VAGA } from "@/lib/copy/coordenador";

/** O caminho de volta e o cabeçalho das telas de uma vaga. */
export function InicioDaVaga({ children }: { children: React.ReactNode }) {
  return (
    <header className="grid gap-3">
      <Link
        href="/coordenador/vagas"
        className="inline-flex min-h-[var(--alvo-min)] items-center gap-2 justify-self-start rounded-full border border-painel-borda bg-papel/70 px-3.5 text-sm font-medium shadow-cartao transition-[background-color] duration-150 hover:bg-papel"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        {VAGA.voltar}
      </Link>
      <div>{children}</div>
    </header>
  );
}
