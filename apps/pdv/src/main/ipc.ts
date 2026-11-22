import { IpcChannel, type LocalDbStatus } from "../shared/ipc";
import type { ServicoSessao } from "./sessao";

/** Subconjunto do `ipcMain` usado aqui (injetável nos testes). */
export interface RegistroIpc {
  handle(canal: string, handler: (evento: unknown, ...args: unknown[]) => unknown): void;
}

export interface DependenciasIpc {
  sessao: ServicoSessao;
  localDbStatus: () => LocalDbStatus;
  abrirRecuperacaoSenha: () => Promise<void>;
}

/**
 * Registra os canais IPC do PDV (D2). Os argumentos vêm do renderer e são
 * tratados como não confiáveis (o serviço valida); as respostas nunca contêm
 * tokens.
 */
export function registrarIpc(ipc: RegistroIpc, deps: DependenciasIpc): void {
  ipc.handle(IpcChannel.LocalDbStatus, () => deps.localDbStatus());
  ipc.handle(IpcChannel.SessaoObter, () => deps.sessao.obter());
  ipc.handle(IpcChannel.AuthEntrar, (_e, email, senha) => deps.sessao.entrar(email, senha));
  ipc.handle(IpcChannel.AuthTrocarSenha, (_e, atual, nova) => deps.sessao.trocarSenha(atual, nova));
  ipc.handle(IpcChannel.AuthSair, () => deps.sessao.sair());
  ipc.handle(IpcChannel.EmpresaEscolher, (_e, empresaId) => deps.sessao.escolherEmpresa(empresaId));
  ipc.handle(IpcChannel.AbrirRecuperacaoSenha, () => deps.abrirRecuperacaoSenha());
}
