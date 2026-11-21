import { contextBridge, ipcRenderer } from "electron";
import { IpcChannel, type LocalDbStatus, type SuperPdvApi } from "../shared/ipc";

// Única ponte entre o renderer (sem acesso ao Node) e o processo principal.
const api: SuperPdvApi = {
  localDb: {
    status: () => ipcRenderer.invoke(IpcChannel.LocalDbStatus) as Promise<LocalDbStatus>,
  },
};

contextBridge.exposeInMainWorld("superPdv", api);
