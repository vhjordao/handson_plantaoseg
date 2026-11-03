import type { Metadata } from "next";
import { TelaEmConstrucao } from "@/components/dominio/tela-em-construcao";

export const metadata: Metadata = { title: "Contestações" };

export default function Contestacoes() {
  return (
    <TelaEmConstrucao
      titulo="Contestações"
      fase="UI-2"
      descricao="Suas contestações, com o protocolo e a resposta do coordenador. A contestação completa ainda não está construída no backend e, na demonstração, será simulada."
    />
  );
}
