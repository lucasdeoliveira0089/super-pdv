import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { EmpresasController } from "./empresas.controller";
import { UsuariosController } from "./usuarios.controller";
import { UsuariosService } from "./usuarios.service";

/** Rotas usadas pelo gestor do cliente. Acesso a dados somente via TenantDb (RLS). */
@Module({
  imports: [AuthModule],
  controllers: [EmpresasController, UsuariosController],
  providers: [UsuariosService],
})
export class GestorModule {}
