import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { _electron as electron, type ElectronApplication, type Page } from "@playwright/test";

const MAIN = join(__dirname, "..", "out", "main", "index.js");
export const GESTOR_URL = "http://gestor.teste";
/** Porta sem servidor: simula a API inacessível. */
export const API_INACESSIVEL = "http://127.0.0.1:9";

export interface PdvAberto {
  app: ElectronApplication;
  page: Page;
}

/** Pasta de dados do PDV (como %APPDATA%), reutilizável entre aberturas. */
export function novaPastaDeDados(): { dir: string; remover: () => void } {
  const dir = mkdtempSync(join(tmpdir(), "super-pdv-e2e-"));
  return { dir, remover: () => rmSync(dir, { recursive: true, force: true }) };
}

/** Abre o app construído (out/) apontando para a API informada. */
export async function abrirPdv(userDataDir: string, apiUrl: string): Promise<PdvAberto> {
  // ELECTRON_RUN_AS_NODE (definida por alguns hosts, como o VS Code) faria o
  // Electron rodar como Node puro; removida para iniciar o app de verdade.
  const env: Record<string, string | undefined> = {
    ...process.env,
    SUPER_PDV_USER_DATA_DIR: userDataDir,
    MAIN_VITE_API_URL: apiUrl,
    MAIN_VITE_GESTOR_URL: GESTOR_URL,
  };
  delete env.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({ args: [MAIN], env: env as Record<string, string> });
  const page = await app.firstWindow();
  return { app, page };
}

/** Login preenchendo os campos (sem esperar o resultado). */
export async function entrar(page: Page, email: string, senha: string): Promise<void> {
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
}
