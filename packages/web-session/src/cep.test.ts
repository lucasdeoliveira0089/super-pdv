import { describe, expect, it, vi } from "vitest";
import { consultarCep } from "./cep";

const json = (corpo: unknown, status = 200) =>
  Promise.resolve(
    new Response(JSON.stringify(corpo), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );

const VIACEP_PAULISTA = {
  cep: "01310-100",
  logradouro: "Avenida Paulista",
  complemento: "de 612 a 1510 - lado par",
  bairro: "Bela Vista",
  localidade: "São Paulo",
  uf: "SP",
};

describe("consultarCep", () => {
  it("devolve o endereço normalizado e consulta só com os dígitos", async () => {
    const fetchFn = vi.fn(() => json(VIACEP_PAULISTA));
    const r = await consultarCep("01310-100", { baseUrl: "https://cep.teste/ws/", fetchFn });
    expect(r).toEqual({
      ok: true,
      endereco: {
        logradouro: "Avenida Paulista",
        bairro: "Bela Vista",
        cidade: "São Paulo",
        uf: "SP",
      },
    });
    expect(fetchFn).toHaveBeenCalledWith("https://cep.teste/ws/01310100/json/", expect.anything());
  });

  it("CEP genérico de cidade pequena vem sem logradouro e sem bairro", async () => {
    const fetchFn = vi.fn(() => json({ localidade: "Cidade Pequena", uf: "MG" }));
    expect(await consultarCep("35500000", { fetchFn })).toEqual({
      ok: true,
      endereco: { logradouro: "", bairro: "", cidade: "Cidade Pequena", uf: "MG" },
    });
  });

  it.each([true, "true"])("erro=%s do serviço significa CEP não encontrado", async (erro) => {
    const fetchFn = vi.fn(() => json({ erro }));
    expect(await consultarCep("99999999", { fetchFn })).toEqual({
      ok: false,
      motivo: "nao_encontrado",
    });
  });

  it("CEP inválido não chega a consultar o serviço", async () => {
    const fetchFn = vi.fn(() => json(VIACEP_PAULISTA));
    expect(await consultarCep("1234", { fetchFn })).toEqual({ ok: false, motivo: "invalido" });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("timeout vira falha", async () => {
    const fetchFn = vi.fn(
      (_url: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_, rejeitar) => {
          init?.signal?.addEventListener("abort", () => rejeitar(init.signal!.reason));
        }),
    );
    expect(await consultarCep("01310100", { fetchFn, timeoutMs: 10 })).toEqual({
      ok: false,
      motivo: "falha",
    });
  });

  it("serviço fora do ar vira falha", async () => {
    const fetchFn = vi.fn(() => Promise.reject(new TypeError("fetch failed")));
    expect(await consultarCep("01310100", { fetchFn })).toEqual({ ok: false, motivo: "falha" });
  });

  it("status de erro vira falha", async () => {
    const fetchFn = vi.fn(() => json({}, 503));
    expect(await consultarCep("01310100", { fetchFn })).toEqual({ ok: false, motivo: "falha" });
  });

  it("resposta em formato inesperado vira falha", async () => {
    const fetchFn = vi.fn(() => json({ qualquer: "coisa" }));
    expect(await consultarCep("01310100", { fetchFn })).toEqual({ ok: false, motivo: "falha" });
  });
});
