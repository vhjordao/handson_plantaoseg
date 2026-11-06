"use client";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { limparLogin } from "@/lib/api/live/autenticacao";
import { trocarParaDemonstracao } from "@/lib/session/acoes";

/**
 * O sistema real não respondeu (3.4 do roteiro): a pessoa segue no modo de demonstração, que faz o
 * mesmo caminho sem o servidor. É o plano B da apresentação, a um clique.
 */
export function AvisoSistemaIndisponivel({ papel }: { papel: "coordenador" | "medico" }) {
  return (
    <Alert tone="atencao" title="O sistema real não respondeu" className="mb-4">
      <p>
        Tente de novo daqui a pouco. Se precisar seguir agora, o modo de demonstração faz o mesmo
        caminho com dados fictícios, sem depender do servidor.
      </p>
      <form action={trocarParaDemonstracao} onSubmit={() => limparLogin()} className="mt-3">
        <input type="hidden" name="papel" value={papel} />
        <Button type="submit" variant="secondary">
          Seguir no modo de demonstração
        </Button>
      </form>
    </Alert>
  );
}
