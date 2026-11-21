import { type ApiErro, type TokensResponse, tokensResponseSchema } from "@super-pdv/shared";
import { ClienteApi, ErroDaApi } from "./cliente-api";
import type { ConfigSessao } from "./config";
import { type ArmazemCookies, gravarTokens, limparTokens } from "./cookies";

/** Resultado das ações de formulário (serializável para Server Actions). */
export type ResultadoAcao =
  | { ok: true }
  | { ok: false; mensagem: string; campos?: Record<string, string[]>; code?: ApiErro["code"] };

export function falha(erro: unknown): ResultadoAcao {
  if (erro instanceof ErroDaApi) {
    return {
      ok: false,
      mensagem: erro.corpo.message,
      code: erro.corpo.code,
      ...(erro.corpo.fieldErrors ? { campos: erro.corpo.fieldErrors } : {}),
    };
  }
  return { ok: false, mensagem: "Não foi possível falar com o servidor. Tente novamente." };
}

async function executar(fn: () => Promise<unknown>): Promise<ResultadoAcao> {
  try {
    await fn();
    return { ok: true };
  } catch (erro) {
    return falha(erro);
  }
}

/** Ações de sessão usadas pelas Server Actions dos apps web. */
export function acoesDeSessao(
  config: ConfigSessao,
  cookies: ArmazemCookies,
  api = new ClienteApi(config, cookies),
) {
  return {
    entrar: (email: string, senha: string) =>
      executar(async () => {
        const tokens: TokensResponse = await api.requisitar("POST", `${config.rotasAuth}/login`, {
          corpo: { email, senha },
          schema: tokensResponseSchema,
          publica: true,
        });
        gravarTokens(cookies, config, tokens);
      }),

    sair: () =>
      executar(async () => {
        const refreshToken = cookies.get(config.cookies.renovacao)?.value;
        limparTokens(cookies, config);
        if (refreshToken) {
          await api.requisitar("POST", `${config.rotasAuth}/logout`, {
            corpo: { refreshToken },
            publica: true,
          });
        }
      }),

    trocarSenha: (senhaAtual: string, novaSenha: string) =>
      executar(() =>
        api.requisitar("POST", `${config.rotasAuth}/senha`, { corpo: { senhaAtual, novaSenha } }),
      ),

    solicitarRecuperacao: (email: string) =>
      executar(() =>
        api.requisitar("POST", `${config.rotasAuth}/recuperacao`, {
          corpo: { email },
          publica: true,
        }),
      ),

    confirmarRecuperacao: (token: string, novaSenha: string) =>
      executar(() =>
        api.requisitar("POST", `${config.rotasAuth}/recuperacao/confirmar`, {
          corpo: { token, novaSenha },
          publica: true,
        }),
      ),
  };
}
