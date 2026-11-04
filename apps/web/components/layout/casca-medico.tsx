import Link from "next/link";
import { Suspense } from "react";
import { FaixaDemonstracao } from "@/components/dominio/faixa-demonstracao";
import { MarcaPlantao } from "@/components/dominio/marca-plantao";
import { NavLink } from "@/components/layout/nav-link";
import { UserMenu } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";
import { ApiProvider } from "@/lib/api/provider";
import { ACOES } from "@/lib/copy/comum";
import { itensDaArea } from "@/lib/nav";
import type { Persona } from "@/lib/api/types";

type PersonaMedico = Extract<Persona, { papel: "medico" }>;

/**
 * A casca do médico, pensada para o celular: coluna estreita, **barra inferior** com Ofertas,
 * Contestações e Minha conta (alvos de 56 px, área segura do aparelho respeitada) e, no
 * computador, as mesmas três abas no topo. **Ajuda** fica no mesmo canto direito de sempre.
 */
export function CascaMedico({
  persona,
  children,
}: {
  persona: PersonaMedico;
  children: React.ReactNode;
}) {
  return (
    <>
      <FaixaDemonstracao />
      <header className="sticky top-0 z-30 border-b border-divisor bg-gaze">
        <div className="@container mx-auto flex min-h-14 w-full max-w-[960px] flex-wrap items-center justify-between gap-2 px-3 py-1 sm:px-4">
          <Link
            href="/medico/ofertas"
            aria-label="PlantãoSeguro, início da plataforma"
            className="inline-flex min-h-[var(--alvo-min)] items-center rounded-campo"
          >
            <MarcaPlantao compacta />
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link href="/ajuda">{ACOES.ajuda}</Link>
            </Button>
            <UserMenu
              nome={persona.medico.nome}
              descricao={`Médico, ${persona.medico.crm}`}
            />
          </div>
        </div>
        <nav aria-label="Principal" className="hidden border-t border-divisor md:block">
          <Suspense fallback={null}>
            <ul className="mx-auto flex w-full max-w-[960px] gap-1 px-4">
              {itensDaArea("medico").map((item) => (
                <li key={item.id}>
                  <NavLink area="medico" id={item.id} variante="superior" />
                </li>
              ))}
            </ul>
          </Suspense>
        </nav>
      </header>

      <main
        id="conteudo"
        tabIndex={-1}
        className="mx-auto w-full max-w-[640px] flex-1 p-4 pb-28 outline-none md:pb-10"
      >
        <ApiProvider>{children}</ApiProvider>
      </main>

      <nav
        aria-label="Principal"
        data-barra-inferior
        className="fixed inset-x-0 bottom-0 z-30 border-t border-divisor bg-papel pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <Suspense fallback={null}>
          <ul className="flex">
            {itensDaArea("medico").map((item) => (
              <li key={item.id} className="flex min-w-0 flex-1">
                <NavLink area="medico" id={item.id} variante="inferior" />
              </li>
            ))}
          </ul>
        </Suspense>
      </nav>
    </>
  );
}
