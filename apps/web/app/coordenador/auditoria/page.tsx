import type { Metadata } from "next";
import { Suspense } from "react";
import { TelaDeAuditoria } from "@/components/coordenador/tela-de-auditoria";

export const metadata: Metadata = { title: "Auditoria" };

export default function Auditoria() {
  return (
    <Suspense fallback={null}>
      <TelaDeAuditoria />
    </Suspense>
  );
}
