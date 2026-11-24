import { expect, type Page, test } from "@playwright/test";
import { URL_API } from "./portas";
import { DEMO, entrar, SENHA_DEMO, sair, unico } from "./util";

// Cenários da spec `web-layout` (estrutura visual comum do admin e do gestor).

const API = URL_API;

/** Garante ao menos `minimo` usuários no cliente de demonstração (cria pela API). */
async function garantirUsuarios(minimo: number): Promise<void> {
  const login = await fetch(`${API}/v1/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: DEMO.dono, senha: SENHA_DEMO }),
  });
  const { accessToken } = (await login.json()) as { accessToken: string };
  const auth = { authorization: `Bearer ${accessToken}`, "content-type": "application/json" };
  const atuais = (await (await fetch(`${API}/v1/usuarios`, { headers: auth })).json()) as unknown[];
  for (let i = atuais.length; i < minimo; i++) {
    const r = await fetch(`${API}/v1/usuarios`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        nome: `Paginação ${unico()}`,
        email: `paginacao.${unico()}@demo.local`,
        papel: "administrador",
      }),
    });
    expect(r.status).toBe(201);
  }
}

const menuLateral = (page: Page) => page.locator("[data-slot=sidebar][data-state]");

test.describe("telas de autenticação", () => {
  test("login em tela larga: formulário e painel da marca", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/login");
    await expect(page.getByLabel("E-mail")).toBeVisible();
    await expect(page.getByTestId("painel-marca")).toBeVisible();
    await expect(page.getByTestId("painel-marca")).toContainText("Super PDV");
  });

  test("login no celular: sem painel e sem rolagem horizontal", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/login");
    await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
    await expect(page.getByTestId("painel-marca")).toBeHidden();
    const rolagem = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(rolagem).toBeLessThanOrEqual(0);
  });

  test("só oferece entrar e 'Esqueci minha senha'", async ({ page }) => {
    await page.goto("/login");
    const conteudo = page.getByRole("main");
    await expect(conteudo.getByRole("button")).toHaveText(["Entrar"]);
    await expect(conteudo.getByRole("link")).toHaveText(["Esqueci minha senha"]);
  });
});

test.describe("casca das páginas", () => {
  test("topo do menu identifica o cliente, sem troca de cliente ou empresa", async ({ page }) => {
    await entrar(page, DEMO.dono);
    const contexto = page.getByTestId("contexto-menu");
    await expect(contexto).toContainText("Demonstração");
    await expect(contexto.locator("button, [aria-haspopup]")).toHaveCount(0);
  });

  test("Ctrl+B recolhe o menu para ícones e o estado vale ao recarregar", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await entrar(page, DEMO.dono);
    await expect(menuLateral(page)).toHaveAttribute("data-state", "expanded");

    await page.keyboard.press("Control+b");
    await expect(menuLateral(page)).toHaveAttribute("data-state", "collapsed");
    // O nome do item aparece ao focar o ícone.
    await page.getByRole("link", { name: "Usuários" }).focus();
    await expect(page.getByRole("tooltip", { name: "Usuários" })).toBeVisible();

    await page.reload();
    await expect(menuLateral(page)).toHaveAttribute("data-state", "collapsed");
    await page.keyboard.press("Control+b");
    await expect(menuLateral(page)).toHaveAttribute("data-state", "expanded");
  });

  test("no celular, o menu abre sobre o conteúdo e fecha ao escolher um item", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await entrar(page, DEMO.dono);
    const gaveta = page.getByRole("dialog", { name: "Menu" });
    await expect(gaveta).toBeHidden();

    await page.getByRole("button", { name: "Mostrar ou recolher o menu" }).first().click();
    await expect(gaveta).toBeVisible();
    await gaveta.getByRole("link", { name: "Usuários" }).click();
    await expect(page).toHaveURL(/\/usuarios$/);
    await expect(gaveta).toBeHidden();
  });

  test("menu do usuário: nome, e-mail, 'Trocar senha' e 'Sair'", async ({ page }) => {
    await entrar(page, DEMO.dono);
    await page.getByRole("button", { name: /^Menu do usuário/ }).click();
    const menu = page.getByRole("menu");
    await expect(menu).toContainText("Dono Demonstração");
    await expect(menu).toContainText(DEMO.dono);
    await expect(menu.getByRole("menuitem")).toHaveText(["Trocar senha", "Sair"]);
    await page.keyboard.press("Escape");
    await sair(page);
  });

  test("trilha de navegação na página de detalhe", async ({ page }) => {
    await entrar(page, DEMO.dono);
    await page.goto("/usuarios");
    await page.getByRole("link", { name: "Administrador Demonstração" }).click();
    await expect(page).toHaveURL(/\/usuarios\/[0-9a-f-]{36}$/);

    const trilha = page.getByRole("navigation", { name: "Trilha de navegação" });
    await expect(trilha).toContainText("Detalhes");
    await trilha.getByRole("link", { name: "Usuários" }).click();
    await expect(page).toHaveURL(/\/usuarios$/);
  });
});

test.describe("tabelas de listagem", () => {
  test("ordena pelo nome, esconde coluna e pagina de 10 em 10", async ({ page }) => {
    await garantirUsuarios(15);
    await entrar(page, DEMO.dono);
    await page.goto("/usuarios");
    const tabela = page.getByRole("table", { name: "Usuários" });
    const linhas = tabela.locator("tbody tr");
    const cabecalhoNome = tabela.getByRole("columnheader", { name: "Nome" });

    // Paginação
    await expect(linhas).toHaveCount(10);
    await expect(page.getByTestId("contagem")).toHaveText(/^1–10 de \d+ usuários$/);
    await expect(page.getByRole("button", { name: "Anterior" })).toBeDisabled();
    await page.getByRole("button", { name: "Próximo" }).click();
    await expect(page.getByTestId("contagem")).toHaveText(/^11–\d+ de \d+ usuários$/);

    // Ordenação (inicial: nome crescente)
    await expect(cabecalhoNome).toHaveAttribute("aria-sort", "ascending");
    const primeiro = await linhas.first().locator("td").first().textContent();
    await cabecalhoNome.getByRole("button").click();
    await expect(cabecalhoNome).toHaveAttribute("aria-sort", "descending");
    await expect(page.getByTestId("contagem")).toHaveText(/^1–10 /);
    const nomes = await linhas.locator("td:first-child").allTextContents();
    expect(nomes).toEqual([...nomes].sort((a, b) => b.localeCompare(a, "pt-BR")));
    expect(nomes[0]).not.toBe(primeiro);

    // Colunas
    await expect(tabela.getByRole("columnheader", { name: "E-mail" })).toBeVisible();
    await page.getByRole("button", { name: "Colunas" }).click();
    await page.getByRole("menuitemcheckbox", { name: "E-mail" }).click();
    await page.keyboard.press("Escape");
    await expect(tabela.getByRole("columnheader", { name: "E-mail" })).toHaveCount(0);
  });

  test("filtro fica no endereço, vale ao recarregar e 'Limpar filtros' volta à lista completa", async ({
    page,
  }) => {
    await entrar(page, DEMO.dono);
    await page.goto("/usuarios");
    await page.getByRole("button", { name: "Filtrar por situação" }).click();
    await page.getByRole("menuitemradio", { name: "Inativos" }).click();
    await expect(page).toHaveURL(/ativo=false/);

    await page.reload();
    await expect(
      page.getByRole("button", { name: "Filtrar por situação: Inativos" }),
    ).toBeVisible();
    await expect
      .poll(async () => [
        ...new Set(await page.locator("tbody tr td:nth-child(5)").allTextContents()),
      ])
      .not.toContain("Ativo");

    await page.getByRole("button", { name: "Limpar filtros" }).click();
    await expect(page).toHaveURL(/\/usuarios$/);
    await expect(page.getByRole("button", { name: "Limpar filtros" })).toHaveCount(0);
    await expect(page.locator("tbody tr td:nth-child(5)").first()).toHaveText(/Ativo|Inativo/);
  });

  test("filtro sem resultados mostra a mensagem da tabela", async ({ page }) => {
    await entrar(page, DEMO.dono);
    // Donos não podem ser desativados: não há Dono inativo.
    await page.goto("/usuarios?papel=dono&ativo=false");
    await expect(page.getByRole("cell", { name: "Nenhum usuário encontrado." })).toBeVisible();
    await expect(page.getByTestId("contagem")).toHaveText("0 usuários");
  });
});

test("ação principal na cor de destaque violeta", async ({ page }) => {
  await entrar(page, DEMO.dono);
  await page.goto("/usuarios");
  const cor = await page
    .getByRole("link", { name: "Novo usuário" })
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  // Converte para RGB pelo canvas (o navegador pode devolver oklch).
  const [r, g, b] = await page.evaluate((c) => {
    const ctx = document.createElement("canvas").getContext("2d")!;
    ctx.fillStyle = c;
    ctx.fillRect(0, 0, 1, 1);
    return [...ctx.getImageData(0, 0, 1, 1).data];
  }, cor);
  // Violeta: azul e vermelho bem acima do verde.
  expect(b!).toBeGreaterThan(g! + 100);
  expect(r!).toBeGreaterThan(g! + 40);
});
