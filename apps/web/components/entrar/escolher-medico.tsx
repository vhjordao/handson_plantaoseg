"use client";

import * as React from "react";
import { Shuffle } from "lucide-react";
import { CartaoPersona } from "@/components/entrar/porta";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Persona } from "@/lib/api/types";
import { ROTULO_ESPECIALIDADE } from "@/lib/copy/rotulos";

type PersonaMedico = Extract<Persona, { papel: "medico" }>;

function sortearOutro(total: number, atual: number | null): number {
  if (total <= 1) return 0;
  let proximo = Math.floor(Math.random() * total);
  while (proximo === atual) proximo = Math.floor(Math.random() * total);
  return proximo;
}

/**
 * Sorteia uma persona de médico para a pessoa ser. O sorteio acontece **depois** de a página
 * montar, para o servidor e o navegador escreverem o mesmo HTML; até lá fica um esqueleto da
 * mesma altura, e nada se desloca. "Sortear outra" nunca repete a que já está na tela.
 */
export function EscolherMedico({
  personas,
  acao,
  de,
}: {
  personas: PersonaMedico[];
  /** Ação de servidor que abre a sessão (`entrarComoMedico`). */
  acao: (formData: FormData) => void | Promise<void>;
  /** Rota de origem, para voltar a ela depois de entrar. */
  de?: string;
}) {
  const [indice, setIndice] = React.useState<number | null>(null);
  const total = personas.length;

  React.useEffect(() => {
    const id = window.setTimeout(() => setIndice(sortearOutro(total, null)), 0);
    return () => window.clearTimeout(id);
  }, [total]);

  const persona = indice === null ? null : personas[indice];

  return (
    <form action={acao} className="grid gap-4">
      <div aria-live="polite" className="min-h-[8.75rem]">
        {persona ? (
          <CartaoPersona
            nome={persona.medico.nome}
            linhas={[ROTULO_ESPECIALIDADE[persona.medico.especialidade], persona.medico.crm]}
            acao={
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="-mt-1 -mr-2 shrink-0"
                onClick={() => setIndice((atual) => sortearOutro(total, atual))}
              >
                <Shuffle aria-hidden="true" className="size-4" />
                Sortear outra
              </Button>
            }
          />
        ) : (
          <div role="status">
            <span className="sr-only">Sorteando uma persona…</span>
            <Skeleton className="h-[8.75rem] w-full" />
          </div>
        )}
      </div>
      {persona ? <input type="hidden" name="personaId" value={persona.id} /> : null}
      {de ? <input type="hidden" name="de" value={de} /> : null}
      <Button type="submit" disabled={!persona}>
        Entrar como médico
      </Button>
    </form>
  );
}
