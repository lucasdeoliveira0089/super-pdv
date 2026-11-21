import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerModule } from "@nestjs/throttler";
import type { Env } from "../config/env";
import { SystemDbModule } from "../database/system-db";
import { AuthClienteController, MeController } from "./auth-cliente.controller";
import { AuthCore } from "./auth-core.service";
import { AuthEquipeController, EquipeMeController } from "./auth-equipe.controller";
import { AutenticacaoGuard } from "./autenticacao.guard";
import { PermissoesGuard } from "./permissoes";
import { Relogio } from "./relogio";
import { TokensAcesso } from "./tokens";

@Module({
  imports: [
    SystemDbModule,
    // Limite por IP nas rotas de autenticação (aplicado com @UseGuards(ThrottlerGuard)).
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => [
        { ttl: 60_000, limit: config.get("LIMITE_AUTH_POR_MINUTO", { infer: true }) },
      ],
    }),
  ],
  controllers: [AuthClienteController, MeController, AuthEquipeController, EquipeMeController],
  providers: [
    Relogio,
    TokensAcesso,
    AuthCore,
    // API fechada por padrão: toda rota exige autenticação, salvo @Publico().
    { provide: APP_GUARD, useClass: AutenticacaoGuard },
    // Depois da autenticação (guards globais executam na ordem de registro).
    { provide: APP_GUARD, useClass: PermissoesGuard },
  ],
  exports: [AuthCore, Relogio],
})
export class AuthModule {}
