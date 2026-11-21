import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { configOptions } from "./config/config.options";
import { DatabaseModule } from "./database/database.module";
import { HealthModule } from "./health/health.module";

@Module({
  imports: [ConfigModule.forRoot(configOptions), DatabaseModule, HealthModule],
})
export class AppModule {}
