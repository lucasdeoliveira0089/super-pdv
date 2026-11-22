import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cifradorDeTeste } from "../../test/cifrador";
import { SessionStore } from "./session-store";

const SESSAO = {
  refreshToken: "rt-secreto-0123456789abcdef",
  empresaId: "0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b",
};

describe("armazenamento da sessão do PDV", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "super-pdv-sessao-"));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("grava o arquivo cifrado, sem o token legível", () => {
    const store = new SessionStore(dir, cifradorDeTeste());
    store.salvar(SESSAO);

    const bruto = readFileSync(store.path);
    expect(bruto.length).toBeGreaterThan(0);
    expect(bruto.toString("utf8")).not.toContain(SESSAO.refreshToken);
    expect(bruto.toString("latin1")).not.toContain(SESSAO.refreshToken);
    expect(bruto.toString("utf8")).not.toContain(SESSAO.empresaId);
  });

  it("lê a sessão após um reinício simulado (nova instância, mesmo cifrador)", () => {
    const cifrador = cifradorDeTeste();
    new SessionStore(dir, cifrador).salvar(SESSAO);

    const reaberto = new SessionStore(dir, cifrador);
    expect(reaberto.carregar()).toEqual(SESSAO);
  });

  it("guarda a sessão sem empresa escolhida", () => {
    const store = new SessionStore(dir, cifradorDeTeste());
    store.salvar({ ...SESSAO, empresaId: null });
    expect(store.carregar()).toEqual({ ...SESSAO, empresaId: null });
  });

  it("não grava nada no disco quando a criptografia não está disponível", () => {
    const store = new SessionStore(dir, cifradorDeTeste(false));
    store.salvar(SESSAO);

    expect(readdirSync(dir)).toEqual([]);
    // Vale enquanto o app está aberto...
    expect(store.carregar()).toEqual(SESSAO);
    // ...e não sobrevive a um reinício.
    expect(new SessionStore(dir, cifradorDeTeste(false)).carregar()).toBeNull();
  });

  it("apagar remove o arquivo", () => {
    const store = new SessionStore(dir, cifradorDeTeste());
    store.salvar(SESSAO);
    store.apagar();
    expect(existsSync(store.path)).toBe(false);
    expect(store.carregar()).toBeNull();
  });

  it("sem arquivo, não há sessão", () => {
    expect(new SessionStore(dir, cifradorDeTeste()).carregar()).toBeNull();
  });

  it("descarta um arquivo que não pode ser decifrado (outro usuário ou corrompido)", () => {
    new SessionStore(dir, cifradorDeTeste()).salvar(SESSAO);
    const outroUsuario = new SessionStore(dir, cifradorDeTeste());
    expect(outroUsuario.carregar()).toBeNull();
    expect(existsSync(outroUsuario.path)).toBe(false);

    writeFileSync(join(dir, "session.bin"), "lixo");
    expect(new SessionStore(dir, cifradorDeTeste()).carregar()).toBeNull();
  });
});
