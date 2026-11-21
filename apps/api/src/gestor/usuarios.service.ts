import { Injectable } from "@nestjs/common";
import { and, asc, count, eq, inArray, ne, schema } from "@super-pdv/db";
import {
  type Papel,
  PAPEIS_GLOBAIS,
  papeisAtribuiveis,
  temPermissao,
  type Usuario,
  type UsuarioAtualizar,
  type UsuarioCriadoResponse,
  type UsuarioCriar,
  type UsuarioFiltros,
} from "@super-pdv/shared";
import { AuthCore } from "../auth/auth-core.service";
import { escopoDeEmpresas } from "../auth/permissoes";
import { gerarSenhaTemporaria, hashSenha } from "../auth/senhas";
import { conflito, naoEncontrado, regraDeNegocio, semPermissao } from "../comum/erros";
import { violouUnicidade } from "../comum/pg";
import type { UsuarioAutenticado } from "../contexto/contexto";
import type { Transacao } from "../database/system-db";
import { TenantDb } from "../database/tenant-db";

interface Perfil {
  papel: Papel;
  empresaIds: string[];
}

const ehGlobal = (papel: Papel) => PAPEIS_GLOBAIS.includes(papel);

/**
 * Usuários do cliente, geridos no gestor. Todo acesso passa pelo `TenantDb`
 * (RLS): o cliente vem da sessão, nunca da requisição.
 */
@Injectable()
export class UsuariosService {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly auth: AuthCore,
  ) {}

  // ----------------------------------------------------------------- leitura

  async listar(ator: UsuarioAutenticado, filtros: UsuarioFiltros): Promise<Usuario[]> {
    const todos = await this.tenantDb.transacao((tx) => this.carregar(tx));
    return todos.filter(
      (u) =>
        this.visivel(ator, u) &&
        (filtros.papel === undefined || u.papel === filtros.papel) &&
        (filtros.ativo === undefined || u.ativo === filtros.ativo) &&
        (filtros.empresaId === undefined ||
          ehGlobal(u.papel) ||
          u.empresaIds.includes(filtros.empresaId)),
    );
  }

  async obter(ator: UsuarioAutenticado, id: string): Promise<Usuario> {
    const [u] = await this.tenantDb.transacao((tx) => this.carregar(tx, id));
    if (!u || !this.visivel(ator, u)) throw naoEncontrado("Usuário não encontrado");
    return u;
  }

  /** Dono/Administrador veem todos; Gerente vê os globais e quem atua nas suas empresas. */
  private visivel(ator: UsuarioAutenticado, u: Usuario): boolean {
    const escopo = escopoDeEmpresas(ator);
    return escopo === "todas" || ehGlobal(u.papel) || u.empresaIds.some((e) => escopo.includes(e));
  }

  private async carregar(tx: Transacao, id?: string): Promise<Usuario[]> {
    const usuarios = await tx
      .select()
      .from(schema.usuarios)
      .where(id ? eq(schema.usuarios.id, id) : undefined)
      .orderBy(asc(schema.usuarios.nome));
    if (usuarios.length === 0) return [];
    const vinculos = await tx
      .select()
      .from(schema.usuarioEmpresas)
      .where(
        inArray(
          schema.usuarioEmpresas.usuarioId,
          usuarios.map((u) => u.id),
        ),
      );
    return usuarios.map((u) => ({
      id: u.id,
      nome: u.nome,
      email: u.email,
      papel: u.papel,
      ativo: u.ativo,
      senhaTemporaria: u.senhaTemporaria,
      empresaIds: vinculos
        .filter((v) => v.usuarioId === u.id)
        .map((v) => v.empresaId)
        .sort(),
    }));
  }

  // ----------------------------------------------------------------- escrita

  async criar(ator: UsuarioAutenticado, dados: UsuarioCriar): Promise<UsuarioCriadoResponse> {
    const destino: Perfil = {
      papel: dados.papel,
      empresaIds: ehGlobal(dados.papel) ? [] : [...new Set(dados.empresaIds)],
    };
    this.exigirPodeGerenciar(ator, null, destino);

    const senhaTemporaria = gerarSenhaTemporaria();
    const senhaHash = await hashSenha(senhaTemporaria);
    try {
      const id = await this.tenantDb.transacao(async (tx) => {
        await this.exigirEmpresasValidas(tx, destino.empresaIds);
        const [u] = await tx
          .insert(schema.usuarios)
          .values({
            tenantId: this.tenantDb.tenantId,
            nome: dados.nome,
            email: dados.email,
            senhaHash,
            senhaTemporaria: true,
            papel: dados.papel,
          })
          .returning({ id: schema.usuarios.id });
        await this.gravarVinculos(tx, u!.id, destino.empresaIds);
        return u!.id;
      });
      return { usuario: await this.obter(ator, id), senhaTemporaria };
    } catch (erro) {
      if (violouUnicidade(erro, "usuarios_email_unique"))
        throw conflito("E-mail já está em uso", "email");
      throw erro;
    }
  }

  async atualizar(ator: UsuarioAutenticado, id: string, dados: UsuarioAtualizar): Promise<Usuario> {
    const desativou = await this.tenantDb.transacao(async (tx) => {
      const [alvo] = await this.carregar(tx, id);
      if (!alvo || !this.visivel(ator, alvo)) throw naoEncontrado("Usuário não encontrado");

      const papel = dados.papel ?? alvo.papel;
      const destino: Perfil = {
        papel,
        empresaIds: ehGlobal(papel) ? [] : [...new Set(dados.empresaIds ?? alvo.empresaIds)],
      };
      if (!ehGlobal(papel) && destino.empresaIds.length === 0) {
        throw regraDeNegocio("Selecione ao menos uma empresa", "empresaIds");
      }
      if (dados.ativo === false && id === ator.id) {
        throw regraDeNegocio("Você não pode desativar a si mesmo");
      }
      this.exigirPodeGerenciar(ator, alvo, destino);
      if (alvo.papel === "dono" && alvo.ativo && (papel !== "dono" || dados.ativo === false)) {
        await this.exigirOutroDonoAtivo(tx, id);
      }
      if (dados.empresaIds !== undefined || dados.papel !== undefined) {
        await this.exigirEmpresasValidas(
          tx,
          destino.empresaIds.filter((e) => !alvo.empresaIds.includes(e)),
        );
      }

      const { empresaIds: _ignorado, ...campos } = dados;
      if (Object.keys(campos).length > 0) {
        await tx.update(schema.usuarios).set(campos).where(eq(schema.usuarios.id, id));
      }
      if (destino.empresaIds.join() !== alvo.empresaIds.join()) {
        await tx.delete(schema.usuarioEmpresas).where(eq(schema.usuarioEmpresas.usuarioId, id));
        await this.gravarVinculos(tx, id, destino.empresaIds);
      }
      return dados.ativo === false && alvo.ativo;
    });
    // Desativação encerra as sessões (inclusive no PDV).
    if (desativou) await this.auth.revogarSessoesDoSujeito("cliente", id);
    return this.obter(ator, id);
  }

  async redefinirSenha(ator: UsuarioAutenticado, id: string): Promise<{ senhaTemporaria: string }> {
    if (id === ator.id)
      throw regraDeNegocio("Para trocar a sua própria senha, use a troca de senha");
    const alvo = await this.obter(ator, id);
    this.exigirPodeGerenciar(ator, alvo, alvo);
    return { senhaTemporaria: await this.auth.redefinirSenhaTemporaria("cliente", id) };
  }

  // ------------------------------------------------------------------ regras

  /**
   * Regras de quem pode gerenciar quem (spec access-control):
   * - Dono: todos; Administrador: todos exceto Donos;
   * - Gerente: apenas Operadores de caixa das suas empresas;
   * - Operador de caixa: ninguém.
   */
  private exigirPodeGerenciar(
    ator: UsuarioAutenticado,
    alvo: Perfil | null,
    destino: Perfil,
  ): void {
    const total = temPermissao(ator.papel, "usuario.gerenciar");
    const soOperadores = !total && temPermissao(ator.papel, "usuario.gerenciar_operadores");
    if (!total && !soOperadores) throw semPermissao();

    if (alvo?.papel === "dono" && ator.papel !== "dono") {
      throw semPermissao("Somente um Dono pode alterar outro Dono");
    }
    if (!papeisAtribuiveis(ator.papel).includes(destino.papel)) {
      throw semPermissao("Você não pode atribuir este papel");
    }
    if (soOperadores) {
      const escopo = escopoDeEmpresas(ator);
      const noEscopo = (ids: string[]) =>
        escopo === "todas" || ids.every((e) => escopo.includes(e));
      if (alvo && (alvo.papel !== "operador" || !noEscopo(alvo.empresaIds))) {
        throw semPermissao("Você só pode gerenciar Operadores de caixa das suas empresas");
      }
      if (!noEscopo(destino.empresaIds)) {
        throw semPermissao("Você só pode atribuir as suas empresas");
      }
    }
  }

  private async exigirEmpresasValidas(tx: Transacao, empresaIds: string[]): Promise<void> {
    if (empresaIds.length === 0) return;
    const encontradas = await tx
      .select({ id: schema.empresas.id })
      .from(schema.empresas)
      .where(and(inArray(schema.empresas.id, empresaIds), eq(schema.empresas.ativa, true)));
    if (encontradas.length !== empresaIds.length) {
      throw regraDeNegocio("Empresa inválida ou inativa", "empresaIds");
    }
  }

  private async exigirOutroDonoAtivo(tx: Transacao, id: string): Promise<void> {
    const [r] = await tx
      .select({ total: count() })
      .from(schema.usuarios)
      .where(
        and(
          eq(schema.usuarios.papel, "dono"),
          eq(schema.usuarios.ativo, true),
          ne(schema.usuarios.id, id),
        ),
      );
    if (!r || r.total === 0) throw regraDeNegocio("O cliente precisa de ao menos um Dono ativo");
  }

  private async gravarVinculos(
    tx: Transacao,
    usuarioId: string,
    empresaIds: string[],
  ): Promise<void> {
    if (empresaIds.length === 0) return;
    await tx
      .insert(schema.usuarioEmpresas)
      .values(
        empresaIds.map((empresaId) => ({ tenantId: this.tenantDb.tenantId, usuarioId, empresaId })),
      );
  }
}
