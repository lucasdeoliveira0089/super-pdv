import { Injectable, type PipeTransform } from "@nestjs/common";
import type { z } from "zod";
import { ErroApi } from "./erros";

/** Agrupa as mensagens de um erro do zod por campo (caminho com pontos). */
export function errosPorCampo(error: z.ZodError): Record<string, string[]> {
  const campos: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const campo = issue.path.join(".") || "_";
    (campos[campo] ??= []).push(issue.message);
  }
  return campos;
}

/** Valida e transforma corpo, query ou parâmetros com um schema zod. */
@Injectable()
export class ZodPipe<S extends z.ZodType> implements PipeTransform<unknown, z.output<S>> {
  constructor(private readonly schema: S) {}

  transform(value: unknown): z.output<S> {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new ErroApi(400, "VALIDACAO", "Dados inválidos", errosPorCampo(result.error));
    }
    return result.data;
  }
}
