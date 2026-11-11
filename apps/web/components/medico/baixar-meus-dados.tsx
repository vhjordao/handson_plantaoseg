"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMeusDados } from "@/lib/api/hooks";
import type { Medico } from "@/lib/api/types";
import { arquivoDosMeusDados, nomeDoArquivoDosMeusDados } from "@/lib/format/meus-dados";

function baixar(nome: string, conteudo: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: "application/json;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = nome;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** "Baixar os meus dados": o direito de acesso da LGPD (art. 18, II), num arquivo aberto. */
export function BaixarMeusDados({ medico }: { medico: Medico }) {
  const dados = useMeusDados(medico.id);
  const baixarAgora = () =>
    dados.mutate(undefined, {
      onSuccess: ({ ofertas, contestacoes }) => {
        const geradoEm = new Date().toISOString();
        baixar(
          nomeDoArquivoDosMeusDados(geradoEm),
          arquivoDosMeusDados(medico, ofertas, contestacoes, geradoEm),
        );
      },
    });
  return (
    <div className="mt-3">
      <Button variant="secondary" onClick={baixarAgora} loading={dados.isPending}>
        <Download aria-hidden="true" />
        Baixar os meus dados
      </Button>
      {dados.isError ? (
        <p role="alert" className="mt-2 text-sm text-erro">
          Não foi possível reunir os seus dados agora. Tente de novo em instantes.
        </p>
      ) : null}
    </div>
  );
}
