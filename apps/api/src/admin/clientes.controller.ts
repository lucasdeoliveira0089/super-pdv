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
  type Cliente,
  clienteAtualizarSchema,
  type ClienteAtualizar,
  clienteCriarSchema,
  type ClienteCriar,
  clienteFiltrosSchema,
  type ClienteFiltros,
  type Empresa,
  empresaAtualizarSchema,
  type EmpresaAtualizar,
  empresaCriarSchema,
  type EmpresaCriar,
  type DonoCriadoResponse,
  donoCriarSchema,
  type DonoCriar,
  type SenhaTemporariaResponse,
} from "@super-pdv/shared";
import { DominioEquipe } from "../auth/decoradores";
import { ZodPipe } from "../comum/zod.pipe";
import { ClientesService } from "./clientes.service";

@Controller("admin/clientes")
@DominioEquipe()
export class ClientesAdminController {
  constructor(private readonly clientes: ClientesService) {}

  @Get()
  listar(@Query(new ZodPipe(clienteFiltrosSchema)) filtros: ClienteFiltros): Promise<Cliente[]> {
    return this.clientes.listar(filtros.busca);
  }

  @Post()
  criar(@Body(new ZodPipe(clienteCriarSchema)) corpo: ClienteCriar): Promise<Cliente> {
    return this.clientes.criar(corpo);
  }

  @Post(":id/donos")
  adicionarDono(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodPipe(donoCriarSchema)) corpo: DonoCriar,
  ): Promise<DonoCriadoResponse> {
    return this.clientes.adicionarDono(id, corpo);
  }

  @Get(":id")
  obter(@Param("id", ParseUUIDPipe) id: string): Promise<Cliente> {
    return this.clientes.obter(id);
  }

  @Patch(":id")
  atualizar(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodPipe(clienteAtualizarSchema)) corpo: ClienteAtualizar,
  ): Promise<Cliente> {
    return this.clientes.atualizar(id, corpo);
  }

  @Post(":id/empresas")
  adicionarEmpresa(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodPipe(empresaCriarSchema)) corpo: EmpresaCriar,
  ): Promise<Empresa> {
    return this.clientes.adicionarEmpresa(id, corpo);
  }
}

@Controller("admin/empresas")
@DominioEquipe()
export class EmpresasAdminController {
  constructor(private readonly clientes: ClientesService) {}

  @Patch(":id")
  atualizar(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodPipe(empresaAtualizarSchema)) corpo: EmpresaAtualizar,
  ): Promise<Empresa> {
    return this.clientes.atualizarEmpresa(id, corpo);
  }
}

@Controller("admin/usuarios")
@DominioEquipe()
export class UsuariosAdminController {
  constructor(private readonly clientes: ClientesService) {}

  @Post(":id/redefinir-senha")
  @HttpCode(200)
  redefinirSenha(@Param("id", ParseUUIDPipe) id: string): Promise<SenhaTemporariaResponse> {
    return this.clientes.redefinirSenhaDono(id);
  }
}
