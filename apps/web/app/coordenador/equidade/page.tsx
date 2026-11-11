import type { Metadata } from "next";
import { TelaDeEquidade } from "@/components/coordenador/tela-de-equidade";

export const metadata: Metadata = { title: "Equidade" };

export default function Equidade() {
  return <TelaDeEquidade />;
}
