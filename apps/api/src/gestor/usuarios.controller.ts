import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import {
  type SenhaTemporariaResponse,
  type Usuario,
  usuarioAtualizarSchema,
  type UsuarioAtualizar,
  type UsuarioCriadoResponse,
  usuarioCriarSchema,
  type UsuarioCriar,
  usuarioFiltrosSchema,
  type UsuarioFiltros,
} from "@super-pdv/shared";
import { UsuarioAtual } from "../auth/decoradores";
import { RequerPermissao } from "../auth/permissoes";
import { ZodPipe } from "../comum/zod.pipe";
import type { UsuarioAutenticado } from "../contexto/contexto";
import { UsuariosService } from "./usuarios.service";

@Controller("usuarios")
export class UsuariosController {
  constructor(private readonly usuarios: UsuariosService) {}

  @Get()
  @RequerPermissao("usuario.ler")
  listar(
    @UsuarioAtual() ator: UsuarioAutenticado,
    @Query(new ZodPipe(usuarioFiltrosSchema)) filtros: UsuarioFiltros,
  ): Promise<Usuario[]> {
    return this.usuarios.listar(ator, filtros);
  }

  @Get(":id")
  @RequerPermissao("usuario.ler")
  obter(
    @UsuarioAtual() ator: UsuarioAutenticado,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<Usuario> {
    return this.usuarios.obter(ator, id);
  }

  @Post()
  @RequerPermissao("usuario.gerenciar", "usuario.gerenciar_operadores")
  criar(
    @UsuarioAtual() ator: UsuarioAutenticado,
    @Body(new ZodPipe(usuarioCriarSchema)) corpo: UsuarioCriar,
  ): Promise<UsuarioCriadoResponse> {
    return this.usuarios.criar(ator, corpo);
  }

  @Patch(":id")
  @RequerPermissao("usuario.gerenciar", "usuario.gerenciar_operadores")
  atualizar(
    @UsuarioAtual() ator: UsuarioAutenticado,
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodPipe(usuarioAtualizarSchema)) corpo: UsuarioAtualizar,
  ): Promise<Usuario> {
    return this.usuarios.atualizar(ator, id, corpo);
  }

  @Post(":id/redefinir-senha")
  @HttpCode(200)
  @RequerPermissao("usuario.gerenciar", "usuario.gerenciar_operadores")
  redefinirSenha(
    @UsuarioAtual() ator: UsuarioAutenticado,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<SenhaTemporariaResponse> {
    return this.usuarios.redefinirSenha(ator, id);
  }
}
