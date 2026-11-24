import { expect, type Page, test } from "@playwright/test";
import {
  criarClienteSemResponsavel,
  criarEmpresaSemEndereco,
  DONO_DEMO,
  EQUIPE,
  entrar,
  entrarComoEquipe,
  gerarCnpj,
  menu,
  sair,
  unico,
} from "./util";

test.describe("tema", () => {
  test.use({ colorScheme: "dark" });

  test("admin abre claro mesmo com o sistema no modo escuro e tema escuro salvo", async ({
    page,
  }) => {
    await page.addInitScript(() => localStorage.setItem("theme", "dark"));
    await entrarComoEquipe(page);
    const html = page.locator("html");
    await expect(html).toHaveClass(/\blight\b/);
    await expect(html).not.toHaveClass(/\bdark\b/);
  });
});

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
  /** Preenche a empresa, a localização e o responsável do formulário "Novo cliente" (sem enviar). */
  async function preencherNovoCliente(page: Page, fantasia: string, cnpj = gerarCnpj()) {
    await page.getByLabel("CNPJ").fill(cnpj);
    await page.getByLabel("Razão social").fill(`${fantasia} Ltda`);
    await page.getByLabel("Nome fantasia").fill(fantasia);
    await page.getByLabel("CEP").fill("01310-100");
    // CEP conhecido pelo serviço falso: endereço preenchido e foco no número.
    await expect(page.getByLabel("Logradouro")).toHaveValue("Avenida Paulista");
    await expect(page.getByLabel("Número")).toBeFocused();
    await page.getByLabel("Número").fill("1000");
    await page.getByLabel("Nome do responsável").fill("Maria E2E");
    await page.getByLabel("Celular").fill("11987654321");
    await page.getByLabel("E-mail do responsável").fill(`maria.${unico()}@e2e.local`);
  }

  /** Cadastra um cliente pelo admin e abre o detalhe; devolve o id do cliente. */
  async function cadastrarCliente(page: Page, fantasia: string): Promise<string> {
    await page.goto("/clientes/novo");
    await preencherNovoCliente(page, fantasia);
    await page.getByRole("button", { name: "Cadastrar cliente" }).click();
    // Após o cadastro, o admin abre o detalhe do cliente.
    await expect(page.getByRole("heading", { name: fantasia })).toBeVisible();
    return new URL(page.url()).pathname.split("/")[2]!;
  }

  const linhaDaEmpresa = (page: Page, fantasia: string) =>
    page
      .getByRole("table", { name: "Empresas do cliente" })
      .getByRole("row")
      .filter({ has: page.getByRole("cell", { name: fantasia, exact: true }) });

  test("cadastra cliente com empresa, endereço pelo CEP e responsável; Dono no detalhe; suspende e reativa", async ({
    page,
  }) => {
    const fantasia = `Mercado E2E ${unico()}`;
    const cnpj = gerarCnpj();
    await entrarComoEquipe(page);
    await page.getByRole("link", { name: "Novo cliente" }).click();
    await expect(page.getByLabel("Nome do cliente")).toHaveCount(0);

    // Cartões na ordem certa; obrigatórios anunciados, complemento opcional.
    await expect(page.getByRole("heading", { level: 2 })).toHaveText([
      "Empresa",
      "Localização",
      "Responsável",
    ]);
    await expect(page.getByLabel("Nome do Dono")).toHaveCount(0);
    const localizacao = page.getByRole("region", { name: "Localização" });
    await expect(localizacao.getByLabel("CEP")).toHaveAttribute("aria-required", "true");
    await expect(localizacao.getByLabel("Complemento")).not.toHaveAttribute("aria-required");

    // Preenche tudo, mas com CNPJ inválido, sem o número e um telefone fixo como celular.
    await preencherNovoCliente(page, fantasia, "11.222.333/0001-82");
    await page.getByLabel("Número").fill("");
    await expect(page.getByLabel("Cidade")).toHaveValue("São Paulo");
    await expect(page.getByLabel("UF")).toHaveValue("SP");
    await page.getByLabel("Celular").fill("(11) 3456-7890");
    await page.getByRole("button", { name: "Cadastrar cliente" }).click();
    await expect(page.getByLabel("CNPJ")).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText("CNPJ inválido")).toBeVisible();
    await expect(page.getByLabel("Celular")).toHaveAttribute("aria-invalid", "true");
    // O erro do número aparece dentro do cartão "Localização".
    await expect(localizacao.getByText("Informe o número", { exact: true })).toBeVisible();
    await expect(localizacao.getByLabel("Número")).toHaveAttribute("aria-invalid", "true");
    // Tudo o que foi digitado continua no formulário após o erro.
    await expect(page.getByLabel("Celular")).toHaveValue("(11) 3456-7890");
    await expect(page.getByLabel("Nome do responsável")).toHaveValue("Maria E2E");
    await expect(page.getByLabel("Logradouro")).toHaveValue("Avenida Paulista");
    await expect(page.getByLabel("UF")).toHaveValue("SP");

    await page.getByLabel("CNPJ").fill(cnpj);
    await page.getByLabel("Número").fill("1000");
    await page.getByLabel("Celular").fill("(11) 98765-4321");
    await page.getByRole("button", { name: "Cadastrar cliente" }).click();

    // Abre o detalhe; o cliente leva o nome fantasia da empresa e ainda não tem Dono.
    await expect(page.getByRole("heading", { name: fantasia })).toBeVisible();
    await expect(page.getByText(/^Nenhum Dono cadastrado/)).toBeVisible();
    await expect(page.getByRole("cell", { name: cnpj })).toBeVisible();
    await expect(
      linhaDaEmpresa(page, fantasia).getByRole("cell", {
        name: "Avenida Paulista, 1000 — São Paulo/SP · 01310-100",
      }),
    ).toBeVisible();
    await expect(page.getByText("Maria E2E")).toBeVisible();
    await expect(page.getByText("(11) 98765-4321")).toBeVisible();

    // Cadastro do Dono no detalhe: e-mail repetido recusado junto ao campo; depois, a senha.
    await page.getByRole("link", { name: "Cadastrar Dono" }).click();
    await page.getByLabel("Nome do Dono").fill("João E2E");
    await page.getByLabel("E-mail do Dono").fill(DONO_DEMO.email);
    await page.getByRole("button", { name: "Cadastrar Dono" }).click();
    await expect(page.getByLabel("E-mail do Dono")).toHaveAttribute("aria-invalid", "true");
    // Junto ao campo (o alerta do topo repete a mensagem).
    await expect(
      page.locator("[data-slot=field-error]", { hasText: "E-mail já está em uso" }),
    ).toBeVisible();
    await page.getByLabel("E-mail do Dono").fill(`dono.${unico()}@e2e.local`);
    await page.getByRole("button", { name: "Cadastrar Dono" }).click();
    await expect(page.getByTestId("senha-temporaria")).toContainText(
      "Senha temporária de João E2E",
    );
    await page.getByRole("link", { name: "Voltar ao cliente" }).click();
    await expect(page.getByRole("listitem").filter({ hasText: "João E2E" })).toBeVisible();
    await expect(page.getByText(/^Nenhum Dono cadastrado/)).toHaveCount(0);

    // Suspender e reativar
    await page.getByRole("button", { name: "Suspender cliente" }).click();
    await expect(page.getByText("Suspenso", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Reativar cliente" }).click();
    await expect(page.getByText("Ativo", { exact: true })).toBeVisible();

    // Busca por CNPJ
    await menu(page).getByRole("link", { name: "Clientes" }).click();
    await expect(page).toHaveURL(/\/clientes$/);
    await page.getByLabel("Buscar por nome ou CNPJ").fill(cnpj);
    // A busca é aplicada pela API e fica no endereço (spec web-layout).
    await expect(page).toHaveURL(/busca=/);
    await expect(page.getByRole("link", { name: fantasia })).toBeVisible();
    await expect(page.getByRole("table", { name: "Clientes" }).getByRole("row")).toHaveCount(2);
  });

  test("máscara do CNPJ aceita números e letras e ignora letra no dígito verificador", async ({
    page,
  }) => {
    await entrarComoEquipe(page);
    await page.goto("/clientes/novo");
    const cnpj = page.getByLabel("CNPJ");
    await cnpj.pressSequentially("12abc34501de35");
    await expect(cnpj).toHaveValue("12.ABC.345/01DE-35");
    await cnpj.fill("");
    await cnpj.pressSequentially("11222333000181");
    await expect(cnpj).toHaveValue("11.222.333/0001-81");
    await cnpj.fill("");
    await cnpj.pressSequentially("112223330001X8");
    await expect(cnpj).toHaveValue("11.222.333/0001-8");
    await cnpj.fill("12.ABC.345/01DE-35");
    await expect(cnpj).toHaveValue("12.ABC.345/01DE-35");
  });

  test("altera o responsável; cliente antigo mostra que não há responsável", async ({ page }) => {
    await entrarComoEquipe(page);
    const fantasia = `Responsável E2E ${unico()}`;
    await cadastrarCliente(page, fantasia);

    await page.getByRole("link", { name: "Editar responsável" }).click();
    await expect(page.getByRole("navigation", { name: /trilha/i })).toContainText("Responsável");
    await expect(page.getByLabel("Celular")).toHaveValue("(11) 98765-4321");
    await page.getByLabel("Celular").fill("(11) 3456-7890");
    await page.getByRole("button", { name: "Salvar responsável" }).click();
    await expect(page.getByLabel("Celular")).toHaveAttribute("aria-invalid", "true");
    await page.getByLabel("Celular").fill("(21) 99876-5432");
    await page.getByRole("button", { name: "Salvar responsável" }).click();
    await expect(page.getByRole("heading", { name: fantasia })).toBeVisible();
    await expect(page.getByText("(21) 99876-5432")).toBeVisible();

    const antigo = await criarClienteSemResponsavel(`Cliente antigo ${unico()}`);
    await page.goto(`/clientes/${antigo}`);
    await expect(page.getByText("Responsável não cadastrado.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Cadastrar responsável" })).toBeVisible();
  });

  test("empresas: CEP não encontrado com endereço à mão, edição do endereço e empresa antiga", async ({
    page,
  }) => {
    await entrarComoEquipe(page);
    const clienteId = await cadastrarCliente(page, `Empresas E2E ${unico()}`);

    // Serviço de CEP fora do ar e CEP desconhecido: sem mensagens, preenchimento manual.
    const filial = `Filial E2E ${unico()}`;
    await page.getByRole("link", { name: "Nova empresa" }).click();
    await page.getByLabel("CNPJ").fill(gerarCnpj());
    await page.getByLabel("Razão social").fill(`${filial} Ltda`);
    await page.getByLabel("Nome fantasia").fill(filial);
    for (const [cep, status] of [
      ["88888-888", 502],
      ["99999-999", 404],
    ] as const) {
      const busca = page.waitForResponse((r) => r.url().includes("/api/cep/"));
      await page.getByLabel("CEP").fill(cep);
      expect((await busca).status()).toBe(status);
      await expect(page.getByLabel("Logradouro")).toHaveValue("");
    }
    await expect(page.getByRole("status")).toHaveCount(0);
    await expect(page.getByText(/CEP não encontrado|Não foi possível buscar/)).toHaveCount(0);
    await page.getByLabel("Logradouro").fill("Rua Manual");
    await page.getByLabel("Número").fill("50");
    await page.getByLabel("Bairro").fill("Centro");
    await page.getByLabel("Cidade").fill("Porto Alegre");
    await page.getByLabel("UF").selectOption("RS");
    await page.getByRole("button", { name: "Adicionar empresa" }).click();
    await expect(
      linhaDaEmpresa(page, filial).getByRole("cell", {
        name: "Rua Manual, 50 — Porto Alegre/RS · 99999-999",
      }),
    ).toBeVisible();

    // Edição do número, mantendo o resto do endereço.
    await linhaDaEmpresa(page, filial).getByRole("link", { name: "Editar" }).click();
    await expect(page.getByLabel("Logradouro")).toHaveValue("Rua Manual");
    await page.getByLabel("Número").fill("50-A");
    await page.getByRole("button", { name: "Salvar empresa" }).click();
    await expect(
      linhaDaEmpresa(page, filial).getByRole("cell", {
        name: "Rua Manual, 50-A — Porto Alegre/RS · 99999-999",
      }),
    ).toBeVisible();

    // Empresa cadastrada antes do endereço existir: só salva com o endereço completo.
    const antiga = `Antiga E2E ${unico()}`;
    await criarEmpresaSemEndereco(clienteId, antiga, gerarCnpj());
    await page.reload();
    await expect(
      linhaDaEmpresa(page, antiga).getByRole("cell", { name: "Não cadastrado" }),
    ).toBeVisible();
    await linhaDaEmpresa(page, antiga).getByRole("link", { name: "Editar" }).click();
    await expect(page.getByText("Endereço não cadastrado")).toBeVisible();
    await page.getByRole("button", { name: "Salvar empresa" }).click();
    await expect(page.getByLabel("CEP")).toHaveAttribute("aria-invalid", "true");
    await page.getByLabel("CEP").fill("20040-002");
    await expect(page.getByLabel("Logradouro")).toHaveValue("Rua da Assembleia");
    await page.getByLabel("Número").fill("10");
    await page.getByRole("button", { name: "Salvar empresa" }).click();
    await expect(
      linhaDaEmpresa(page, antiga).getByRole("cell", {
        name: "Rua da Assembleia, 10 — Rio de Janeiro/RJ · 20040-002",
      }),
    ).toBeVisible();
  });

  test("novo cliente no celular: cartões em uma coluna, sem rolagem horizontal", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await entrarComoEquipe(page);
    await page.goto("/clientes/novo");
    await expect(page.getByRole("region", { name: "Localização" })).toBeVisible();
    const rolagem = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(rolagem).toBe(0);
    const caixa = (nome: string) => page.getByRole("region", { name: nome }).boundingBox();
    const [empresa, local] = [await caixa("Empresa"), await caixa("Localização")];
    // Um cartão abaixo do outro, com a mesma largura.
    expect(local!.y).toBeGreaterThan(empresa!.y + empresa!.height - 1);
    expect(Math.round(local!.width)).toBe(Math.round(empresa!.width));
  });
});

test.describe("largura do conteúdo", () => {
  /** Largura e deslocamento do centro de um elemento em relação ao centro do <main>. */
  async function medir(page: Page, alvo: ReturnType<Page["locator"]>) {
    const main = (await page.locator("main").boundingBox())!;
    const caixa = (await alvo.boundingBox())!;
    return {
      largura: caixa.width,
      desvio: Math.abs(caixa.x + caixa.width / 2 - (main.x + main.width / 2)),
    };
  }

  test("tela Full HD: lista e formulário ocupam o contêiner de até 1280 px, centralizados", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await entrarComoEquipe(page);
    const lista = await medir(page, page.getByRole("table", { name: "Clientes" }));
    expect(lista.largura).toBeLessThanOrEqual(1280);
    expect(lista.largura).toBeGreaterThan(1200);
    expect(lista.desvio).toBeLessThan(2);

    await page.goto("/clientes/novo");
    for (const alvo of [
      page.getByRole("heading", { level: 1, name: "Novo cliente" }).locator("../.."),
      page.getByRole("region", { name: "Empresa" }),
      page.getByRole("region", { name: "Localização" }),
    ]) {
      const m = await medir(page, alvo);
      // Mesma largura da lista (a tabela tem 1 px de borda de cada lado).
      expect(Math.abs(m.largura - lista.largura)).toBeLessThanOrEqual(2);
      expect(m.desvio).toBeLessThan(2);
    }
    // Em tela larga, os campos da empresa ficam na mesma linha.
    const topo = async (rotulo: string) => (await page.getByLabel(rotulo).boundingBox())!.y;
    expect(await topo("Razão social")).toBe(await topo("CNPJ"));
    expect(await topo("Nome fantasia")).toBe(await topo("CNPJ"));
  });

  test("cabeçalho fica fixo no topo ao rolar", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 600 });
    await entrarComoEquipe(page);
    await page.goto("/clientes/novo");
    await page.mouse.wheel(0, 5000);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    const trilha = page.getByRole("navigation", { name: "Trilha de navegação" });
    await expect(trilha).toBeInViewport();
    expect((await trilha.boundingBox())!.y).toBeLessThan(64);
  });

  test("notebook: lista ocupa a largura disponível, sem rolagem horizontal", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await entrarComoEquipe(page);
    await expect(page.getByRole("table", { name: "Clientes" })).toBeVisible();
    const rolagem = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(rolagem).toBe(0);
  });
});
