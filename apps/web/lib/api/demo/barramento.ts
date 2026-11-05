/**
 * O barramento de eventos em memória do modo `demo` (no `live` seria o Supabase Realtime).
 * Cada ouvinte recebe uma cópia do evento, e um ouvinte com defeito não derruba os outros.
 */
import type { EventoPlantao } from "../types";

export type Ouvinte = (evento: EventoPlantao) => void;

export class Barramento {
  private readonly ouvintes = new Set<Ouvinte>();

  /** Devolve a função que cancela a assinatura. */
  assinar(ouvinte: Ouvinte): () => void {
    this.ouvintes.add(ouvinte);
    return () => {
      this.ouvintes.delete(ouvinte);
    };
  }

  emitir(evento: EventoPlantao): void {
    for (const ouvinte of [...this.ouvintes]) {
      try {
        ouvinte(structuredClone(evento));
      } catch {
        // Quem assina é responsável pelo próprio erro; a demonstração segue.
      }
    }
  }

  get quantidade(): number {
    return this.ouvintes.size;
  }
}
