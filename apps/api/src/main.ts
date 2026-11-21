import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import type { Env } from "./config/env";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();

  const port = app.get(ConfigService<Env, true>).get("PORT", { infer: true });
  await app.listen(port);
  Logger.log(`API ouvindo em http://localhost:${port}`, "Bootstrap");
}

bootstrap().catch((error: unknown) => {
  Logger.error(error instanceof Error ? error.message : error, undefined, "Bootstrap");
  process.exit(1);
});
