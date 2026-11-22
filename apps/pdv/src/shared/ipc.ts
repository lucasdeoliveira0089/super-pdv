import type { EmpresaResumo, Papel } from "@super-pdv/shared";

/** Canais IPC entre o processo principal e o renderer. */
export const IpcChannel = {
  LocalDbStatus: "local-db:status",
  SessaoObter: "sessao:obter",
  AuthEntrar: "auth:entrar",
  AuthTrocarSenha: "auth:trocar-senha",
  AuthSair: "auth:sair",
  EmpresaEscolher: "empresa:escolher",
  AbrirRecuperacaoSenha: "auth:abrir-recuperacao-senha",
} as const;

/** Estado do banco SQLite local do caixa. */
export type LocalDbStatus =
  { status: "operante"; sqliteVersion: string } | { status: "indisponivel" };

/**
 * Erros que chegam à interface (D2): sempre um código, nunca a mensagem crua da
 * rede. `SENHA_INVALIDA` traz a mensagem de validação da API por campo.
 */
export type CodigoErroPdv =
  | "CREDENCIAIS_INVALIDAS"
  | "BLOQUEADO"
  | "SEM_CONEXAO"
  | "SESSAO_EXPIRADA"
  | "SENHA_INVALIDA"
  | "SEM_PERMISSAO"
  | "ERRO_INESPERADO";

export interface ErroPdv {
  codigo: CodigoErroPdv;
  /** Mensagens de validação por campo (somente `SENHA_INVALIDA`). */
  campos?: { senhaAtual?: string; novaSenha?: string };
}

export type Resultado<T> = { ok: true; valor: T } | { ok: false; erro: ErroPdv };

/** Sessão vista pela interface: dados do usuário e empresas, **sem tokens**. */
export interface SessaoPdv {
  usuario: { nome: string; email: string; papel: Papel; senhaTemporaria: boolean };
  cliente: { nome: string };
  /** Empresas ativas em que o usuário pode operar. */
  empresas: EmpresaResumo[];
  /** Empresa escolhida para operar (sempre uma de `empresas`) ou `null`. */
  empresaId: string | null;
}

/** Resultado da abertura do PDV (D4). */
export interface InicioPdv {
  sessao: SessaoPdv | null;
  /** A sessão salva não pôde ser renovada por falta de conexão. */
  semConexao: boolean;
}

/** API exposta ao renderer pelo preload (`window.superPdv`). */
export interface SuperPdvApi {
  localDb: {
    status: () => Promise<LocalDbStatus>;
  };
  sessao: {
    /** Sessão atual; na primeira chamada, restaura a sessão salva (D4). */
    obter: () => Promise<InicioPdv>;
  };
  auth: {
    entrar: (email: string, senha: string) => Promise<Resultado<SessaoPdv>>;
    trocarSenha: (senhaAtual: string, novaSenha: string) => Promise<Resultado<SessaoPdv>>;
    sair: () => Promise<void>;
    /** Abre a recuperação de senha do gestor no navegador padrão. */
    abrirRecuperacaoSenha: () => Promise<void>;
  };
  empresa: {
    escolher: (empresaId: string) => Promise<Resultado<SessaoPdv>>;
  };
}
