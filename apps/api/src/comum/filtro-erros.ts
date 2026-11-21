import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  Logger,
} from "@nestjs/common";
import type { ApiErro, CodigoErro } from "@super-pdv/shared";
import type { Request, Response } from "express";
import { ErroApi } from "./erros";

const CODIGO_POR_STATUS: Record<number, CodigoErro> = {
  400: "VALIDACAO",
  401: "NAO_AUTENTICADO",
  403: "SEM_PERMISSAO",
  404: "NAO_ENCONTRADO",
  409: "CONFLITO",
  422: "REGRA_NEGOCIO",
  429: "MUITAS_REQUISICOES",
};

const MENSAGEM_POR_STATUS: Record<number, string> = {
  401: "Sessão inválida ou expirada",
  403: "Você não tem permissão para esta operação",
  404: "Recurso não encontrado",
  429: "Muitas requisições. Tente novamente em instantes.",
};

/**
 * Converte qualquer erro no formato público `{ statusCode, code, message, fieldErrors? }`.
 * Erros inesperados viram 500 sem detalhes internos (o detalhe vai só para o log).
 * Os endpoints de saúde mantêm o próprio formato.
 */
@Catch()
export class FiltroDeErros implements ExceptionFilter {
  private readonly logger = new Logger("Erros");

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const res = http.getResponse<Response>();
    const req = http.getRequest<Request>();

    if (exception instanceof ErroApi) {
      res.status(exception.getStatus()).json(exception.corpo);
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      if (req.path.startsWith("/health/")) {
        res.status(status).json(exception.getResponse());
        return;
      }
      const corpo: ApiErro = {
        statusCode: status,
        code: CODIGO_POR_STATUS[status] ?? (status >= 500 ? "ERRO_INTERNO" : "VALIDACAO"),
        message: MENSAGEM_POR_STATUS[status] ?? "Requisição inválida",
      };
      res.status(status).json(corpo);
      return;
    }

    this.logger.error(
      `${req.method} ${req.path}: ${exception instanceof Error ? exception.stack : String(exception)}`,
    );
    const corpo: ApiErro = {
      statusCode: 500,
      code: "ERRO_INTERNO",
      message: "Erro interno. Tente novamente.",
    };
    res.status(500).json(corpo);
  }
}
