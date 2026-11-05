import type { Metadata } from "next";
import { TelaDaVaga } from "@/components/coordenador/tela-da-vaga";

export const metadata: Metadata = { title: "Vaga" };

export default async function PaginaDaVaga({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ existente?: string | string[] }>;
}) {
  const [{ id }, { existente }] = await Promise.all([params, searchParams]);
  return <TelaDaVaga vagaId={id} jaExistia={existente === "1"} />;
}
