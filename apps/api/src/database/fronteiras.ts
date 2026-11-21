import type { ModulesContainer } from "@nestjs/core";
import { DatabaseModule } from "./database.module";
import { SystemDbModule } from "./system-db";

/**
 * Módulos autorizados a importar o acesso privilegiado (`SystemDbModule`):
 * autenticação, rotas do admin (equipe) e comandos CLI.
 */
export const PODEM_USAR_SYSTEM_DB = new Set(["AuthModule", "AdminModule", "CliModule"]);

/** Módulos autorizados a importar a conexão bruta (`DatabaseModule`). */
export const PODEM_USAR_CONEXAO_BRUTA = new Set([
  "TenantDbModule",
  "SystemDbModule",
  "HealthModule",
]);

/** Lista violações das regras de acesso ao banco no grafo de módulos do Nest. */
export function violacoesDeAcessoAoBanco(container: ModulesContainer): string[] {
  const violacoes: string[] = [];
  for (const modulo of container.values()) {
    const nome = modulo.metatype?.name ?? "?";
    for (const importado of modulo.imports) {
      if (importado.metatype === SystemDbModule && !PODEM_USAR_SYSTEM_DB.has(nome)) {
        violacoes.push(`${nome} importa SystemDbModule`);
      }
      if (importado.metatype === DatabaseModule && !PODEM_USAR_CONEXAO_BRUTA.has(nome)) {
        violacoes.push(`${nome} importa DatabaseModule`);
      }
    }
  }
  return violacoes;
}
