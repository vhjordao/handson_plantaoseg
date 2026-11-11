import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next } from "next/font/google";
import { PularParaConteudo } from "@/components/layout/pular-para-conteudo";
import "./globals.css";

// Interface, títulos e números: criada pelo Braille Institute para facilitar a leitura de quem
// está cansado. Uma família só (fase E): a hierarquia vem do peso, de 300 a 700.
const atkinson = Atkinson_Hyperlegible_Next({
  variable: "--font-atkinson",
  subsets: ["latin"],
  // O Next ainda não tem as medidas desta fonte para ajustar a reserva sozinho.
  adjustFontFallback: false,
  fallback: ["system-ui", "sans-serif"],
});


// Lê a escolha de tema guardada pelo BotaoTema (components/layout/botao-tema.tsx); sem escolha,
// segue o sistema. Também esconde o splash da página inicial se ele já foi visto nesta sessão ou
// se a pessoa pede menos movimento. Fica em texto porque roda antes do React.
const SCRIPT_TEMA = `try{var d=document.documentElement;var t=localStorage.getItem("plantaoseg-tema");if(t==="light"||t==="dark")d.dataset.theme=t;if(sessionStorage.getItem("plantaoseg-splash-visto")||matchMedia("(prefers-reduced-motion: reduce)").matches)d.dataset.splash="visto"}catch(e){}`;

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
    { media: "(prefers-color-scheme: light)", color: "#edf1f6" },
    { media: "(prefers-color-scheme: dark)", color: "#0a121b" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // O script aplica o tema escolhido antes da primeira pintura (sem piscar); por isso o <html>
    // pode chegar ao navegador com um `data-theme` que o servidor não pôs.
    <html lang="pt-BR" className={`${atkinson.variable} h-full`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        <PularParaConteudo />
        {children}
      </body>
    </html>
  );
}
