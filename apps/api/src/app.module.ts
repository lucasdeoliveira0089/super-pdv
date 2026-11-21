import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ClsModule } from "nestjs-cls";
import { AdminModule } from "./admin/admin.module";
import { AuthModule } from "./auth/auth.module";
import { GestorModule } from "./gestor/gestor.module";
import { MailerModule } from "./email/mailer";
import { configOptions } from "./config/config.options";
import { TenantDbModule } from "./database/tenant-db";
import { HealthModule } from "./health/health.module";

@Module({
  imports: [
    ConfigModule.forRoot(configOptions),
    // Contexto por requisição (AsyncLocalStorage): cliente e usuário autenticados.
    ClsModule.forRoot({ global: true, middleware: { mount: true } }),
    TenantDbModule,
    MailerModule,
    HealthModule,
    AuthModule,
    AdminModule,
    GestorModule,
  ],
})
export class AppModule {}
