import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next } from "next/font/google";
import "./globals.css";

const atkinson = Atkinson_Hyperlegible_Next({
  variable: "--font-atkinson",
  subsets: ["latin"],
  // O Next ainda não tem as medidas desta fonte para ajustar a reserva sozinho.
  adjustFontFallback: false,
  fallback: ["system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  title: "PlantãoSeguro: protótipo em construção",
  description:
    "Projeto acadêmico e simulado: a IA recomenda quais médicos chamar para um plantão, e quem decide é o coordenador.",
  // Página provisória de uma simulação: não deve aparecer em buscas como se fosse um serviço real.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#dcebe3" },
    { media: "(prefers-color-scheme: dark)", color: "#16352f" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${atkinson.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
