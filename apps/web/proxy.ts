import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESSAO, lerSessaoDoValor } from "@/lib/session/sessao";

/**
 * Quem não tem a sessão do papel certo volta a `/entrar`, com o papel e a rota de origem.
 * (Next.js 16: `proxy.ts` é o antigo `middleware.ts`.) O servidor das telas confere de novo.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const exigido = pathname.startsWith("/coordenador") ? "coordenador" : "medico";
  const sessao = lerSessaoDoValor(request.cookies.get(COOKIE_SESSAO)?.value);

  if (sessao?.papel === exigido) return NextResponse.next();

  const destino = request.nextUrl.clone();
  destino.pathname = "/entrar";
  destino.search = "";
  destino.searchParams.set("papel", exigido);
  // Com a busca: quem volta do login reencontra o mesmo filtro da lista.
  destino.searchParams.set("de", `${pathname}${search}`);
  return NextResponse.redirect(destino);
}

export const config = {
  matcher: ["/coordenador/:path*", "/medico/:path*"],
};
