import Link from "next/link";
import { Suspense } from "react";
import { Building2, CalendarClock } from "lucide-react";
import { ArteDeFundo } from "@/components/dominio/arte-de-fundo";
import { FaixaDemonstracao } from "@/components/dominio/faixa-demonstracao";
import { MarcaPlantao, SimboloPlantao } from "@/components/dominio/marca-plantao";
import { BotaoAjuda } from "@/components/layout/botao-ajuda";
import { BotaoTema } from "@/components/layout/botao-tema";
import { Caminho } from "@/components/layout/caminho";
import { MenuMobile } from "@/components/layout/menu-mobile";
import { NavLink } from "@/components/layout/nav-link";
import { UserMenu } from "@/components/layout/user-menu";
import { ApiProvider } from "@/lib/api/provider";
import { AGORA_DEMO } from "@/lib/demo-ancora";
import { formatarAgora } from "@/lib/format/datas";
import { agoraLocal } from "@/lib/api/live/tempo";
import { itensDaArea } from "@/lib/nav";
import type { Persona } from "@/lib/api/types";

type PersonaCoordenador = Extract<Persona, { papel: "coordenador" }>;

/**
 * A casca do coordenador, no desenho do modelo visual: uma barra superior translúcida com a
 * marca, o menu em pílulas no centro, **Ajuda** (sempre no mesmo lugar, WCAG 3.2.6) e a pessoa
 * à direita. Abaixo dela, o caminho da página e, do outro lado, o hospital e o relógio. Abaixo
 * de 1024 px o menu vai para a gaveta.
 */
export function CascaCoordenador({
  persona,
  modo = "demo",
  children,
}: {
  persona: PersonaCoordenador;
  modo?: "demo" | "live";
  children: React.ReactNode;
}) {
  const hospital = `${persona.unidade.nome} (fictício)`;
  // No sistema real, o relógio é o de São Paulo agora; na demonstração, a âncora fixa.
  const agora =
    modo === "live"
      ? `Agora: ${formatarAgora(agoraLocal())}`
      : `Hoje (simulado): ${formatarAgora(AGORA_DEMO)}`;

  return (
    <>
      <ArteDeFundo />
      <FaixaDemonstracao />
      <header className="vidro sticky top-0 z-30 border-b border-divisor/70">
        <div className="mx-auto flex min-h-16 w-full max-w-[1400px] flex-wrap items-center gap-2 px-3 py-2 sm:gap-3 sm:px-6">
          <Suspense fallback={null}>
            <MenuMobile area="coordenador" className="lg:hidden" />
          </Suspense>
          <Link
            href="/coordenador/vagas"
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
          <nav aria-label="Principal" className="hidden min-w-0 flex-1 justify-center lg:flex">
            <Suspense fallback={null}>
              <ul className="flex items-center gap-1">
                {itensDaArea("coordenador").map((item) => (
                  <li key={item.id}>
                    <NavLink area="coordenador" id={item.id} variante="superior" />
                  </li>
                ))}
              </ul>
            </Suspense>
          </nav>
          <div className="flex-1 lg:hidden" />
          <BotaoTema />
          <BotaoAjuda />
          <UserMenu nome={persona.nome} descricao={`${persona.cargo}, ${persona.unidade.nome}`} />
        </div>
      </header>

      <main
        id="conteudo"
        tabIndex={-1}
        className="mx-auto w-full max-w-[1400px] flex-1 px-4 pt-4 pb-10 outline-none sm:px-6 lg:pt-5"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <Suspense fallback={null}>
            <Caminho area="coordenador" />
          </Suspense>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-tinta-suave">
            <span className="inline-flex items-center gap-1.5">
              <Building2 aria-hidden="true" className="size-4" />
              {hospital}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock aria-hidden="true" className="size-4" />
              {agora}
            </span>
          </p>
        </div>
        <ApiProvider coordenadorId={persona.id} modo={modo} papel="coordenador">
          {children}
        </ApiProvider>
      </main>
    </>
  );
}
