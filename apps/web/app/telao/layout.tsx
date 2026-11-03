import type { Metadata } from "next";

export const metadata: Metadata = { title: "Telão" };

/** O telão é escuro por padrão, para sala escura e leitura a 15 m (docs/design/prompt-frontend.md, 9.5). */
export default function LayoutTelao({ children }: LayoutProps<"/telao">) {
  return (
    <div data-theme="dark" className="flex min-h-dvh flex-1 flex-col bg-gaze text-tinta">
      {children}
    </div>
  );
}
