"use client";

import * as React from "react";
import { BellRing, Shuffle } from "lucide-react";
import { CartaoPersona } from "@/components/entrar/porta";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CHAVE_DE_ARMAZENAMENTO } from "@/lib/api/demo/estado";
import type { Persona } from "@/lib/api/types";
import { ENTRADA_DO_MEDICO } from "@/lib/copy/medico";
import { ROTULO_ESPECIALIDADE } from "@/lib/copy/rotulos";

type PersonaMedico = Extract<Persona, { papel: "medico" }>;

function sortearOutro(total: number, atual: number | null): number {
  if (total <= 1) return 0;
  let proximo = Math.floor(Math.random() * total);
  while (proximo === atual) proximo = Math.floor(Math.random() * total);
  return proximo;
}

/**
 * Quem tem oferta esperando resposta na demonstração desta aba (4.6). Só uma preferência para a
 * porta: a tela de ofertas confere de novo. Qualquer problema com o armazenamento vale "ninguém".
 */
function comOfertaAberta(): Set<string> {
  try {
    const bruto = window.sessionStorage.getItem(CHAVE_DE_ARMAZENAMENTO);
    const dados = bruto ? (JSON.parse(bruto) as { ofertas?: unknown }) : null;
    const ofertas = Array.isArray(dados?.ofertas) ? dados.ofertas : [];
    return new Set(
      ofertas
        .filter((o): o is { status: string; medicoId: string } => typeof o === "object" && o !== null)
        .filter((o) => o.status === "aberta" && typeof o.medicoId === "string")
        .map((o) => o.medicoId),
    );
  } catch {
    return new Set();
  }
}

/**
 * Sorteia uma persona de médico para a pessoa ser. No plano B, quem acabou de receber uma oferta
 * aparece primeiro, para quem apresenta seguir a cascata sem procurar o nome. O sorteio acontece **depois** de a página
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
  const [esperando, setEsperando] = React.useState<ReadonlySet<string>>(new Set());
  const total = personas.length;

  React.useEffect(() => {
    const id = window.setTimeout(() => {
      const comOferta = comOfertaAberta();
      setEsperando(comOferta);
      const preferido = personas.findIndex((p) => comOferta.has(p.medico.id));
      setIndice(preferido >= 0 ? preferido : sortearOutro(total, null));
    }, 0);
    return () => window.clearTimeout(id);
  }, [personas, total]);

  const persona = indice === null ? null : personas[indice];
  const temOferta = persona ? esperando.has(persona.medico.id) : false;

  return (
    <form action={acao} className="grid gap-4">
      <div aria-live="polite" className="min-h-[8.75rem]">
        {persona ? (
          <CartaoPersona
            nome={persona.medico.nome}
            linhas={[ROTULO_ESPECIALIDADE[persona.medico.especialidade], persona.medico.crm]}
            selo={
              temOferta ? (
                <Badge tone="atencao">
                  <BellRing aria-hidden="true" />
                  {ENTRADA_DO_MEDICO.temOferta}
                </Badge>
              ) : null
            }
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
