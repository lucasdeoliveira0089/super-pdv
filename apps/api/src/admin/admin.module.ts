import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { SystemDbModule } from "../database/system-db";
import {
  ClientesAdminController,
  EmpresasAdminController,
  UsuariosAdminController,
} from "./clientes.controller";
import { ClientesService } from "./clientes.service";
import { EquipeController } from "./equipe.controller";
import { EquipeService } from "./equipe.service";

/**
 * Rotas do admin (equipe Super PDV). Usa o acesso privilegiado: por definição,
 * a equipe vê e gerencia dados de vários clientes.
 */
@Module({
  imports: [SystemDbModule, AuthModule],
  controllers: [
    EquipeController,
    ClientesAdminController,
    EmpresasAdminController,
    UsuariosAdminController,
  ],
  providers: [EquipeService, ClientesService],
  exports: [EquipeService, ClientesService],
})
export class AdminModule {}
