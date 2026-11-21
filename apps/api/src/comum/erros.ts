import { HttpException } from "@nestjs/common";
import type { ApiErro, CodigoErro } from "@super-pdv/shared";

/** Erro de negócio/HTTP já no formato público da API. */
export class ErroApi extends HttpException {
  constructor(
    statusCode: number,
    code: CodigoErro,
    message: string,
    fieldErrors?: Record<string, string[]>,
  ) {
    const corpo: ApiErro = { statusCode, code, message, ...(fieldErrors ? { fieldErrors } : {}) };
    super(corpo, statusCode);
  }

  get corpo(): ApiErro {
    return this.getResponse() as ApiErro;
  }
}

export const naoEncontrado = (message = "Registro não encontrado") =>
  new ErroApi(404, "NAO_ENCONTRADO", message);

export const semPermissao = (message = "Você não tem permissão para esta operação") =>
  new ErroApi(403, "SEM_PERMISSAO", message);

export const naoAutenticado = (message = "Sessão inválida ou expirada") =>
  new ErroApi(401, "NAO_AUTENTICADO", message);

export const conflito = (message: string, campo?: string) =>
  new ErroApi(409, "CONFLITO", message, campo ? { [campo]: [message] } : undefined);

export const regraDeNegocio = (message: string, campo?: string) =>
  new ErroApi(422, "REGRA_NEGOCIO", message, campo ? { [campo]: [message] } : undefined);
