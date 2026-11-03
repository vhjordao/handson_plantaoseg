import type { Metadata } from "next";
import { TelaEmConstrucao } from "@/components/dominio/tela-em-construcao";

export const metadata: Metadata = { title: "Contestações" };

export default function Contestacoes() {
  return (
    <TelaEmConstrucao
      titulo="Contestações"
      fase="UI-3"
      descricao="A caixa de entrada com o relato do médico, a recomendação contestada e os fatores, e a sua resposta registrada. A contestação completa ainda não está construída no backend."
    />
  );
}
