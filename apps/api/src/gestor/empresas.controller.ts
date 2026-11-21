import { Controller, Get, Param, ParseUUIDPipe, Patch, Post } from "@nestjs/common";
import { and, asc, eq, inArray, schema } from "@super-pdv/db";
import type { Empresa } from "@super-pdv/shared";
import { UsuarioAtual } from "../auth/decoradores";
import { escopoDeEmpresas, RequerPermissao } from "../auth/permissoes";
import { naoEncontrado, semPermissao } from "../comum/erros";
import type { UsuarioAutenticado } from "../contexto/contexto";
import { TenantDb } from "../database/tenant-db";

const comoEmpresa = (e: typeof schema.empresas.$inferSelect): Empresa => ({
  id: e.id,
  clienteId: e.tenantId,
  cnpj: e.cnpj,
  razaoSocial: e.razaoSocial,
  nomeFantasia: e.nomeFantasia,
  ativa: e.ativa,
});

const SO_EQUIPE = "Empresas são cadastradas e alteradas pela equipe Super PDV";

/** Empresas do cliente no gestor: somente leitura, no escopo do usuário. */
@Controller("empresas")
@RequerPermissao("empresa.ler")
export class EmpresasController {
  constructor(private readonly tenantDb: TenantDb) {}

  @Get()
  async listar(@UsuarioAtual() usuario: UsuarioAutenticado): Promise<Empresa[]> {
    const escopo = escopoDeEmpresas(usuario);
    if (escopo !== "todas" && escopo.length === 0) return [];
    const empresas = await this.tenantDb.transacao((tx) =>
      tx
        .select()
        .from(schema.empresas)
        .where(escopo === "todas" ? undefined : inArray(schema.empresas.id, escopo))
        .orderBy(asc(schema.empresas.nomeFantasia)),
    );
    return empresas.map(comoEmpresa);
  }

  @Get(":id")
  async obter(
    @Param("id", ParseUUIDPipe) id: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ): Promise<Empresa> {
    const escopo = escopoDeEmpresas(usuario);
    if (escopo !== "todas" && !escopo.includes(id)) throw naoEncontrado("Empresa não encontrada");
    const [empresa] = await this.tenantDb.transacao((tx) =>
      tx
        .select()
        .from(schema.empresas)
        .where(and(eq(schema.empresas.id, id))),
    );
    if (!empresa) throw naoEncontrado("Empresa não encontrada");
    return comoEmpresa(empresa);
  }

  // Usuários dos clientes não criam nem alteram empresas (spec organization-structure).
  @Post()
  criar(): never {
    throw semPermissao(SO_EQUIPE);
  }

  @Patch(":id")
  alterar(): never {
    throw semPermissao(SO_EQUIPE);
  }
}
