import { contextBridge, ipcRenderer } from "electron";
import { IpcChannel, type SuperPdvApi } from "../shared/ipc";

// Única ponte entre o renderer (sem acesso ao Node) e o processo principal.
// Nada aqui expõe tokens: as respostas são as do processo principal (D2).
const api: SuperPdvApi = {
  localDb: {
    status: () => ipcRenderer.invoke(IpcChannel.LocalDbStatus),
  },
  sessao: {
    obter: () => ipcRenderer.invoke(IpcChannel.SessaoObter),
  },
  auth: {
    entrar: (email, senha) => ipcRenderer.invoke(IpcChannel.AuthEntrar, email, senha),
    trocarSenha: (senhaAtual, novaSenha) =>
      ipcRenderer.invoke(IpcChannel.AuthTrocarSenha, senhaAtual, novaSenha),
    sair: () => ipcRenderer.invoke(IpcChannel.AuthSair),
    abrirRecuperacaoSenha: () => ipcRenderer.invoke(IpcChannel.AbrirRecuperacaoSenha),
  },
  empresa: {
    escolher: (empresaId) => ipcRenderer.invoke(IpcChannel.EmpresaEscolher, empresaId),
  },
};

contextBridge.exposeInMainWorld("superPdv", api);
