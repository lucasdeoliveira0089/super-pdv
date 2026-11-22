import { join } from "node:path";
import { app, BrowserWindow, dialog, ipcMain, safeStorage, shell } from "electron";
import type { LocalDbStatus } from "../shared/ipc";
import { type ConfigPdv, ConfigInvalidaError, lerConfig } from "./config";
import { registrarIpc } from "./ipc";
import { openLocalDb, type LocalDb } from "./local-db";
import { ServicoSessao } from "./sessao";
import { SessionStore } from "./session-store";

// Permite isolar os dados em testes E2E (pasta temporária no lugar de %APPDATA%).
if (process.env.SUPER_PDV_USER_DATA_DIR) {
  app.setPath("userData", process.env.SUPER_PDV_USER_DATA_DIR);
}

let localDb: LocalDb | undefined;

/**
 * Endereços gravados no build. Fora do app empacotado (dev e E2E), variáveis de
 * ambiente do processo podem substituí-los, por exemplo para a API simulada.
 */
function carregarConfig(): ConfigPdv {
  const doProcesso = (nome: "MAIN_VITE_API_URL" | "MAIN_VITE_GESTOR_URL") =>
    app.isPackaged ? undefined : process.env[nome];
  return lerConfig({
    MAIN_VITE_API_URL: doProcesso("MAIN_VITE_API_URL") ?? import.meta.env.MAIN_VITE_API_URL,
    MAIN_VITE_GESTOR_URL:
      doProcesso("MAIN_VITE_GESTOR_URL") ?? import.meta.env.MAIN_VITE_GESTOR_URL,
  });
}

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    title: "Super PDV",
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });

  window.on("ready-to-show", () => window.show());

  // Links externos abrem no navegador do sistema, nunca dentro do PDV.
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://")) void shell.openExternal(url);
    return { action: "deny" };
  });

  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) {
    void window.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void window.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

function localDbStatus(): LocalDbStatus {
  return localDb?.status() ?? { status: "indisponivel" };
}

void app.whenReady().then(() => {
  app.setAppUserModelId("br.com.superpdv.pdv");

  let config: ConfigPdv;
  try {
    config = carregarConfig();
  } catch (error) {
    const detalhe = error instanceof ConfigInvalidaError ? error.problemas.join("\n") : error;
    dialog.showErrorBox("Super PDV — configuração inválida", String(detalhe));
    app.quit();
    return;
  }

  try {
    localDb = openLocalDb(app.getPath("userData"));
  } catch (error) {
    console.error("Falha ao abrir o banco local:", error);
  }

  const sessao = new ServicoSessao({
    apiUrl: config.apiUrl,
    // Criptografia do sistema operacional (DPAPI no Windows), disponível após o `ready`.
    store: new SessionStore(app.getPath("userData"), safeStorage),
  });

  registrarIpc(ipcMain, {
    sessao,
    localDbStatus,
    abrirRecuperacaoSenha: () => shell.openExternal(`${config.gestorUrl}/esqueci-senha`),
  });

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("will-quit", () => {
  localDb?.close();
});
