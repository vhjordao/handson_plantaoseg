import type { Metadata } from "next";
import { TelaEmConstrucao } from "@/components/dominio/tela-em-construcao";

export const metadata: Metadata = { title: "Equidade" };

export default function Equidade() {
  return (
    <TelaEmConstrucao
      titulo="Equidade"
      descricao="A concentração das ofertas (quanto recebem os 10% de médicos mais ofertados) e a disparidade por grupo, sempre com a frase “medidas em dados sintéticos”."
    />
  );
}
