import Link from "next/link";
import { Suspense } from "react";
import { FaixaDemonstracao } from "@/components/dominio/faixa-demonstracao";
import { MarcaPlantao, SimboloPlantao } from "@/components/dominio/marca-plantao";
import { MenuMobile } from "@/components/layout/menu-mobile";
import { NavLink } from "@/components/layout/nav-link";
import { UserMenu } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";
import { ApiProvider } from "@/lib/api/provider";
import { ACOES } from "@/lib/copy/comum";
import { AGORA_DEMO } from "@/lib/demo-ancora";
import { formatarAgora } from "@/lib/format/datas";
import { itensDaArea } from "@/lib/nav";
import type { Persona } from "@/lib/api/types";

type PersonaCoordenador = Extract<Persona, { papel: "coordenador" }>;

/**
 * A casca do coordenador: barra lateral no computador (só com ícones no tablet estreito),
 * menu em gaveta no celular e um cabeçalho fixo com o hospital, o relógio da simulação,
 * **Ajuda** (sempre no mesmo lugar, WCAG 3.2.6) e o menu da persona.
 */
export function CascaCoordenador({
  persona,
  children,
}: {
  persona: PersonaCoordenador;
  children: React.ReactNode;
}) {
  const hospital = `${persona.unidade.nome} (fictício)`;
  const agora = `Hoje (simulado): ${formatarAgora(AGORA_DEMO)}`;

  return (
    <>
      <FaixaDemonstracao />
      <div className="flex flex-1">
        <aside className="sticky top-0 hidden h-dvh w-16 shrink-0 flex-col border-r border-divisor bg-papel md:flex lg:w-[248px]">
          <div className="flex h-14 items-center justify-center border-b border-divisor px-3 lg:justify-start lg:px-4">
            <Link
              href="/coordenador/vagas"
              aria-label="PlantãoSeguro, início da plataforma"
              className="inline-flex min-h-[var(--alvo-min)] items-center rounded-campo"
            >
              <span className="lg:hidden">
                <SimboloPlantao />
              </span>
              <span className="hidden lg:inline-flex">
                <MarcaPlantao />
              </span>
            </Link>
          </div>
          <nav aria-label="Principal" className="flex-1 overflow-y-auto p-2">
            <Suspense fallback={null}>
              <ul className="grid gap-1">
                {itensDaArea("coordenador").map((item) => (
                  <li key={item.id}>
                    <NavLink area="coordenador" id={item.id} variante="lateral" recolhivel />
                  </li>
                ))}
              </ul>
            </Suspense>
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex min-h-14 flex-wrap items-center gap-2 border-b border-divisor bg-gaze px-3 py-1 sm:px-4">
            <Suspense fallback={null}>
              <MenuMobile area="coordenador" className="md:hidden" />
            </Suspense>
            <Link
              href="/coordenador/vagas"
              aria-label="PlantãoSeguro, início da plataforma"
              className="inline-flex min-h-[var(--alvo-min)] items-center rounded-campo md:hidden"
            >
              <SimboloPlantao />
            </Link>
            <div className="hidden min-w-0 flex-1 sm:block">
              <p className="truncate text-sm font-semibold">{hospital}</p>
              <p className="truncate text-sm text-tinta-suave">{agora}</p>
            </div>
            <div className="flex-1 sm:hidden" />
            <Button asChild variant="ghost">
              <Link href="/ajuda">{ACOES.ajuda}</Link>
            </Button>
            <UserMenu nome={persona.nome} descricao={`${persona.cargo}, ${persona.unidade.nome}`} />
          </header>

          <main id="conteudo" tabIndex={-1} className="flex-1 p-4 outline-none md:p-6">
            <p className="mb-4 text-sm text-tinta-suave sm:hidden">
              {hospital}. {agora}.
            </p>
            <ApiProvider coordenadorId={persona.id}>{children}</ApiProvider>
          </main>
        </div>
      </div>
    </>
  );
}
