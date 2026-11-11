import type { Metadata } from "next";
import Link from "next/link";
import { EntrarComLogin } from "@/components/entrar/entrar-com-login";
import { Alert } from "@/components/ui/alert";
import { AVISO_DADOS_REAIS } from "@/lib/copy/comum";

export const metadata: Metadata = { title: "Entrar" };

const PAPEIS = { coordenador: "coordenador", medico: "médico" } as const;

/**
 * A entrada é só com e-mail e senha, para o coordenador e para os médicos (3.7 do roteiro). O
 * papel vem do perfil no banco, não de uma escolha na tela. O modo de demonstração fica como
 * plano B, por um link discreto no fim e pelo aviso de sistema indisponível.
 */
export default async function Entrar({ searchParams }: PageProps<"/entrar">) {
  const { papel, de } = await searchParams;
  const destaque = papel === "coordenador" || papel === "medico" ? papel : null;
  const origem = typeof de === "string" ? de : undefined;
  const consulta = destaque && origem ? { papel: destaque, de: origem } : {};

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-6 lg:py-16">
      <h1 className="font-titulo text-4xl font-semibold lg:text-5xl">Entrar</h1>
      <p className="mt-3 max-w-[60ch] text-lg text-tinta-suave">
        Entre com o e-mail e a senha do seu login. {AVISO_DADOS_REAIS}
      </p>

      {destaque && origem ? (
        <Alert tone="info" className="mt-6 max-w-[60ch]">
          Para abrir essa página, entre como {PAPEIS[destaque]}.
        </Alert>
      ) : null}

      <EntrarComLogin de={origem} />

      <p className="mt-8 text-sm text-tinta-suave">
        O sistema não responde?{" "}
        <Link
          href={{ pathname: "/entrar/demonstracao", query: consulta }}
          className="inline-flex min-h-[var(--alvo-min)] items-center rounded-campo underline underline-offset-4 hover:no-underline"
        >
          Usar o modo de demonstração
        </Link>
      </p>
    </div>
  );
}
