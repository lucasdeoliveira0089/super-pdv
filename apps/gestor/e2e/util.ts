import { expect, type Page } from "@playwright/test";

export const SENHA_DEMO = "Demo#Senha2026";
export const DEMO = {
  dono: "dono@demo.local",
  admin: "admin@demo.local",
  gerente: "gerente@demo.local",
  operador: "operador@demo.local",
};

export const unico = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Preenche e envia o login (sem esperar o resultado). */
export async function tentarEntrar(page: Page, email: string, senha = SENHA_DEMO): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
}

/** Faz login e espera sair da tela de login (sessão gravada). */
export async function entrar(page: Page, email: string, senha = SENHA_DEMO): Promise<void> {
  await tentarEntrar(page, email, senha);
  await expect(page).not.toHaveURL(/\/login/);
}

export async function sair(page: Page): Promise<void> {
  // Páginas autenticadas: "Sair" fica no menu do usuário, no rodapé do menu lateral.
  // Telas sem menu (ex.: "Acesso pelo PDV") têm o botão direto.
  const botao = page.getByRole("button", { name: "Sair", exact: true });
  if (await botao.isVisible()) {
    await botao.click();
  } else {
    await page.getByRole("button", { name: /^Menu do usuário/ }).click();
    await page.getByRole("menuitem", { name: "Sair" }).click();
  }
  await expect(page).toHaveURL(/\/login/);
}

/** Cadastra um usuário pelo gestor (logado como quem pode) e devolve a senha temporária. */
export async function cadastrarUsuario(
  page: Page,
  dados: { nome: string; email: string; papel: string; empresas: string[] },
): Promise<string> {
  await page.goto("/usuarios/novo");
  await page.getByLabel("Nome").fill(dados.nome);
  await page.getByLabel("E-mail").fill(dados.email);
  await page.getByLabel("Papel").selectOption({ label: dados.papel });
  for (const empresa of dados.empresas) await page.getByLabel(empresa).check();
  await page.getByRole("button", { name: "Cadastrar usuário" }).click();
  const senha = await page.getByTestId("senha-valor").textContent();
  expect(senha).toHaveLength(16);
  return senha!;
}

export async function trocarSenhaObrigatoria(page: Page, atual: string, nova: string) {
  await expect(page).toHaveURL(/\/trocar-senha$/);
  await page.getByLabel("Senha atual").fill(atual);
  await page.getByLabel("Nova senha", { exact: true }).fill(nova);
  await page.getByLabel("Confirme a nova senha").fill(nova);
  await page.getByRole("button", { name: "Salvar nova senha" }).click();
}

/** Lê o último e-mail enviado para `email` na caixa do Mailpit (localhost:8025). */
export async function ultimoEmail(email: string): Promise<string> {
  const api = "http://localhost:8025/api/v1";
  for (let i = 0; i < 20; i++) {
    const busca = (await (
      await fetch(`${api}/search?query=${encodeURIComponent(`to:"${email}"`)}`)
    ).json()) as { messages: { ID: string }[] };
    const [ultima] = busca.messages;
    if (ultima) {
      const msg = (await (await fetch(`${api}/message/${ultima.ID}`)).json()) as { Text: string };
      return msg.Text;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Nenhum e-mail para ${email} no Mailpit`);
}

/** Menu lateral principal (evita confundir com os links da trilha de navegação). */
export const menu = (page: Page) => page.getByRole("navigation", { name: "Menu principal" });
