// Utilitários para testes de integração (Testcontainers). Não usar em produção.
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { migrar } from "./migrar";

/** Imagem usada nos testes: mesma versão maior do docker-compose.yml. */
export const IMAGEM_POSTGRES = "postgres:18";

export interface PostgresDeTeste {
  url: string;
  container: StartedPostgreSqlContainer;
  parar: () => Promise<void>;
}

/** Sobe um PostgreSQL efêmero com todas as migrations aplicadas. */
export async function iniciarPostgresDeTeste(): Promise<PostgresDeTeste> {
  const container = await new PostgreSqlContainer(IMAGEM_POSTGRES).start();
  const url = container.getConnectionUri();
  await migrar(url);
  return { url, container, parar: async () => void (await container.stop()) };
}
