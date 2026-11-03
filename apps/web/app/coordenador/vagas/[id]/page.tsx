import type { Metadata } from "next";
import { TelaEmConstrucao } from "@/components/dominio/tela-em-construcao";

export const metadata: Metadata = { title: "Vaga" };

export default function Vaga() {
  return (
    <TelaEmConstrucao
      titulo="Vaga"
      fase="UI-1"
      descricao="Esta é a tela mais importante: a ordem sugerida, com o motivo de cada nome, os alertas de jornada, quem ficou de fora e a regra que o barrou, e o diálogo em que você aprova e o tracejado se fecha."
    />
  );
}
