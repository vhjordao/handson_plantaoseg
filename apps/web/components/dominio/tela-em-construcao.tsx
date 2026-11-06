import { Alert } from "@/components/ui/alert";

/**
 * Tela que o plano prevê mas que ainda não foi feita. Em vez de uma página vazia, diz o que ela
 * vai fazer e em que fase chega, com franqueza. A fase de cada tela está em docs/design/prompt-frontend.md, seção 16.
 */
export function TelaEmConstrucao({ titulo, descricao }: { titulo: string; descricao: string }) {
  return (
    <div className="mx-auto w-full max-w-[720px]">
      <h1 className="font-serif text-3xl font-semibold">{titulo}</h1>
      <Alert tone="info" title="Esta tela ainda está em construção" className="mt-5">
        {descricao}
      </Alert>
    </div>
  );
}
