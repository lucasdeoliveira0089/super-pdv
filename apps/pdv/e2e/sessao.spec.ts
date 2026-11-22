import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { ApiSimulada, empresaSimulada } from "../test/api-simulada";
import {
  abrirPdv,
  API_INACESSIVEL,
  entrar,
  GESTOR_URL,
  novaPastaDeDados,
  type PdvAberto,
} from "./util";

// Cenários da spec `pdv-session`, com o app Electron real (criptografia do
// Windows, IPC, preload) contra o servidor simulado da API.

const SENHA = "Senha#Forte2026";
const centro = empresaSimulada("Mercado Silva Centro");
const norte = empresaSimulada("Mercado Silva Norte", { cnpj: "12ABC34501DE35" });
const sul = empresaSimulada("Mercado Silva Sul");

let api: ApiSimulada;
let dados: ReturnType<typeof novaPastaDeDados>;
const abertos: PdvAberto[] = [];

async function abrir(apiUrl = api.url): Promise<PdvAberto> {
  const pdv = await abrirPdv(dados.dir, apiUrl);
  abertos.push(pdv);
  return pdv;
}

async function fechar(pdv: PdvAberto): Promise<void> {
  await pdv.app.close();
  abertos.splice(abertos.indexOf(pdv), 1);
}

test.beforeEach(async () => {
  api = await ApiSimulada.iniciar();
  dados = novaPastaDeDados();
  api.adicionarUsuario({
    email: "operador@silva.local",
    senha: SENHA,
    nome: "Operador Silva",
    empresas: [centro],
  });
  api.adicionarUsuario({
    email: "dono@silva.local",
    senha: SENHA,
    nome: "Dono Silva",
    papel: "dono",
    empresas: [centro, norte, sul],
  });
});

test.afterEach(async () => {
  for (const pdv of abertos.splice(0)) await pdv.app.close();
  expect(api.violacoes).toEqual([]);
  await api.parar();
  dados.remover();
});

test.describe("login", () => {
  test("pelo teclado, com uma empresa: vai direto à tela principal", async () => {
    const { page } = await abrir();
    await expect(page).toHaveTitle("Super PDV");
    await expect(page.getByLabel("E-mail")).toBeFocused();

    await page.keyboard.type("operador@silva.local");
    await page.keyboard.press("Tab");
    await page.keyboard.type(SENHA);
    await page.keyboard.press("Enter");

    await expect(page.getByTestId("empresa-nome")).toHaveText("Mercado Silva Centro");
    await expect(page.getByTestId("empresa-cnpj")).toHaveText("CNPJ 11.222.333/0001-81");
    await expect(page.getByTestId("usuario-logado")).toContainText("Operador Silva");
    // Com uma só empresa, não há o que trocar.
    await expect(page.getByRole("button", { name: "Trocar empresa" })).toHaveCount(0);

    const banco = page.getByTestId("local-db-status");
    await expect(banco).toHaveAttribute("data-status", "operante");
    await expect(banco).toHaveText(/Banco local: operante \(SQLite 3\.\d+\.\d+\)/);
    expect(existsSync(join(dados.dir, "super-pdv.db"))).toBe(true);
  });

  test("credenciais inválidas: mensagem genérica, mantendo o e-mail", async () => {
    const { page } = await abrir();
    await entrar(page, "operador@silva.local", "Senha#Errada1");

    await expect(page.getByRole("alert").first()).toHaveText("E-mail ou senha inválidos");
    await expect(page.getByLabel("E-mail")).toHaveValue("operador@silva.local");
    await expect(page.getByLabel("Senha", { exact: true })).toHaveValue("");
    await expect(page.getByLabel("Senha", { exact: true })).toBeFocused();
  });

  test("sem conexão com a API: informa que a conexão é necessária", async () => {
    const { page } = await abrir(API_INACESSIVEL);
    await entrar(page, "operador@silva.local", SENHA);

    await expect(page.getByRole("alert").first()).toContainText(
      "É necessária conexão com o servidor para entrar",
    );
    await expect(page.getByTestId("tela-login")).toBeVisible();
  });

  test("Esqueci minha senha abre a recuperação do gestor no navegador", async () => {
    const { app, page } = await abrir();
    // Substitui a abertura do navegador do sistema para registrar o endereço.
    await app.evaluate(({ shell }) => {
      const g = globalThis as { urlsAbertas?: string[] };
      g.urlsAbertas = [];
      shell.openExternal = async (url: string) => {
        g.urlsAbertas!.push(url);
      };
    });

    await page.getByRole("button", { name: "Esqueci minha senha" }).click();
    await expect
      .poll(() => app.evaluate(() => (globalThis as { urlsAbertas?: string[] }).urlsAbertas))
      .toEqual([`${GESTOR_URL}/esqueci-senha`]);
  });
});

test.describe("empresa", () => {
  test("várias empresas: escolha antes de prosseguir e troca sem novo login", async () => {
    const { page } = await abrir();
    await entrar(page, "dono@silva.local", SENHA);

    const lista = page.getByRole("list", { name: "Empresas" });
    await expect(page.getByRole("heading", { name: "Escolha a empresa" })).toBeVisible();
    await expect(lista.getByRole("button")).toHaveCount(3);
    await expect(lista.getByRole("button").first()).toBeFocused();
    await expect(lista).toContainText("CNPJ 12.ABC.345/01DE-35");
    // Sem empresa escolhida, não há como voltar.
    await page.keyboard.press("Escape");
    await expect(page.getByRole("heading", { name: "Escolha a empresa" })).toBeVisible();

    // Setas + Enter: escolhe a segunda (ordem por nome: Centro, Norte, Sul).
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("empresa-nome")).toHaveText("Mercado Silva Norte");
    await expect(page.getByTestId("empresa-cnpj")).toHaveText("CNPJ 12.ABC.345/01DE-35");

    // Trocar empresa: Esc volta sem mudar; escolher outra troca sem novo login.
    await page.getByRole("button", { name: "Trocar empresa" }).click();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("empresa-nome")).toHaveText("Mercado Silva Norte");
    await page.getByRole("button", { name: "Trocar empresa" }).click();
    await page.getByRole("button", { name: /Mercado Silva Sul/ }).click();
    await expect(page.getByTestId("empresa-nome")).toHaveText("Mercado Silva Sul");
    expect(api.contar("/v1/auth/login")).toBe(1);
  });

  test("nenhuma empresa disponível: informa e não prossegue", async () => {
    api.usuario("operador@silva.local").empresas = [{ ...centro, ativa: false }];
    const { page } = await abrir();
    await entrar(page, "operador@silva.local", SENHA);

    await expect(page.getByRole("heading", { name: "Nenhuma empresa disponível" })).toBeVisible();
    await expect(page.getByText("não há empresa disponível para você operar")).toBeVisible();
    await expect(page.getByTestId("empresa-nome")).toHaveCount(0);
    await page.getByRole("button", { name: "Sair" }).click();
    await expect(page.getByTestId("tela-login")).toBeVisible();
  });
});

test("senha temporária: define a nova senha no PDV antes da empresa", async () => {
  api.usuario("dono@silva.local").senhaTemporaria = true;
  const { page } = await abrir();
  await entrar(page, "dono@silva.local", SENHA);

  await expect(page.getByRole("heading", { name: "Defina uma nova senha" })).toBeVisible();
  await expect(page.getByLabel("Senha atual")).toBeFocused();

  // Validação local (política) e da API (senha atual).
  await page.getByLabel("Senha atual").fill(SENHA);
  await page.getByLabel("Nova senha", { exact: true }).fill("curta");
  await page.getByLabel("Confirme a nova senha").fill("curta");
  await page.keyboard.press("Enter");
  await expect(page.getByText("A senha deve ter ao menos 8 caracteres")).toBeVisible();

  await page.getByLabel("Senha atual").fill("Senha#Errada1");
  await page.getByLabel("Nova senha", { exact: true }).fill("Nova#Senha2026");
  await page.getByLabel("Confirme a nova senha").fill("Nova#Senha2026");
  await page.keyboard.press("Enter");
  await expect(page.getByText("Senha atual incorreta")).toBeVisible();

  await page.getByLabel("Senha atual").fill(SENHA);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Escolha a empresa" })).toBeVisible();
  expect(api.usuario("dono@silva.local")).toMatchObject({
    senha: "Nova#Senha2026",
    senhaTemporaria: false,
  });
});

test.describe("sessão", () => {
  test("reabrir com a sessão válida: direto na empresa escolhida", async () => {
    const primeiro = await abrir();
    await entrar(primeiro.page, "dono@silva.local", SENHA);
    await primeiro.page.getByRole("button", { name: /Mercado Silva Sul/ }).click();
    await expect(primeiro.page.getByTestId("empresa-nome")).toHaveText("Mercado Silva Sul");
    await fechar(primeiro);

    // Arquivo cifrado pelo sistema operacional, sem o token legível.
    const arquivo = readFileSync(join(dados.dir, "session.bin"));
    for (const token of api.tokensEmitidos) {
      expect(arquivo.toString("latin1")).not.toContain(token);
    }

    const { page } = await abrir();
    await expect(page.getByTestId("empresa-nome")).toHaveText("Mercado Silva Sul");
    expect(api.contar("/v1/auth/login")).toBe(1);
  });

  test("sessão recusada pela API (usuário desativado): volta ao login", async () => {
    const primeiro = await abrir();
    await entrar(primeiro.page, "operador@silva.local", SENHA);
    await expect(primeiro.page.getByTestId("empresa-nome")).toBeVisible();
    await fechar(primeiro);

    api.usuario("operador@silva.local").ativo = false;
    const { page } = await abrir();
    await expect(page.getByTestId("tela-login")).toBeVisible();
    expect(existsSync(join(dados.dir, "session.bin"))).toBe(false);
  });

  test("sair: volta ao login e, ao reabrir, não restaura a sessão", async () => {
    const primeiro = await abrir();
    await entrar(primeiro.page, "operador@silva.local", SENHA);
    await primeiro.page.getByRole("button", { name: "Sair" }).click();
    await expect(primeiro.page.getByTestId("tela-login")).toBeVisible();
    expect(api.sessoesAtivasDe("operador@silva.local")).toBe(0);
    await fechar(primeiro);

    const { page } = await abrir();
    await expect(page.getByTestId("tela-login")).toBeVisible();
    await expect(page.getByLabel("E-mail")).toHaveValue("");
  });

  test("a interface não tem acesso a tokens nem ao Node.js", async () => {
    const { page } = await abrir();
    await entrar(page, "dono@silva.local", SENHA);
    await page.getByRole("button", { name: /Mercado Silva Centro/ }).click();
    await expect(page.getByTestId("empresa-nome")).toBeVisible();

    const exposto = await page.evaluate(async () => {
      // Executa no renderer; os tipos do DOM não fazem parte deste tsconfig.
      const janela = globalThis as unknown as {
        superPdv: Record<string, Record<string, unknown>>;
        document: { cookie: string; documentElement: { outerHTML: string } };
      };
      const api = janela.superPdv;
      const document = janela.document;
      return {
        require: typeof (globalThis as { require?: unknown }).require,
        process: typeof (globalThis as { process?: unknown }).process,
        api: Object.fromEntries(Object.entries(api).map(([k, v]) => [k, Object.keys(v).sort()])),
        sessao: await (api.sessao!.obter as () => Promise<unknown>)(),
        armazenamento: JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }),
        cookies: document.cookie,
        html: document.documentElement.outerHTML,
      };
    });

    expect(exposto.require).toBe("undefined");
    expect(exposto.process).toBe("undefined");
    expect(exposto.api).toEqual({
      localDb: ["status"],
      sessao: ["obter"],
      auth: ["abrirRecuperacaoSenha", "entrar", "sair", "trocarSenha"],
      empresa: ["escolher"],
    });
    const visivel = JSON.stringify(exposto);
    expect(api.tokensEmitidos.size).toBeGreaterThan(0);
    for (const token of api.tokensEmitidos) expect(visivel).not.toContain(token);
    expect(JSON.stringify(exposto.sessao)).not.toMatch(/token/i);
  });
});
