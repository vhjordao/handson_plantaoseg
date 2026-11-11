import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Send, Sparkles, type LucideIcon } from "lucide-react";
import { EntrarComLogin } from "@/components/entrar/entrar-com-login";
import { Alert } from "@/components/ui/alert";
import { IconeEmCirculo, type TomDoIcone } from "@/components/ui/painel";
import { AVISO_DADOS_REAIS } from "@/lib/copy/comum";

export const metadata: Metadata = { title: "Entrar" };

const PAPEIS = { coordenador: "coordenador", medico: "médico" } as const;

/**
 * A entrada é só com e-mail e senha, para o coordenador e para os médicos (3.7 do roteiro). O
 * papel vem do perfil no banco, não de uma escolha na tela. O modo de demonstração fica como
 * plano B, por um link discreto no fim e pelo aviso de sistema indisponível.
 */
/** O caminho do produto em três passos, ao lado do login, com as vozes de sempre. */
const PASSOS = [
  {
    icone: Sparkles,
    tom: "ia",
    titulo: "A IA sugere",
    texto: "Lê o pedido em texto livre, aplica as regras e ordena quem pode aceitar, com o motivo de cada nome.",
  },
  {
    icone: BadgeCheck,
    tom: "humano",
    titulo: "Você decide",
    texto: "Sem o clique do coordenador, nenhuma oferta sai. A decisão fica na trilha de auditoria.",
  },
  {
    icone: Send,
    tom: "acao",
    titulo: "A oferta segue sozinha",
    texto: "Se o médico recusa ou o prazo acaba, o próximo da lista é chamado, e as duas telas acompanham.",
  },
] as const satisfies readonly { icone: LucideIcon; tom: TomDoIcone; titulo: string; texto: string }[];

export default async function Entrar({ searchParams }: PageProps<"/entrar">) {
  const { papel, de } = await searchParams;
  const destaque = papel === "coordenador" || papel === "medico" ? papel : null;
  const origem = typeof de === "string" ? de : undefined;
  const consulta = destaque && origem ? { papel: destaque, de: origem } : {};

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-6 lg:py-16">
      <h1 className="font-titulo text-4xl font-medium lg:text-5xl">Entrar</h1>
      <p className="mt-3 max-w-[60ch] text-lg text-tinta-suave">
        Entre com o e-mail e a senha do seu login. {AVISO_DADOS_REAIS}
      </p>

      {destaque && origem ? (
        <Alert tone="info" className="mt-6 max-w-[60ch]">
          Para abrir essa página, entre como {PAPEIS[destaque]}.
        </Alert>
      ) : null}

      <div className="mt-6 grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <EntrarComLogin de={origem} />
          <p className="mt-6 text-sm text-tinta-suave">
        O sistema não responde?{" "}
        <Link
          href={{ pathname: "/entrar/demonstracao", query: consulta }}
          className="inline-flex min-h-[var(--alvo-min)] items-center rounded-campo underline underline-offset-4 hover:no-underline"
        >
          Usar o modo de demonstração
        </Link>
          </p>
        </div>
        <ul role="list" aria-label="O que acontece depois de entrar" className="grid gap-3">
          {PASSOS.map((passo) => (
            <li key={passo.titulo} className="superficie flex items-start gap-3 p-4">
              <IconeEmCirculo icone={passo.icone} tom={passo.tom} />
              <div>
                <p className="font-semibold">{passo.titulo}</p>
                <p className="mt-0.5 text-sm text-tinta-suave">{passo.texto}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
