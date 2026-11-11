"use client";

import Link from "next/link";
import { ChevronDown, LogOut, Repeat, UserRound } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { limparLogin } from "@/lib/api/live/autenticacao";
import { sair } from "@/lib/session/acoes";

/** O menu da persona: quem sou, trocar de persona e sair. Fica sempre no canto direito. */
export function UserMenu({
  nome,
  descricao,
}: {
  nome: string;
  /** Papel e hospital, por exemplo "Coordenadora, Hospital Modelo Centro". */
  descricao: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex min-h-[var(--alvo-min)] items-center gap-2 rounded-full border border-divisor bg-papel py-1 pr-3 pl-1 text-base font-medium shadow-cartao transition-[border-color,background-color] duration-150 hover:border-campo hover:bg-recuo"
        >
          <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-acento-tom text-acento-forte">
            <UserRound aria-hidden="true" className="size-[18px]" />
          </span>
          <span className="hidden min-w-0 text-left leading-tight sm:grid">
            <span className="max-w-[14rem] truncate">{nome}</span>
            <span className="hidden max-w-[14rem] truncate text-xs font-normal text-tinta-suave xl:block">
              {descricao}
            </span>
          </span>
          <span className="sr-only sm:hidden">Menu de {nome}</span>
          <ChevronDown aria-hidden="true" className="size-4 shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>
          <span className="block font-semibold">{nome}</span>
          <span className="block text-sm text-tinta-suave">{descricao}</span>
          <span className="block text-sm text-tinta-suave">Persona fictícia</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/entrar">
            <Repeat aria-hidden="true" />
            Trocar de persona
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            limparLogin();
            void sair();
          }}
        >
          <LogOut aria-hidden="true" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
