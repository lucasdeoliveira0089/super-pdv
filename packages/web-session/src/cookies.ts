import type { TokensResponse } from "@super-pdv/shared";
import type { ConfigSessao } from "./config";

/** Subconjunto da API de cookies do Next (`cookies()` e `NextResponse.cookies`). */
export interface ArmazemCookies {
  get(nome: string): { value: string } | undefined;
  set(nome: string, valor: string, opcoes: OpcoesCookie): unknown;
  delete(nome: string): unknown;
}

export interface OpcoesCookie {
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  path: "/";
  maxAge: number;
}

export const RENOVACAO_MAX_AGE = 30 * 24 * 60 * 60;

/** Cookies sempre fora do alcance de scripts da página (`httpOnly`) e só via HTTPS em produção. */
export function opcoesCookie(maxAge: number): OpcoesCookie {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export function gravarTokens(
  cookies: ArmazemCookies,
  config: ConfigSessao,
  tokens: TokensResponse,
): void {
  cookies.set(config.cookies.acesso, tokens.accessToken, opcoesCookie(tokens.expiresIn));
  cookies.set(config.cookies.renovacao, tokens.refreshToken, opcoesCookie(RENOVACAO_MAX_AGE));
}

export function limparTokens(cookies: ArmazemCookies, config: ConfigSessao): void {
  cookies.delete(config.cookies.acesso);
  cookies.delete(config.cookies.renovacao);
}

/** Lê o `exp` (segundos) de um JWT sem verificar a assinatura (a API verifica). */
export function expiracaoDoToken(token: string | undefined): number | null {
  const payload = token?.split(".")[1];
  if (!payload) return null;
  try {
    const exp = (JSON.parse(Buffer.from(payload, "base64url").toString()) as { exp?: unknown }).exp;
    return typeof exp === "number" ? exp : null;
  } catch {
    return null;
  }
}

/** Indica se o token de acesso precisa ser renovado (expira em menos de 60 s). */
export function precisaRenovar(token: string | undefined, agoraMs = Date.now()): boolean {
  const exp = expiracaoDoToken(token);
  return exp === null || exp * 1000 - agoraMs < 60_000;
}
