import { destinoDe, lerDestinos } from "@/lib/api/live/destinos";

/**
 * A ponte do modo real (fase 3 do roteiro): o navegador chama o próprio site, e aqui a chamada vai
 * à API de matching ou ao Supabase. Só passa o que está na lista de `destinos.ts`, só o login de
 * quem chamou (`Authorization`) vai junto, e a chave anônima entra aqui, no servidor. Nenhum
 * segredo é guardado: a API e a RLS conferem o login em toda chamada.
 */
export const dynamic = "force-dynamic";

const PRAZO_MS = 15_000;
const LIMITE_CORPO = 70_000; // o mesmo do Traefik

async function repassar(
  request: Request,
  { params }: { params: Promise<{ caminho: string[] }> },
): Promise<Response> {
  const destinos = lerDestinos();
  if (!destinos) return erro(503, "sistema_desligado", "O sistema real não está ligado.");
  const { caminho } = await params;
  const busca = new URL(request.url).search;
  const destino = destinoDe(destinos, caminho, request.method, busca);
  if (!destino) return erro(404, "rota_inexistente", "Rota não encontrada.");

  const cabecalhos: Record<string, string> = {};
  const login = request.headers.get("authorization");
  if (login && destino.tipo !== "auth") cabecalhos.Authorization = login;
  if (destino.tipo !== "api") cabecalhos.apikey = destinos.chaveAnonima;
  let corpo: string | undefined;
  if (request.method === "POST") {
    corpo = await request.text();
    if (corpo.length > LIMITE_CORPO) return erro(413, "corpo_grande", "Pedido grande demais.");
    cabecalhos["Content-Type"] = "application/json";
  }

  try {
    const resposta = await fetch(destino.url, {
      method: request.method,
      headers: cabecalhos,
      body: corpo,
      cache: "no-store",
      signal: AbortSignal.timeout(PRAZO_MS),
    });
    return new Response(await resposta.text(), {
      status: resposta.status,
      headers: {
        "Content-Type": resposta.headers.get("content-type") ?? "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return erro(502, "sem_resposta", "O sistema real não respondeu.");
  }
}

function erro(status: number, codigo: string, mensagem: string): Response {
  return Response.json(
    { erro: codigo, mensagem },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export const GET = repassar;
export const POST = repassar;
