import Link from "next/link";
import { CircleHelp } from "lucide-react";
import { ACOES } from "@/lib/copy/comum";

/**
 * **Ajuda**, sempre no mesmo canto do cabeçalho (WCAG 3.2.6): um botão redondo de papel, como
 * os do modelo visual. No celular sobra o ícone; o nome continua para o leitor de tela.
 */
export function BotaoAjuda() {
  return (
    <Link
      href="/ajuda"
      className="inline-flex min-h-[var(--alvo-min)] min-w-[var(--alvo-min)] shrink-0 items-center justify-center gap-2 rounded-full border border-divisor/80 bg-papel/80 px-2.5 text-base font-medium text-tinta shadow-cartao transition-[background-color,border-color] duration-150 hover:border-campo hover:bg-papel sm:px-4"
    >
      <CircleHelp aria-hidden="true" className="size-[18px] shrink-0" />
      <span className="max-sm:sr-only">{ACOES.ajuda}</span>
    </Link>
  );
}
