import type { Metadata } from "next";
import { TelaEmConstrucao } from "@/components/dominio/tela-em-construcao";

export const metadata: Metadata = { title: "Contestações" };

export default function Contestacoes() {
  return (
    <TelaEmConstrucao
      titulo="Contestações"
      descricao="A caixa de entrada com o relato do médico, a recomendação contestada e os fatores, e a sua resposta registrada. O fluxo completo de contestação ainda não existe no sistema; na demonstração, ele será simulado."
    />
  );
}
