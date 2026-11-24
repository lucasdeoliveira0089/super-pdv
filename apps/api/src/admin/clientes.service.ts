import { Injectable } from "@nestjs/common";
import { and, asc, eq, exists, ilike, inArray, or, schema } from "@super-pdv/db";
import {
  type Cliente,
  type ClienteAtualizar,
  type ClienteCriar,
  type DonoCriadoResponse,
  type DonoCriar,
  type Empresa,
  type EmpresaAtualizar,
  type EmpresaCriar,
  normalizarCnpj,
} from "@super-pdv/shared";
import { AuthCore } from "../auth/auth-core.service";
import {
  colunasDoEndereco,
  colunasDoResponsavel,
  comoEmpresa,
  comoResponsavel,
} from "../comum/cadastro";
import { gerarSenhaTemporaria, hashSenha } from "../auth/senhas";
import { conflito, naoEncontrado, regraDeNegocio } from "../comum/erros";
import { violouUnicidade } from "../comum/pg";
import { SystemDb, type Transacao } from "../database/system-db";

/** Linha de `empresas` a partir da empresa já validada. */
function colunasDaEmpresa(tenantId: string, { endereco, ...empresa }: EmpresaCriar) {
  return { tenantId, ...empresa, ...colunasDoEndereco(endereco) };
}

/** Traduz violações de unicidade em 409 no campo correspondente. */
function traduzirConflitos(erro: unknown, prefixo = ""): never {
  if (violouUnicidade(erro, "empresas_cnpj_unique")) {
    throw conflito("CNPJ já cadastrado", `${prefixo}cnpj`);
  }
  if (violouUnicidade(erro, "usuarios_email_unique")) {
    throw conflito("E-mail já está em uso", `${prefixo}email`);
  }
  throw erro;
}

/**
 * Clientes e empresas, operados pela equipe Super PDV no admin.
 * Usa o acesso privilegiado: a equipe vê todos os clientes.
 */
@Injectable()
export class ClientesService {
  constructor(
    private readonly system: SystemDb,
    private readonly auth: AuthCore,
  ) {}

  /** Cliente e primeira empresa; nenhum usuário é criado (spec client-provisioning). */
  async criar(dados: ClienteCriar): Promise<Cliente> {
    try {
      const clienteId = await this.system.transacao(async (tx) => {
        // O nome do cliente é o nome fantasia da primeira empresa (spec client-provisioning).
        const [cliente] = await tx
          .insert(schema.clientes)
          .values({
            nome: dados.empresa.nomeFantasia,
            ...colunasDoResponsavel(dados.responsavel),
          })
          .returning();
        await tx.insert(schema.empresas).values(colunasDaEmpresa(cliente!.id, dados.empresa));
        return cliente!.id;
      });
      return await this.obter(clienteId);
    } catch (erro) {
      traduzirConflitos(erro, "empresa.");
    }
  }

  /** Usuário Dono cadastrado no detalhe do cliente, com senha temporária exibida uma vez. */
  async adicionarDono(clienteId: string, dados: DonoCriar): Promise<DonoCriadoResponse> {
    await this.obter(clienteId);
    const senhaTemporaria = gerarSenhaTemporaria();
    const senhaHash = await hashSenha(senhaTemporaria);
    try {
      const [dono] = await this.system.db
        .insert(schema.usuarios)
        .values({
          tenantId: clienteId,
          nome: dados.nome,
          email: dados.email,
          senhaHash,
          senhaTemporaria: true,
          papel: "dono",
        })
        .returning();
      return {
        dono: { id: dono!.id, nome: dono!.nome, email: dono!.email, ativo: dono!.ativo },
        senhaTemporaria,
      };
    } catch (erro) {
      traduzirConflitos(erro);
    }
  }

  async listar(busca?: string): Promise<Cliente[]> {
    const termo = busca?.trim();
    const filtro = termo
      ? or(
          ilike(schema.clientes.nome, `%${escaparLike(termo)}%`),
          exists(
            this.system.db
              .select({ id: schema.empresas.id })
              .from(schema.empresas)
              .where(
                and(
                  eq(schema.empresas.tenantId, schema.clientes.id),
                  ilike(schema.empresas.cnpj, `%${escaparLike(normalizarCnpj(termo))}%`),
                ),
              ),
          ),
        )
      : undefined;
    const clientes = await this.system.db
      .select()
      .from(schema.clientes)
      .where(filtro)
      .orderBy(asc(schema.clientes.nome))
      .limit(200);
    return this.completar(clientes);
  }

  async obter(id: string): Promise<Cliente> {
    const clientes = await this.system.db
      .select()
      .from(schema.clientes)
      .where(eq(schema.clientes.id, id));
    if (clientes.length === 0) throw naoEncontrado("Cliente não encontrado");
    return (await this.completar(clientes))[0]!;
  }

  async atualizar(id: string, dados: ClienteAtualizar): Promise<Cliente> {
    const { responsavel, ...demais } = dados;
    await this.system.transacao(async (tx) => {
      const [cliente] = await tx
        .update(schema.clientes)
        .set({ ...demais, ...(responsavel && colunasDoResponsavel(responsavel)) })
        .where(eq(schema.clientes.id, id))
        .returning();
      if (!cliente) throw naoEncontrado("Cliente não encontrado");
      // Suspensão: encerra as sessões de todos os usuários do cliente.
      if (dados.ativo === false) {
        const usuarios = await tx
          .select({ id: schema.usuarios.id })
          .from(schema.usuarios)
          .where(eq(schema.usuarios.tenantId, id));
        for (const u of usuarios)
          await this.auth.revogarSessoesDoSujeito("cliente", u.id, undefined, tx);
      }
    });
    return this.obter(id);
  }

  async adicionarEmpresa(clienteId: string, dados: EmpresaCriar): Promise<Empresa> {
    await this.obter(clienteId);
    try {
      const [empresa] = await this.system.db
        .insert(schema.empresas)
        .values(colunasDaEmpresa(clienteId, dados))
        .returning();
      return comoEmpresa(empresa!);
    } catch (erro) {
      traduzirConflitos(erro);
    }
  }

  async atualizarEmpresa(id: string, dados: EmpresaAtualizar): Promise<Empresa> {
    const { endereco, ...demais } = dados;
    const [empresa] = await this.system.db
      .update(schema.empresas)
      .set({ ...demais, ...(endereco && colunasDoEndereco(endereco)) })
      .where(eq(schema.empresas.id, id))
      .returning();
    if (!empresa) throw naoEncontrado("Empresa não encontrada");
    return comoEmpresa(empresa);
  }

  /** Suporte: nova senha temporária para um Dono de cliente. */
  async redefinirSenhaDono(usuarioId: string): Promise<{ senhaTemporaria: string }> {
    const senhaTemporaria = gerarSenhaTemporaria();
    await this.system.transacao(async (tx: Transacao) => {
      const [u] = await tx.select().from(schema.usuarios).where(eq(schema.usuarios.id, usuarioId));
      if (!u) throw naoEncontrado("Usuário não encontrado");
      if (u.papel !== "dono") {
        throw regraDeNegocio("Pelo admin, só é possível redefinir a senha de usuários Dono");
      }
      await this.auth.definirSenhaTemporaria("cliente", usuarioId, senhaTemporaria, tx);
    });
    return { senhaTemporaria };
  }

  private async completar(clientes: (typeof schema.clientes.$inferSelect)[]): Promise<Cliente[]> {
    if (clientes.length === 0) return [];
    const ids = clientes.map((c) => c.id);
    const [empresas, donos] = await Promise.all([
      this.system.db
        .select()
        .from(schema.empresas)
        .where(inArray(schema.empresas.tenantId, ids))
        .orderBy(asc(schema.empresas.nomeFantasia)),
      this.system.db
        .select({
          id: schema.usuarios.id,
          tenantId: schema.usuarios.tenantId,
          nome: schema.usuarios.nome,
          email: schema.usuarios.email,
          ativo: schema.usuarios.ativo,
        })
        .from(schema.usuarios)
        .where(and(inArray(schema.usuarios.tenantId, ids), eq(schema.usuarios.papel, "dono")))
        .orderBy(asc(schema.usuarios.nome)),
    ]);
    return clientes.map((c) => ({
      id: c.id,
      nome: c.nome,
      ativo: c.ativo,
      responsavel: comoResponsavel(c),
      empresas: empresas.filter((e) => e.tenantId === c.id).map(comoEmpresa),
      donos: donos
        .filter((d) => d.tenantId === c.id)
        .map(({ id, nome, email, ativo }) => ({ id, nome, email, ativo })),
    }));
  }
}

function escaparLike(texto: string): string {
  return texto.replace(/[\\%_]/g, (c) => `\\${c}`);
}
