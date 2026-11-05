import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ACOES } from "@/lib/copy/comum";
import { FIM } from "@/lib/copy/landing";

export function Fim() {
  return (
    <section aria-labelledby="titulo-fim" className="border-t border-divisor bg-papel">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col items-start gap-5 px-4 py-14 sm:px-6 lg:py-20">
        <h2 id="titulo-fim" className="font-serif text-3xl font-semibold">
          {FIM.titulo}
        </h2>
        <p className="max-w-[56ch] text-lg text-tinta-suave">{FIM.texto}</p>
        <Button asChild size="lg">
          <Link href="/entrar">{ACOES.entrarNaDemonstracao}</Link>
        </Button>
      </div>
    </section>
  );
}
