import type { Metadata } from "next";
import { TelaEmConstrucao } from "@/components/dominio/tela-em-construcao";

export const metadata: Metadata = { title: "Ofertas" };

export default function Ofertas() {
  return (
    <TelaEmConstrucao
      titulo="Ofertas"
      fase="UI-2"
      descricao="Aqui chegam as ofertas, cada uma com o plantão, o horário, a distância, o prazo e o “Por que você”. Você aceita, recusa e pode contestar a recomendação."
    />
  );
}
