import type { Metadata } from "next";
import { TelaEmConstrucao } from "@/components/dominio/tela-em-construcao";

export const metadata: Metadata = { title: "Contestações" };

export default function Contestacoes() {
  return (
    <TelaEmConstrucao
      titulo="Contestações"
      descricao="Suas contestações, com o protocolo e a resposta do coordenador. O fluxo completo de contestação ainda não existe no sistema; na demonstração, ele será simulado."
    />
  );
}
