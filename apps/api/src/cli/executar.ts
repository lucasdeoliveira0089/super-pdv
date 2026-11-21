import "reflect-metadata";
import type { INestApplicationContext } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { CliModule } from "./cli.module";

export interface ResultadoCli {
  codigo: number;
  saida: string;
}

/** Sobe o contexto da CLI, executa o comando e encerra com o código devolvido. */
export function rodarComando(
  comando: (ctx: INestApplicationContext, argv: string[]) => Promise<ResultadoCli>,
): void {
  (async () => {
    const ctx = await NestFactory.createApplicationContext(CliModule, { logger: ["error"] });
    try {
      const { codigo, saida } = await comando(ctx, process.argv.slice(2));
      (codigo === 0 ? console.log : console.error)(saida);
      process.exitCode = codigo;
    } finally {
      await ctx.close();
    }
  })().catch((erro: unknown) => {
    console.error(erro instanceof Error ? erro.message : erro);
    process.exit(1);
  });
}
