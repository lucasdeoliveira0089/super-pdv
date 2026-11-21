import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { acoesDeSessao } from "./acoes";
import { ClienteApi, ErroDaApi } from "./cliente-api";
import { CONFIG_GESTOR } from "./config";
import { type ArmazemCookies, opcoesCookie, precisaRenovar } from "./cookies";
import { criarProxy } from "./proxy";

const API = "http://api.teste";

/** JWT só com payload (a assinatura não é verificada aqui). */
const jwt = (expSegundos: number) =>
  `h.${Buffer.from(JSON.stringify({ exp: expSegundos })).toString("base64url")}.s`;
const agoraS = () => Math.floor(Date.now() / 1000);

class CookiesFalsos implements ArmazemCookies {
  valores = new Map<string, { value: string; opcoes?: unknown }>();
  get(nome: string) {
    return this.valores.get(nome);
  }
  set(nome: string, value: string, opcoes: unknown) {
    this.valores.set(nome, { value, opcoes });
  }
  delete(nome: string) {
    this.valores.delete(nome);
  }
}

const json = (status: number, corpo?: unknown) =>
  new Response(corpo === undefined ? null : JSON.stringify(corpo), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const tokensNovos = { accessToken: jwt(agoraS() + 900), refreshToken: "rt-novo", expiresIn: 900 };

beforeEach(() => {
  process.env.API_URL = API;
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("cookies", () => {
  it("são httpOnly, SameSite=Lax e Secure apenas em produção", () => {
    expect(opcoesCookie(60)).toEqual({
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
      maxAge: 60,
    });
    vi.stubEnv("NODE_ENV", "production");
    expect(opcoesCookie(60).secure).toBe(true);
  });

  it("renova quando faltam menos de 60 s ou o token é ilegível", () => {
    expect(precisaRenovar(jwt(agoraS() + 600))).toBe(false);
    expect(precisaRenovar(jwt(agoraS() + 30))).toBe(true);
    expect(precisaRenovar(undefined)).toBe(true);
    expect(precisaRenovar("lixo")).toBe(true);
  });
});

describe("ClienteApi", () => {
  it("em 401 renova a sessão uma vez, grava os cookies e repete a chamada", async () => {
    const cookies = new CookiesFalsos();
    cookies.set("spdv_gestor_at", "token-velho", {});
    cookies.set("spdv_gestor_rt", "rt-velho", {});
    const chamadas: { url: string; auth?: string; corpo?: string }[] = [];
    const fetchFalso = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const h = init?.headers as Record<string, string> | undefined;
      chamadas.push({ url: String(url), auth: h?.Authorization, corpo: init?.body as string });
      if (String(url).endsWith("/v1/auth/refresh")) return json(200, tokensNovos);
      return h?.Authorization === `Bearer ${tokensNovos.accessToken}`
        ? json(200, { ok: true })
        : json(401, {
            statusCode: 401,
            code: "NAO_AUTENTICADO",
            message: "Sessão inválida ou expirada",
          });
    });

    const api = new ClienteApi(CONFIG_GESTOR, cookies, fetchFalso as typeof fetch, API);
    expect(await api.requisitar("GET", "/v1/me")).toEqual({ ok: true });

    expect(chamadas.map((c) => c.url)).toEqual([
      `${API}/v1/me`,
      `${API}/v1/auth/refresh`,
      `${API}/v1/me`,
    ]);
    expect(chamadas[1]!.corpo).toBe(JSON.stringify({ refreshToken: "rt-velho" }));
    expect(cookies.get("spdv_gestor_rt")).toEqual({
      value: "rt-novo",
      opcoes: expect.objectContaining({ httpOnly: true, sameSite: "lax" }),
    });
  });

  it("sessão encerrada: limpa os cookies e devolve o erro da API", async () => {
    const cookies = new CookiesFalsos();
    cookies.set("spdv_gestor_at", "x", {});
    cookies.set("spdv_gestor_rt", "rt", {});
    const erro401 = {
      statusCode: 401,
      code: "NAO_AUTENTICADO",
      message: "Sessão inválida ou expirada",
    } as const;
    const api = new ClienteApi(
      CONFIG_GESTOR,
      cookies,
      (async () => json(401, erro401)) as typeof fetch,
      API,
    );
    await expect(api.requisitar("GET", "/v1/me")).rejects.toEqual(new ErroDaApi(401, erro401));
    expect(cookies.valores.size).toBe(0);
  });

  it("ação de login grava os tokens; erro de credenciais vira mensagem", async () => {
    const cookies = new CookiesFalsos();
    const ok = acoesDeSessao(
      CONFIG_GESTOR,
      cookies,
      new ClienteApi(
        CONFIG_GESTOR,
        cookies,
        (async () => json(200, tokensNovos)) as typeof fetch,
        API,
      ),
    );
    expect(await ok.entrar("ana@loja.com", "x")).toEqual({ ok: true });
    expect(cookies.get("spdv_gestor_at")?.value).toBe(tokensNovos.accessToken);

    const erro = {
      statusCode: 401,
      code: "CREDENCIAIS_INVALIDAS",
      message: "E-mail ou senha inválidos",
    };
    const falha = acoesDeSessao(
      CONFIG_GESTOR,
      cookies,
      new ClienteApi(CONFIG_GESTOR, cookies, (async () => json(401, erro)) as typeof fetch, API),
    );
    expect(await falha.entrar("ana@loja.com", "errada")).toEqual({
      ok: false,
      mensagem: "E-mail ou senha inválidos",
      code: "CREDENCIAIS_INVALIDAS",
    });
  });
});

describe("proxy", () => {
  const pedir = (caminho: string, cookies: Record<string, string> = {}) => {
    const req = new NextRequest(new URL(caminho, "http://gestor.teste"));
    for (const [k, v] of Object.entries(cookies)) req.cookies.set(k, v);
    return req;
  };

  it("sem sessão redireciona para o login guardando a página pedida", async () => {
    const res = await criarProxy(CONFIG_GESTOR)(pedir("/usuarios?papel=gerente"));
    expect(res.status).toBe(307);
    const destino = new URL(res.headers.get("location")!);
    expect(destino.pathname).toBe("/login");
    expect(destino.searchParams.get("next")).toBe("/usuarios?papel=gerente");
  });

  it("páginas públicas não exigem sessão", async () => {
    const res = await criarProxy(CONFIG_GESTOR)(pedir("/esqueci-senha"));
    expect(res.headers.get("location")).toBeNull();
  });

  it("token válido segue sem chamar a API", async () => {
    const fetchFalso = vi.fn();
    const res = await criarProxy(
      CONFIG_GESTOR,
      fetchFalso as typeof fetch,
    )(pedir("/usuarios", { spdv_gestor_at: jwt(agoraS() + 600), spdv_gestor_rt: "rt" }));
    expect(fetchFalso).not.toHaveBeenCalled();
    expect(res.headers.get("location")).toBeNull();
  });

  it("token expirando é renovado e os cookies saem httpOnly", async () => {
    const res = await criarProxy(CONFIG_GESTOR, (async () =>
      json(200, tokensNovos)) as typeof fetch)(
      pedir("/usuarios", { spdv_gestor_at: jwt(agoraS() + 10), spdv_gestor_rt: "rt" }),
    );
    const setCookie = res.headers.getSetCookie().join("\n");
    expect(setCookie).toMatch(/spdv_gestor_rt=rt-novo;.*HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=lax/i);
  });

  it("renovação recusada leva ao login e apaga os cookies", async () => {
    const res = await criarProxy(CONFIG_GESTOR, (async () => json(401, {})) as typeof fetch)(
      pedir("/usuarios", { spdv_gestor_rt: "rt-revogado" }),
    );
    expect(new URL(res.headers.get("location")!).pathname).toBe("/login");
    expect(res.headers.getSetCookie().join("\n")).toMatch(/spdv_gestor_rt=;/);
  });
});
