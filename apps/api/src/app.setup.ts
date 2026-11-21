import type { INestApplication } from "@nestjs/common";
import { FiltroDeErros } from "./comum/filtro-erros";

/** Configuração HTTP comum à aplicação real e aos testes. */
export function configurarApp(app: INestApplication): INestApplication {
  // Rotas de negócio sob /v1; saúde continua em /health/* (monitoramento).
  app.setGlobalPrefix("v1", { exclude: ["health/live", "health/ready"] });
  app.useGlobalFilters(new FiltroDeErros());
  app.enableShutdownHooks();
  return app;
}
