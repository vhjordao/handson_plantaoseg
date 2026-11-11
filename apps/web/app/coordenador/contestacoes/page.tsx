import type { Metadata } from "next";
import { Suspense } from "react";
import { TelaDeContestacoesDoCoordenador } from "@/components/coordenador/tela-de-contestacoes";

export const metadata: Metadata = { title: "Contestações" };

export default function Contestacoes() {
  return (
    <Suspense fallback={null}>
      <TelaDeContestacoesDoCoordenador />
    </Suspense>
  );
}
