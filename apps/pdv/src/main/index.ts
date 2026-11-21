import { join } from "node:path";
import { app, BrowserWindow, ipcMain, shell } from "electron";
import { IpcChannel, type LocalDbStatus } from "../shared/ipc";
import { openLocalDb, type LocalDb } from "./local-db";

// Permite isolar os dados em testes E2E (pasta temporária no lugar de %APPDATA%).
if (process.env.SUPER_PDV_USER_DATA_DIR) {
  app.setPath("userData", process.env.SUPER_PDV_USER_DATA_DIR);
}

let localDb: LocalDb | undefined;

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

  try {
    localDb = openLocalDb(app.getPath("userData"));
  } catch (error) {
    console.error("Falha ao abrir o banco local:", error);
  }

  ipcMain.handle(IpcChannel.LocalDbStatus, () => localDbStatus());

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
