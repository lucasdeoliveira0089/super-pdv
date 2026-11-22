import { describe, expect, it } from "vitest";
import { ConfigInvalidaError, lerConfig } from "./config";

describe("configuração do PDV", () => {
  it("usa os padrões de desenvolvimento quando as variáveis estão ausentes ou vazias", () => {
    const esperado = { apiUrl: "http://localhost:3333", gestorUrl: "http://localhost:3000" };
    expect(lerConfig({})).toEqual(esperado);
    expect(lerConfig({ MAIN_VITE_API_URL: "  ", MAIN_VITE_GESTOR_URL: "" })).toEqual(esperado);
  });

  it("aceita URLs http(s) e remove a barra final", () => {
    expect(
      lerConfig({
        MAIN_VITE_API_URL: "https://api.superpdv.com.br/",
        MAIN_VITE_GESTOR_URL: "https://gestor.superpdv.com.br",
      }),
    ).toEqual({
      apiUrl: "https://api.superpdv.com.br",
      gestorUrl: "https://gestor.superpdv.com.br",
    });
  });

  it.each([
    ["texto qualquer", "nao-e-url"],
    ["outro protocolo", "ftp://api.superpdv.com.br"],
    ["arquivo local", "file:///c:/api"],
  ])("recusa URL inválida (%s) informando a variável", (_caso, valor) => {
    expect(() => lerConfig({ MAIN_VITE_API_URL: valor })).toThrow(ConfigInvalidaError);
    expect(() => lerConfig({ MAIN_VITE_API_URL: valor })).toThrow(/MAIN_VITE_API_URL/);
  });

  it("informa cada variável inválida", () => {
    try {
      lerConfig({ MAIN_VITE_API_URL: "x", MAIN_VITE_GESTOR_URL: "y" });
      expect.unreachable();
    } catch (erro) {
      expect((erro as ConfigInvalidaError).problemas).toHaveLength(2);
    }
  });
});
