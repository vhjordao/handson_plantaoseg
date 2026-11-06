import type { Metadata } from "next";
import Link from "next/link";
import { CartaoPersona, Porta } from "@/components/entrar/porta";
import { EscolherMedico } from "@/components/entrar/escolher-medico";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AVISO_DADOS_REAIS } from "@/lib/copy/comum";
import { entrarComoCoordenador, entrarComoMedico } from "@/lib/session/acoes";
import { listarPersonasDemo } from "@/lib/session/personas";

export const metadata: Metadata = { title: "Entrar na demonstração" };

const PAPEIS = { coordenador: "coordenador", medico: "médico" } as const;
const ORDEM_PADRAO = ["coordenador", "medico", "telao"] as const;
type IdDaPorta = (typeof ORDEM_PADRAO)[number];

/**
 * As três portas. Sem senha, sem quebra-cabeça e sem digitar nada (WCAG 3.3.8): a pessoa entra
 * como uma persona fictícia. Quem veio de um link para uma área específica (`?papel=`, como um
 * link direto) vê aquela porta primeiro, e primeiro também para o teclado e o leitor de tela:
 * a ordem muda no próprio HTML, não só na tela (WCAG 1.3.2 e 2.4.3).
 */
export default async function Entrar({ searchParams }: PageProps<"/entrar">) {
  const { papel, de } = await searchParams;
  const destaque = papel === "coordenador" || papel === "medico" ? papel : null;
  const origem = typeof de === "string" ? de : undefined;
  const { coordenadores, medicos } = listarPersonasDemo();
  const coordenador = coordenadores[0];

  const portas: Record<IdDaPorta, React.ReactNode> = {
    coordenador: (
      <Porta
        key="coordenador"
        id="coordenador"
        titulo="Coordenador"
        descricao="Publique uma vaga, confira o que o sistema leu e decida quem recebe a oferta."
        destaque={destaque === "coordenador"}
      >
        <form action={entrarComoCoordenador} className="grid gap-4">
          <CartaoPersona
            nome={coordenador.nome}
            linhas={[coordenador.cargo, `${coordenador.unidade.nome} (fictício)`]}
          />
          <input type="hidden" name="personaId" value={coordenador.id} />
          {origem && destaque === "coordenador" ? (
            <input type="hidden" name="de" value={origem} />
          ) : null}
          <Button type="submit">Entrar como coordenador</Button>
        </form>
      </Porta>
    ),
    medico: (
      <Porta
        key="medico"
        id="medico"
        titulo="Médico"
        descricao="Receba ofertas com o motivo, aceite, recuse ou conteste a recomendação."
        destaque={destaque === "medico"}
      >
        <EscolherMedico
          personas={medicos}
          acao={entrarComoMedico}
          de={origem && destaque === "medico" ? origem : undefined}
        />
      </Porta>
    ),
    telao: (
      <Porta
        key="telao"
        id="telao"
        titulo="Telão"
        descricao="Para projetar numa sala: acompanha as vagas ao vivo, só com pseudônimos."
      >
        <Button asChild variant="secondary">
          <Link href="/telao">Abrir o telão</Link>
        </Button>
      </Porta>
    ),
  };
  const ordem: readonly IdDaPorta[] = destaque
    ? [destaque, ...ORDEM_PADRAO.filter((id) => id !== destaque)]
    : ORDEM_PADRAO;

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-6 lg:py-16">
      <h1 className="font-serif text-4xl font-semibold lg:text-5xl">Entrar na demonstração</h1>
      <p className="mt-3 max-w-[60ch] text-lg text-tinta-suave">
        Sem senha: você entra com uma pessoa fictícia. {AVISO_DADOS_REAIS}
      </p>

      {destaque && origem ? (
        <Alert tone="info" className="mt-6 max-w-[60ch]">
          Para abrir essa página, entre como {PAPEIS[destaque]}.
        </Alert>
      ) : null}

      <div className="mt-10 grid gap-4 lg:grid-cols-3">{ordem.map((id) => portas[id])}</div>
    </div>
  );
}
