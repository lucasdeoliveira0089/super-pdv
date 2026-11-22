import { expect, test } from "@playwright/test";
import { DONO_DEMO, EQUIPE, entrar, entrarComoEquipe, gerarCnpj, menu, sair, unico } from "./util";

test.describe("autenticação no admin", () => {
  test("página interna sem login leva ao login e volta à página pedida", async ({ page }) => {
    await page.goto("/equipe");
    await expect(page).toHaveURL(/\/login\?next=%2Fequipe$/);
    await expect(page.getByLabel("E-mail")).toBeFocused();
    await entrar(page, EQUIPE.email, EQUIPE.senha);
    await expect(page).toHaveURL(/\/equipe$/);
    await expect(page.getByTestId("usuario-logado")).toHaveText("Equipe Demonstração");
  });

  test("credenciais inválidas mostram mensagem genérica", async ({ page }) => {
    await page.goto("/login");
    await entrar(page, EQUIPE.email, "Senha#Errada123");
    await expect(page.getByRole("alert").first()).toHaveText("E-mail ou senha inválidos");
  });

  test("Dono de cliente não entra no admin", async ({ page }) => {
    await page.goto("/login");
    await entrar(page, DONO_DEMO.email, DONO_DEMO.senha);
    await expect(page.getByRole("alert").first()).toHaveText("E-mail ou senha inválidos");
  });

  test("tokens da sessão não ficam acessíveis ao JavaScript da página", async ({ page }) => {
    await entrarComoEquipe(page);
    expect(await page.evaluate(() => document.cookie)).not.toMatch(/spdv_/);
  });
});

test.describe("equipe", () => {
  test("cadastra membro, que precisa trocar a senha temporária no primeiro acesso", async ({
    page,
  }) => {
    const email = `membro.${unico()}@superpdv.local`;
    await entrarComoEquipe(page);
    await menu(page).getByRole("link", { name: "Equipe" }).click();
    await expect(page.getByRole("heading", { name: "Novo membro" })).toBeVisible();
    await page.getByLabel("Nome").fill("Carla Teste");
    await page.getByLabel("E-mail").fill(email);
    await page.getByRole("button", { name: "Cadastrar membro" }).click();

    const senha = await page.getByTestId("senha-valor").textContent();
    expect(senha).toHaveLength(16);
    await expect(page.getByTestId("senha-temporaria")).toContainText("não será exibida novamente");

    await sair(page);
    await entrar(page, email, senha!);
    await expect(page).toHaveURL(/\/trocar-senha$/);
    await page.goto("/clientes");
    await expect(page).toHaveURL(/\/trocar-senha$/);

    await page.getByLabel("Senha atual").fill(senha!);
    await page.getByLabel("Nova senha", { exact: true }).fill("Carla#Nova2026");
    await page.getByLabel("Confirme a nova senha").fill("Carla#Nova2026");
    await page.getByRole("button", { name: "Salvar nova senha" }).click();
    await expect(page).toHaveURL(/\/clientes$/);
    await expect(page.getByTestId("usuario-logado")).toHaveText("Carla Teste");
  });
});

test.describe("clientes e empresas", () => {
  test("cadastra cliente com 1ª empresa e Dono, adiciona empresa, suspende e reativa", async ({
    page,
  }) => {
    const nome = `Grupo E2E ${unico()}`;
    const cnpj = gerarCnpj();
    await entrarComoEquipe(page);
    await page.getByRole("link", { name: "Novo cliente" }).click();

    // CNPJ inválido: erro junto ao campo e nada é salvo.
    await page.getByLabel("Nome do cliente").fill(nome);
    await page.getByLabel("CNPJ").fill("11.222.333/0001-82");
    await page.getByLabel("Razão social").fill("Mercado E2E Ltda");
    await page.getByLabel("Nome fantasia").fill("Mercado E2E");
    await page.getByLabel("Nome do Dono").fill("João E2E");
    await page.getByLabel("E-mail do Dono").fill(`dono.${unico()}@e2e.local`);
    await page.getByRole("button", { name: "Cadastrar cliente" }).click();
    await expect(page.getByLabel("CNPJ")).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText("CNPJ inválido")).toBeVisible();

    await page.getByLabel("CNPJ").fill(cnpj);
    await page.getByRole("button", { name: "Cadastrar cliente" }).click();
    await expect(page.getByTestId("senha-temporaria")).toContainText(
      "Senha temporária de João E2E",
    );
    await page.getByRole("link", { name: "Ver cliente" }).click();

    await expect(page.getByRole("heading", { name: nome })).toBeVisible();
    await expect(page.getByRole("cell", { name: cnpj })).toBeVisible();
    await expect(page.getByText("João E2E")).toBeVisible();

    // Nova empresa
    const cnpj2 = gerarCnpj();
    await page.getByRole("link", { name: "Nova empresa" }).click();
    await page.getByLabel("CNPJ").fill(cnpj2);
    await page.getByLabel("Razão social").fill("Filial E2E Ltda");
    await page.getByLabel("Nome fantasia").fill("Filial E2E");
    await page.getByRole("button", { name: "Adicionar empresa" }).click();
    await expect(page.getByRole("cell", { name: "Filial E2E", exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: cnpj2 })).toBeVisible();

    // Suspender e reativar
    await page.getByRole("button", { name: "Suspender cliente" }).click();
    await expect(page.getByText("Suspenso", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Reativar cliente" }).click();
    await expect(page.getByText("Ativo", { exact: true })).toBeVisible();

    // Busca por CNPJ
    await menu(page).getByRole("link", { name: "Clientes" }).click();
    await expect(page).toHaveURL(/\/clientes$/);
    await page.getByLabel("Buscar por nome ou CNPJ").fill(cnpj2);
    // A busca é aplicada pela API e fica no endereço (spec web-layout).
    await expect(page).toHaveURL(/busca=/);
    await expect(page.getByRole("link", { name: nome })).toBeVisible();
    await expect(page.getByRole("table", { name: "Clientes" }).getByRole("row")).toHaveCount(2);
  });
});
