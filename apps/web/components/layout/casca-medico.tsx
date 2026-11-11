import Link from "next/link";
import { Suspense } from "react";
import { ArteDeFundo } from "@/components/dominio/arte-de-fundo";
import { FaixaDemonstracao } from "@/components/dominio/faixa-demonstracao";
import { MarcaPlantao, SimboloPlantao } from "@/components/dominio/marca-plantao";
import { BotaoAjuda } from "@/components/layout/botao-ajuda";
import { BotaoTema } from "@/components/layout/botao-tema";
import { Caminho } from "@/components/layout/caminho";
import { ColunaDoMedico } from "@/components/layout/coluna-do-medico";
import { NavLink } from "@/components/layout/nav-link";
import { UserMenu } from "@/components/layout/user-menu";
import { ApiProvider } from "@/lib/api/provider";
import { itensDaArea } from "@/lib/nav";
import type { Persona } from "@/lib/api/types";

type PersonaMedico = Extract<Persona, { papel: "medico" }>;

/**
 * A casca do médico, pensada para o celular: coluna estreita e **barra inferior** com Ofertas,
 * Contestações e Minha conta (alvos de 56 px, área segura do aparelho respeitada). No
 * computador, a mesma barra superior do coordenador, com as três abas em pílulas no centro.
 * **Ajuda** fica no mesmo canto direito de sempre.
 */
export function CascaMedico({
  persona,
  modo = "demo",
  children,
}: {
  persona: PersonaMedico;
  modo?: "demo" | "live";
  children: React.ReactNode;
}) {
  return (
    <>
      <ArteDeFundo />
      <FaixaDemonstracao />
      <header className="vidro sticky top-0 z-30 border-b border-divisor/70">
        <div className="@container mx-auto flex min-h-16 w-full max-w-[1240px] flex-wrap items-center gap-2 px-3 py-2 sm:gap-3 sm:px-6">
          <Link
            href="/medico"
            aria-label="PlantãoSeguro, início da plataforma"
            className="inline-flex min-h-[var(--alvo-min)] shrink-0 items-center rounded-campo"
          >
            <span className="sm:hidden">
              <SimboloPlantao />
            </span>
            <span className="hidden sm:inline-flex">
              <MarcaPlantao />
            </span>
          </Link>
          <nav aria-label="Principal" className="hidden min-w-0 flex-1 justify-center md:flex">
            <Suspense fallback={null}>
              <ul className="flex items-center gap-1.5">
                {itensDaArea("medico").map((item) => (
                  <li key={item.id}>
                    <NavLink area="medico" id={item.id} variante="superior" />
                  </li>
                ))}
              </ul>
            </Suspense>
          </nav>
          <div className="flex-1 md:hidden" />
          <BotaoTema />
          <BotaoAjuda />
          <UserMenu nome={persona.medico.nome} descricao={`Médico, ${persona.medico.crm}`} />
        </div>
      </header>

      <main
        id="conteudo"
        tabIndex={-1}
        className="mx-auto w-full max-w-[1240px] flex-1 px-4 pt-4 pb-28 outline-none sm:px-6 md:pt-5 md:pb-12"
      >
        <Suspense fallback={null}>
          <ColunaDoMedico>
            <div className="mb-4">
              <Caminho area="medico" />
            </div>
            <ApiProvider modo={modo} papel="medico">
              {children}
            </ApiProvider>
          </ColunaDoMedico>
        </Suspense>
      </main>

      <nav
        aria-label="Principal"
        data-barra-inferior
        className="fixed inset-x-0 bottom-0 z-30 border-t border-divisor bg-papel/95 px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] shadow-flutuante backdrop-blur md:hidden"
      >
        <Suspense fallback={null}>
          <ul className="flex gap-1">
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
