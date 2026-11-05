import type { Metadata } from "next";
import { NovaVaga } from "@/components/coordenador/nova-vaga";

export const metadata: Metadata = { title: "Nova vaga" };

export default async function PaginaNovaVaga({
  searchParams,
}: {
  searchParams: Promise<{ rascunho?: string | string[] }>;
}) {
  const { rascunho } = await searchParams;
  return <NovaVaga rascunhoId={typeof rascunho === "string" ? rascunho : null} />;
}
