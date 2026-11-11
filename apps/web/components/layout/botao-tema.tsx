"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";

/** Onde a escolha fica guardada. O script do `<head>` (app/layout.tsx) lê a mesma chave. */
export const CHAVE_TEMA = "plantaoseg-tema";
const EVENTO_TEMA = "plantaoseg-tema-mudou";

type Tema = "light" | "dark";

function temaAtual(): Tema {
  const escolhido = document.documentElement.dataset.theme;
  if (escolhido === "light" || escolhido === "dark") return escolhido;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Avisa quando o tema muda: pelo sistema ou por um botão desta página. */
function assinar(avisar: () => void): () => void {
  const consulta = window.matchMedia("(prefers-color-scheme: dark)");
  consulta.addEventListener("change", avisar);
  window.addEventListener(EVENTO_TEMA, avisar);
  return () => {
    consulta.removeEventListener("change", avisar);
    window.removeEventListener(EVENTO_TEMA, avisar);
  };
}

/**
 * Alterna entre o tema claro e o escuro. Sem escolha, a página segue o sistema; depois do primeiro
 * clique, a escolha fica guardada neste navegador e vale em todas as páginas. É um botão de
 * alternância (`aria-pressed`): pressionado quer dizer tema escuro.
 */
export function BotaoTema() {
  // No servidor o tema é desconhecido: o botão chega sem estado e se acerta ao montar.
  const tema = React.useSyncExternalStore<Tema | null>(assinar, temaAtual, () => null);

  const alternar = () => {
    const proximo: Tema = temaAtual() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = proximo;
    try {
      window.localStorage.setItem(CHAVE_TEMA, proximo);
    } catch {
      // Sem armazenamento (janela privada, bloqueio): o tema vale só até recarregar.
    }
    window.dispatchEvent(new Event(EVENTO_TEMA));
  };

  const escuro = tema === "dark";
  const Icone = escuro ? Sun : Moon;
  return (
    <button
      type="button"
      onClick={alternar}
      aria-pressed={tema === null ? undefined : escuro}
      aria-label="Tema escuro"
      title={escuro ? "Usar o tema claro" : "Usar o tema escuro"}
      className="inline-flex min-h-[var(--alvo-min)] min-w-[var(--alvo-min)] shrink-0 items-center justify-center rounded-full border border-divisor/80 bg-papel/80 text-tinta shadow-cartao transition-[background-color,border-color] duration-150 hover:border-campo hover:bg-papel"
    >
      <Icone aria-hidden="true" className="size-[18px]" />
    </button>
  );
}
