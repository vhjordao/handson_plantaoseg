import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Junta classes do Tailwind sem deixar uma anular a outra. */
export function cn(...entradas: ClassValue[]): string {
  return twMerge(clsx(entradas));
}
