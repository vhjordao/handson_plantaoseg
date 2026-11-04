import type { Metadata } from "next";
import { TelaEmConstrucao } from "@/components/dominio/tela-em-construcao";

export const metadata: Metadata = { title: "Auditoria" };

export default function Auditoria() {
  return (
    <TelaEmConstrucao
      titulo="Auditoria"
      descricao="A trilha somente de leitura (quem, o quê, quando e a versão do modelo), com filtro por vaga, exportação em CSV e a verificação da cadeia de hash feita no próprio navegador."
    />
  );
}
