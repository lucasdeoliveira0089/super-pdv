import type { EmpresaResumo } from "@super-pdv/shared";
import type { CodigoErroPdv, SessaoPdv } from "../../shared/ipc";

// Máquina de estados das telas do PDV (D3):
// carregando → login → trocar-senha → escolher-empresa → principal,
// voltando ao login quando a sessão é recusada.

export type AvisoLogin = "SEM_CONEXAO" | "SESSAO_EXPIRADA";

export type Etapa =
  | { tela: "carregando" }
  | { tela: "login"; aviso?: AvisoLogin }
  | { tela: "trocar-senha"; sessao: SessaoPdv }
  | { tela: "sem-empresa"; sessao: SessaoPdv }
  | { tela: "escolher-empresa"; sessao: SessaoPdv; podeVoltar: boolean }
  | { tela: "principal"; sessao: SessaoPdv; empresa: EmpresaResumo };

/** Tela que corresponde ao estado da sessão vindo do processo principal. */
export function etapaDaSessao(sessao: SessaoPdv | null, aviso?: AvisoLogin): Etapa {
  if (!sessao) return aviso ? { tela: "login", aviso } : { tela: "login" };
  if (sessao.usuario.senhaTemporaria) return { tela: "trocar-senha", sessao };
  if (sessao.empresas.length === 0) return { tela: "sem-empresa", sessao };
  const empresa = sessao.empresas.find((e) => e.id === sessao.empresaId);
  if (!empresa) return { tela: "escolher-empresa", sessao, podeVoltar: false };
  return { tela: "principal", sessao, empresa };
}

/** "Trocar empresa" a partir da tela principal (sem novo login). */
export function trocarEmpresa(etapa: Etapa): Etapa {
  if (etapa.tela !== "principal" || etapa.sessao.empresas.length < 2) return etapa;
  return { tela: "escolher-empresa", sessao: etapa.sessao, podeVoltar: true };
}

/** Mensagens exibidas para cada código de erro do processo principal. */
export const MENSAGEM_ERRO: Record<CodigoErroPdv, string> = {
  CREDENCIAIS_INVALIDAS: "E-mail ou senha inválidos",
  BLOQUEADO: "Muitas tentativas de login. Tente novamente em 15 minutos.",
  SEM_CONEXAO:
    "Sem conexão com o servidor. É necessária conexão com o servidor para entrar no PDV.",
  SESSAO_EXPIRADA: "Sua sessão foi encerrada. Entre novamente.",
  SENHA_INVALIDA: "Verifique a senha informada.",
  SEM_PERMISSAO: "O seu usuário não tem permissão para operar o PDV.",
  ERRO_INESPERADO: "Não foi possível concluir a operação. Tente novamente.",
};
