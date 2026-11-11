import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { LegendaVozes } from "@/components/dominio/legenda-vozes";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { REPOSITORIO, linkNoRepositorio } from "@/lib/copy/comum";
import { PERGUNTAS } from "@/lib/copy/landing";
import { ROTA_INICIAL } from "@/lib/session/sessao";
import { lerSessao } from "@/lib/session/servidor";

export const metadata: Metadata = { title: "Ajuda" };

const REAL = [
  "O filtro de regras e de jornada (código, com testes).",
  "A ordem sugerida: um modelo de regressão logística com sete variáveis.",
  "O texto dos motivos e dos alertas, como o sistema os produz.",
  "A trilha de auditoria encadeada por hash.",
];

const SIMULADO = [
  "Todos os dados: hospitais, médicos, CRMs e telefones são gerados.",
  "O relógio: hoje é sempre quinta-feira, 01/10, às 9h.",
  "A oferta: aprovar deixa a vaga em \"Oferta em andamento\", sem enviar nada a ninguém.",
  "Os números de tempo e de concentração, que vêm de uma simulação.",
];

const AINDA_NAO = [
  "O modelo de linguagem (Gemini) foi testado à parte, com textos sintéticos: nesta demonstração, a leitura da vaga é por regras.",
  "A tela do médico (aceite, recusa e contestação) e o acompanhamento da cascata estão em construção. A cascata automática já roda no servidor, com o n8n, fora desta demonstração.",
  "O rastro de pagamentos e o check-in ficam para uma versão futura.",
];

function Lista({ itens }: { itens: string[] }) {
  return (
    <ul className="mt-3 grid gap-2">
      {itens.map((item) => (
        <li key={item} className="max-w-[62ch]">
          {item}
        </li>
      ))}
    </ul>
  );
}

export default async function Ajuda() {
  const sessao = await lerSessao();
  return (
    <div className="mx-auto w-full max-w-[860px] px-4 py-10 sm:px-6 lg:py-16">
      {sessao ? (
        <Button asChild variant="ghost" size="sm" className="-ml-3">
          <Link href={ROTA_INICIAL[sessao.papel]}>
            <ArrowLeft aria-hidden="true" className="size-4" />
            Voltar para a plataforma
          </Link>
        </Button>
      ) : null}

      <h1 className="mt-2 font-titulo text-4xl font-medium">Ajuda</h1>
      <p className="mt-3 max-w-[60ch] text-lg text-tinta-suave">
        Como ler as telas, o que é de verdade e o que é simulado, e as perguntas mais comuns.
      </p>

      <section aria-labelledby="ajuda-vozes" className="mt-12">
        <h2 id="ajuda-vozes" className="font-titulo text-2xl font-semibold">
          Como ler as telas
        </h2>
        <p className="mt-3 max-w-[62ch]">
          Em toda a plataforma, a forma do contorno diz quem falou. O que a IA sugere é tracejado e
          ainda não é decisão de ninguém. Quando uma pessoa confirma, o traço se fecha e um selo
          diz quem decidiu e quando.
        </p>
        <LegendaVozes className="mt-5" />
      </section>

      <section aria-labelledby="ajuda-simulado" className="mt-12">
        <h2 id="ajuda-simulado" className="font-titulo text-2xl font-semibold">
          O que é de verdade e o que é simulado
        </h2>
        <div className="mt-4 grid gap-8 md:grid-cols-3">
          <div>
            <h3 className="font-titulo text-xl font-semibold">De verdade</h3>
            <Lista itens={REAL} />
          </div>
          <div>
            <h3 className="font-titulo text-xl font-semibold">Simulado</h3>
            <Lista itens={SIMULADO} />
          </div>
          <div>
            <h3 className="font-titulo text-xl font-semibold">Ainda não existe</h3>
            <Lista itens={AINDA_NAO} />
          </div>
        </div>
        <p className="mt-6 max-w-[62ch] text-sm text-tinta-suave">
          Nada aqui tem validade médica ou legal, e não se deve digitar dado real.{" "}
          <a
            href={linkNoRepositorio("docs/conformidade/README.md")}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-tinta underline underline-offset-4 hover:no-underline"
          >
            Ver o que as resoluções do CFM dizem
            <span className="sr-only"> (abre o GitHub em outra aba)</span>
            <ExternalLink aria-hidden="true" className="size-4" />
          </a>
        </p>
      </section>

      <section aria-labelledby="ajuda-perguntas" className="mt-12">
        <h2 id="ajuda-perguntas" className="font-titulo text-2xl font-semibold">
          Perguntas frequentes
        </h2>
        {PERGUNTAS.map((tema) => (
          <div key={tema.id} className="mt-6">
            <h3 className="font-titulo text-xl font-semibold">{tema.titulo}</h3>
            <Accordion type="single" collapsible className="mt-2 border-t border-divisor">
              {tema.itens.map((item, indice) => (
                <AccordionItem key={item.pergunta} value={`${tema.id}-${indice}`}>
                  <AccordionTrigger>{item.pergunta}</AccordionTrigger>
                  <AccordionContent>
                    <p>{item.resposta}</p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        ))}
      </section>

      <section aria-labelledby="ajuda-problema" className="mt-12">
        <h2 id="ajuda-problema" className="font-titulo text-2xl font-semibold">
          Algo não funcionou?
        </h2>
        <p className="mt-3 max-w-[62ch]">
          Conte o que você tentou fazer e o que apareceu na tela, sem dados reais. O projeto é
          aberto, e os problemas ficam registrados no repositório.
        </p>
        <p className="mt-4">
          <a
            href={`${REPOSITORIO}/issues`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[var(--alvo-min)] items-center gap-1.5 font-semibold underline underline-offset-4 hover:no-underline"
          >
            Registrar um problema
            <span className="sr-only"> (abre o GitHub em outra aba)</span>
            <ExternalLink aria-hidden="true" className="size-4" />
          </a>
        </p>
      </section>
    </div>
  );
}
