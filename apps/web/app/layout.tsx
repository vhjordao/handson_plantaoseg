import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next, Source_Serif_4 } from "next/font/google";
import { PularParaConteudo } from "@/components/layout/pular-para-conteudo";
import "./globals.css";

// Interface e texto: criada pelo Braille Institute para facilitar a leitura de quem está cansado.
const atkinson = Atkinson_Hyperlegible_Next({
  variable: "--font-atkinson",
  subsets: ["latin"],
  // O Next ainda não tem as medidas desta fonte para ajustar a reserva sozinho.
  adjustFontFallback: false,
  fallback: ["system-ui", "sans-serif"],
});

// Títulos e números de destaque. Dois pesos bastam e mantêm o download pequeno.
const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
  fallback: ["Georgia", "serif"],
});

export const metadata: Metadata = {
  title: {
    default: "PlantãoSeguro: a IA sugere, você decide",
    template: "%s | PlantãoSeguro",
  },
  description:
    "Projeto acadêmico e simulado: a IA recomenda e explica quais médicos chamar para um plantão, e quem decide é o coordenador.",
  applicationName: "PlantãoSeguro",
  // Uma simulação não deve aparecer em buscas como se fosse um serviço real.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f6f5" },
    { media: "(prefers-color-scheme: dark)", color: "#0c141c" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${atkinson.variable} ${sourceSerif.variable} h-full`}>
      <body className="flex min-h-dvh flex-col">
        <PularParaConteudo />
        {children}
      </body>
    </html>
  );
}
