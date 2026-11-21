import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ClsModule } from "nestjs-cls";
import { AdminModule } from "../admin/admin.module";
import { configOptions } from "../config/config.options";
import { SystemDbModule } from "../database/system-db";
import { TenantDbModule } from "../database/tenant-db";
import { MailerModule } from "../email/mailer";

/** Contexto dos comandos de linha de comando (sem servidor HTTP). */
@Module({
  imports: [
    ConfigModule.forRoot(configOptions),
    ClsModule.forRoot({ global: true }),
    TenantDbModule,
    MailerModule,
    SystemDbModule,
    AdminModule,
  ],
})
export class CliModule {}
