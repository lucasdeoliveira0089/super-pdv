import { tokensResponseSchema } from "@super-pdv/shared";
import { type NextRequest, NextResponse } from "next/server";
import { apiUrl, type ConfigSessao } from "./config";
import { gravarTokens, limparTokens, precisaRenovar } from "./cookies";

/**
 * Cria o `proxy.ts` (antigo middleware) de um app web:
 * - sem sessão: redireciona para `/login?next=<página pedida>`;
 * - token de acesso perto de expirar: renova antes de renderizar e regrava os
 *   cookies (Server Components não podem gravar cookies).
 */
export function criarProxy(config: ConfigSessao, fetchFn: typeof fetch = fetch) {
  return async function proxy(req: NextRequest): Promise<NextResponse> {
    const { pathname, search } = req.nextUrl;
    if (config.paginasPublicas.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
      return NextResponse.next();
    }

    const irParaLogin = () => {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.search = "";
      if (pathname !== "/") url.searchParams.set("next", `${pathname}${search}`);
      const res = NextResponse.redirect(url);
      limparTokens(res.cookies, config);
      return res;
    };

    const renovacao = req.cookies.get(config.cookies.renovacao)?.value;
    if (!renovacao) return irParaLogin();

    const acesso = req.cookies.get(config.cookies.acesso)?.value;
    if (!precisaRenovar(acesso)) return NextResponse.next();

    let resposta: Response;
    try {
      resposta = await fetchFn(`${apiUrl()}${config.rotasAuth}/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: renovacao }),
        cache: "no-store",
      });
    } catch {
      return NextResponse.next(); // API fora do ar: a página mostrará o erro.
    }
    if (!resposta.ok) return irParaLogin();

    const tokens = tokensResponseSchema.parse(await resposta.json());
    // Repassa os tokens novos para esta mesma renderização e grava no navegador.
    req.cookies.set(config.cookies.acesso, tokens.accessToken);
    req.cookies.set(config.cookies.renovacao, tokens.refreshToken);
    const res = NextResponse.next({ request: { headers: req.headers } });
    gravarTokens(res.cookies, config, tokens);
    return res;
  };
}

/** Rotas em que o proxy roda (exclui arquivos estáticos do Next). */
export const MATCHER_PADRAO = [
  "/((?!_next/|favicon.ico|.*\\.(?:svg|png|jpg|ico|css|js|woff2?)$).*)",
];
