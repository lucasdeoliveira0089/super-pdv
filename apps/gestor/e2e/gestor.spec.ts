import { expect, test } from "@playwright/test";
import {
  cadastrarUsuario,
  DEMO,
  entrar,
  sair,
  tentarEntrar,
  trocarSenhaObrigatoria,
  ultimoEmail,
  unico,
} from "./util";

test.describe("sessão no gestor", () => {
  test("página interna sem login leva ao login e volta à página pedida", async ({ page }) => {
    await page.goto("/usuarios");
    await expect(page).toHaveURL(/\/login\?next=%2Fusuarios$/);
    await page.getByLabel("E-mail").fill(DEMO.dono);
    await page.getByLabel("Senha", { exact: true }).fill("Demo#Senha2026");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/usuarios$/);
    await expect(page.getByTestId("usuario-logado")).toHaveText("Dono Demonstração");
  });

  test("credenciais inválidas mostram mensagem genérica", async ({ page }) => {
    await tentarEntrar(page, DEMO.admin, "Senha#Errada123");
    await expect(page.getByRole("alert").first()).toHaveText("E-mail ou senha inválidos");
  });

  test("Operador de caixa não acessa o gestor e é orientado a usar o PDV", async ({ page }) => {
    await entrar(page, DEMO.operador);
    await expect(page.getByRole("heading", { name: "Acesso pelo PDV" })).toBeVisible();
    await expect(page.getByText("Operador de caixa")).toBeVisible();
    await sair(page);
  });
});

test.describe("Gerente", () => {
  test("vê apenas as suas empresas", async ({ page }) => {
    await entrar(page, DEMO.gerente);
    await expect(page).toHaveURL(/\/empresas$/);
    await expect(
      page.getByRole("cell", { name: "Mercado Demo Centro", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("cell", { name: "Mercado Demo Norte", exact: true })).toHaveCount(
      0,
    );
    await expect(page.getByRole("cell", { name: "11.222.333/0001-81" })).toBeVisible();
  });

  test("ao cadastrar usuário, só pode escolher Operador de caixa e as suas empresas", async ({
    page,
  }) => {
    await entrar(page, DEMO.gerente);
    await page.goto("/usuarios/novo");
    const papeis = await page.getByLabel("Papel").locator("option").allTextContents();
    expect(papeis).toEqual(["Operador de caixa"]);
    await expect(page.getByLabel("Mercado Demo Centro")).toBeVisible();
    await expect(page.getByLabel("Mercado Demo Norte")).toHaveCount(0);
  });

  test("endereço reservado (editar um Administrador) mostra acesso negado", async ({ page }) => {
    await entrar(page, DEMO.gerente);
    await page.getByRole("link", { name: "Usuários" }).click();
    await page.getByRole("link", { name: "Administrador Demonstração" }).click();
    await expect(page).toHaveURL(/\/usuarios\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("link", { name: "Editar" })).toHaveCount(0);
    await page.goto(`${page.url()}/editar`);
    await expect(page.getByRole("heading", { name: "Acesso negado" })).toBeVisible();
  });
});

test.describe("usuários", () => {
  test("Dono cadastra Gerente, que troca a senha temporária no 1º login e vê só a sua empresa", async ({
    page,
  }) => {
    const email = `gerente.${unico()}@demo.local`;
    await entrar(page, DEMO.dono);
    const senha = await cadastrarUsuario(page, {
      nome: "Gerente E2E",
      email,
      papel: "Gerente",
      empresas: ["Mercado Demo Norte"],
    });
    await expect(page.getByTestId("senha-temporaria")).toContainText("não será exibida novamente");
    await sair(page);

    await tentarEntrar(page, email, senha);
    await trocarSenhaObrigatoria(page, senha, "Gerente#E2E2026");
    await expect(page).toHaveURL(/\/empresas$/);
    await expect(page.getByRole("cell", { name: "Mercado Demo Norte", exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "Mercado Demo Centro", exact: true })).toHaveCount(
      0,
    );
  });

  test("desativar impede o login; reativar libera", async ({ page, browser }) => {
    const email = `operador.${unico()}@demo.local`;
    await entrar(page, DEMO.admin);
    await cadastrarUsuario(page, {
      nome: "Operador Desativado",
      email,
      papel: "Operador de caixa",
      empresas: ["Mercado Demo Centro"],
    });
    await page.getByRole("link", { name: "Ver usuário" }).click();
    await page.getByRole("button", { name: "Desativar" }).click();
    await expect(page.getByText("Inativo", { exact: true })).toBeVisible();

    const outra = await browser.newPage({ baseURL: "http://localhost:3000" });
    await tentarEntrar(outra, email, "Qualquer#Senha1");
    await expect(outra.getByRole("alert").first()).toHaveText("E-mail ou senha inválidos");
    await outra.close();

    await page.getByRole("button", { name: "Reativar" }).click();
    await expect(page.getByText("Ativo", { exact: true })).toBeVisible();
  });

  test("filtro por papel", async ({ page }) => {
    await entrar(page, DEMO.dono);
    await page.goto("/usuarios");
    await page.getByLabel("Papel").selectOption({ label: "Gerente" });
    await page.getByRole("button", { name: "Filtrar" }).click();
    await expect(page).toHaveURL(/papel=gerente/);
    const papeis = await page.locator("tbody tr td:nth-child(3)").allTextContents();
    expect(papeis.length).toBeGreaterThan(0);
    expect(new Set(papeis)).toEqual(new Set(["Gerente"]));
  });
});

test.describe("recuperação de senha", () => {
  test("link recebido por e-mail redefine a senha", async ({ page }) => {
    const email = `recupera.${unico()}@demo.local`;
    await entrar(page, DEMO.dono);
    const temporaria = await cadastrarUsuario(page, {
      nome: "Recupera E2E",
      email,
      papel: "Administrador",
      empresas: [],
    });
    expect(temporaria).toBeTruthy();
    await sair(page);

    await page.getByRole("link", { name: "Esqueci minha senha" }).click();
    await page.getByLabel("E-mail").fill(email);
    await page.getByRole("button", { name: "Enviar link de redefinição" }).click();
    await expect(page.getByText("Verifique o seu e-mail")).toBeVisible();

    const texto = await ultimoEmail(email);
    const link = /(http:\/\/localhost:3000\/redefinir-senha\?token=\S+)/.exec(texto)?.[1];
    expect(link).toBeTruthy();
    await page.goto(link!);
    await page.getByLabel("Nova senha", { exact: true }).fill("Recuperada#2026");
    await page.getByLabel("Confirme a nova senha").fill("Recuperada#2026");
    await page.getByRole("button", { name: "Definir nova senha" }).click();
    await expect(page).toHaveURL(/\/login\?redefinida=1$/);
    await expect(page.getByText("Senha redefinida")).toBeVisible();

    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Senha", { exact: true }).fill("Recuperada#2026");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByTestId("usuario-logado")).toHaveText("Recupera E2E");
  });
});
