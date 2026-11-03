import { Alert } from "@/components/ui/alert";

/**
 * Tela que o plano prevê mas que ainda não foi feita. Em vez de uma página vazia, diz o que ela
 * vai fazer e em que fase chega, com franqueza (docs/design/prompt-frontend.md, seção 16).
 */
export function TelaEmConstrucao({
  titulo,
  fase,
  descricao,
}: {
  titulo: string;
  fase: string;
  descricao: string;
}) {
  return (
    <div className="mx-auto w-full max-w-[720px]">
      <h1 className="font-serif text-3xl font-semibold">{titulo}</h1>
      <Alert tone="atencao" title={`Esta tela chega na fase ${fase}`} className="mt-5">
        {descricao}
      </Alert>
    </div>
  );
}
