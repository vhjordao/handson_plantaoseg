"use client";

import { ExternalLink } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { linkNoRepositorio } from "@/lib/copy/comum";
import { PERGUNTAS } from "@/lib/copy/landing";
import { useConsultaDeMidia } from "@/lib/hooks/usar-consulta-de-midia";

/**
 * Perguntas por tema, em abas: o que a banca e quem avalia costumam querer saber. A partir de
 * 1024 px a lista de abas fica na vertical, e o leitor de tela e o teclado precisam saber disso:
 * com `orientation="vertical"` as setas para cima e para baixo trocam de aba (WAI-ARIA).
 */
export function Perguntas() {
  const listaNaVertical = useConsultaDeMidia("(min-width: 1024px)");
  return (
    <section id="perguntas" aria-labelledby="titulo-perguntas" className="border-t border-divisor">
      <div className="mx-auto w-full max-w-[1200px] px-4 py-14 sm:px-6 lg:py-20">
        <h2 id="titulo-perguntas" className="font-titulo text-3xl font-medium">
          Perguntas, por tema
        </h2>
        <Tabs
          defaultValue={PERGUNTAS[0].id}
          orientation={listaNaVertical ? "vertical" : "horizontal"}
          className="superficie mt-8 grid gap-6 p-4 sm:p-6 lg:grid-cols-[15rem_minmax(0,1fr)]"
        >
          <TabsList aria-label="Temas das perguntas" className="lg:flex-col lg:overflow-visible">
            {PERGUNTAS.map((tema) => (
              <TabsTrigger key={tema.id} value={tema.id} className="lg:justify-start">
                {tema.titulo}
              </TabsTrigger>
            ))}
          </TabsList>
          <div>
            {PERGUNTAS.map((tema) => (
              <TabsContent key={tema.id} value={tema.id} className="mt-0">
                <Accordion type="single" collapsible className="border-t border-divisor">
                  {tema.itens.map((item, indice) => (
                    <AccordionItem key={item.pergunta} value={`${tema.id}-${indice}`}>
                      <AccordionTrigger>{item.pergunta}</AccordionTrigger>
                      <AccordionContent>
                        <p>{item.resposta}</p>
                        {item.link ? (
                          <p className="mt-3">
                            <a
                              href={linkNoRepositorio(item.link.caminho)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex min-h-[var(--alvo-min)] items-center gap-1.5 font-semibold text-tinta underline underline-offset-4 hover:no-underline"
                            >
                              {item.link.texto}
                              <span className="sr-only"> (abre o GitHub em outra aba)</span>
                              <ExternalLink aria-hidden="true" className="size-4" />
                            </a>
                          </p>
                        ) : null}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </div>
    </section>
  );
}
