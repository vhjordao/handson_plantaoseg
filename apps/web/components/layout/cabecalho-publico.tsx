"use client";

import * as React from "react";
import Link from "next/link";
import { CircleHelp } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { LogoPlantao } from "@/components/dominio/marca-plantao";
import { BotaoTema } from "@/components/layout/botao-tema";
import { ACOES } from "@/lib/copy/comum";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", rotulo: "Início" },
  { href: "/#como-funciona", rotulo: "Como funciona" },
  { href: "/#compromissos", rotulo: "Compromissos" },
  { href: "/#evidencia", rotulo: "Evidência" },
  { href: "/#perguntas", rotulo: "Perguntas" },
] as const;

const CURVA = "ease-[cubic-bezier(0.76,0,0.24,1)]";

/** O logo e a marca em duas linhas, com a frase do produto embaixo. */
function Logo() {
  return (
    // O nome acessível é o próprio texto visível (WCAG 2.5.3); "página inicial" fica só para o leitor de tela.
    <Link href="/" className="flex shrink-0 items-center gap-2.5 rounded-md text-tinta md:gap-3">
      {/* Abaixo de 400 px o logo sai, para o cabeçalho caber numa linha (WCAG 2.4.11): a 360 px ele
          precisava de cerca de 340 px e tinha 328. O nome fica, e a frase entra no mesmo ponto. */}
      <LogoPlantao className="hidden size-9 min-[400px]:block sm:size-10 md:size-12" />
      <span className="flex flex-col">
        <span className="text-base leading-none font-extrabold tracking-tight uppercase sm:text-lg md:text-2xl">Plantão</span>
        <span className="-mt-0.5 text-base leading-none font-extrabold tracking-tight uppercase sm:text-lg md:-mt-1 md:text-2xl">
          Seguro
        </span>
        <span className="mt-1 hidden text-[10px] leading-none font-medium min-[400px]:block md:mt-1.5 md:text-[11px]">
          a IA sugere, você decide
        </span>
      </span>
      <span className="sr-only">, página inicial</span>
    </Link>
  );
}

/** As três linhas que viram um X: o estado vem do menu aberto. */
function IconeMenu({ aberto }: { aberto: boolean }) {
  const linha = `absolute h-0.5 w-6 rounded-full bg-tinta transition-all duration-300 ${CURVA}`;
  return (
    <span aria-hidden="true" className="relative flex size-10 items-center justify-center">
      <span className={cn(linha, aberto ? "translate-y-0 rotate-45" : "-translate-y-2")} />
      <span className={cn(linha, aberto ? "scale-x-0 opacity-0" : "scale-x-100 opacity-100")} />
      <span className={cn(linha, aberto ? "translate-y-0 -rotate-45" : "translate-y-2")} />
    </span>
  );
}

/**
 * O cabeçalho do site público: a marca à esquerda e, à direita, o tema, **Ajuda** (sempre antes
 * de Entrar, no mesmo canto da plataforma, WCAG 3.2.6), Entrar e o Menu. O Menu abre um painel
 * lateral com as seções da página (Radix Dialog: prende o foco, fecha com Esc e trava a rolagem).
 * Na própria entrada (`enxuto`), ficam só a marca, o tema e a Ajuda.
 */
export function CabecalhoPublico({ enxuto = false }: { enxuto?: boolean }) {
  const [aberto, setAberto] = React.useState(false);

  return (
    <header className="fonte-vitrine sticky top-0 z-50 border-b border-divisor/50 bg-papel/80 backdrop-blur-md">
      <div className="mx-auto flex w-full flex-wrap items-center justify-between gap-2 px-4 py-2 md:px-6 md:py-3">
        <Logo />
        <div className="flex flex-wrap items-center justify-end gap-1 md:gap-4">
          <BotaoTema />
          <Link
            href="/ajuda"
            className="inline-flex min-h-[var(--alvo-min)] min-w-[var(--alvo-min)] items-center justify-center rounded-full text-sm font-semibold text-tinta underline-offset-4 hover:underline md:px-1"
          >
            <CircleHelp aria-hidden="true" className="size-5 md:hidden" />
            <span className="max-md:sr-only">{ACOES.ajuda}</span>
          </Link>
          {enxuto ? null : (
            <>
              <Link
                href="/entrar"
                className="inline-flex min-h-[var(--alvo-min)] items-center rounded-full bg-tinta px-3.5 text-sm font-semibold text-sobre-tinta transition-colors duration-200 hover:bg-tinta/85 md:px-6"
              >
                {ACOES.entrar}
              </Link>
              <DialogPrimitive.Root open={aberto} onOpenChange={setAberto}>
                <DialogPrimitive.Trigger asChild>
                  <button
                    type="button"
                    aria-label="Menu"
                    className="inline-flex min-h-[var(--alvo-min)] items-center justify-center rounded-full text-sm font-semibold text-tinta transition-colors duration-200 md:border md:border-tinta md:bg-papel md:px-6 md:hover:bg-tinta md:hover:text-sobre-tinta"
                  >
                    <span className="md:hidden">
                      <IconeMenu aberto={aberto} />
                    </span>
                    <span aria-hidden="true" className="hidden md:inline">
                      Menu
                    </span>
                  </button>
                </DialogPrimitive.Trigger>
                <DialogPrimitive.Portal>
                  <DialogPrimitive.Overlay className="menu-fundo fixed inset-0 z-[60] bg-[#000000]/20 backdrop-blur-sm" />
                  <DialogPrimitive.Content className="menu-painel fixed top-0 right-0 z-[61] flex h-full w-[85%] max-w-sm flex-col justify-center gap-1 bg-papel px-8 shadow-flutuante outline-none">
                    <DialogPrimitive.Title className="sr-only">Menu</DialogPrimitive.Title>
                    <DialogPrimitive.Description className="sr-only">
                      As seções da página inicial, a ajuda e a entrada no sistema.
                    </DialogPrimitive.Description>
                    <DialogPrimitive.Close asChild>
                      <button
                        type="button"
                        aria-label="Fechar o menu"
                        className="absolute top-3 right-3 inline-flex size-[var(--alvo-min)] items-center justify-center rounded-full text-tinta hover:bg-tinta/[0.06]"
                      >
                        <IconeMenu aberto />
                      </button>
                    </DialogPrimitive.Close>
                    <nav aria-label="Seções da página">
                      <ul className="grid gap-1">
                        {LINKS.map((link, i) => (
                          <li key={link.href} className="menu-item" style={{ animationDelay: `${100 + i * 60}ms` }}>
                            <Link
                              href={link.href}
                              onClick={() => setAberto(false)}
                              className="inline-flex min-h-[var(--alvo-min)] items-center text-3xl font-bold [overflow-wrap:anywhere] text-tinta hover:text-tinta-suave sm:text-4xl"
                            >
                              {link.rotulo}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </nav>
                    <div className="menu-item mt-8 border-t border-divisor pt-8" style={{ animationDelay: "450ms" }}>
                      <p className="mb-4 text-sm font-semibold text-tinta">Projeto acadêmico, dados 100% sintéticos</p>
                      <Link
                        href="/entrar"
                        onClick={() => setAberto(false)}
                        className="flex w-full items-center justify-center rounded-full bg-tinta px-6 py-4 text-sm font-semibold text-sobre-tinta transition-colors duration-200 hover:bg-tinta/85"
                      >
                        {ACOES.entrarNaDemonstracao}
                      </Link>
                    </div>
                  </DialogPrimitive.Content>
                </DialogPrimitive.Portal>
              </DialogPrimitive.Root>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
