import type { Metadata } from "next";
import { TelaEmConstrucao } from "@/components/dominio/tela-em-construcao";

export const metadata: Metadata = { title: "Nova vaga" };

export default function NovaVaga() {
  return (
    <TelaEmConstrucao
      titulo="Nova vaga"
      fase="UI-1"
      descricao="Aqui você escreverá o pedido em texto livre e conferirá os campos que o sistema leu, cada um com o trecho de origem, antes de ver a ordem sugerida. A leitura por regras já existe no adaptador de demonstração."
    />
  );
}
