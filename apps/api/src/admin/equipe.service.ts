import { Injectable } from "@nestjs/common";
import { and, asc, count, eq, ne, schema } from "@super-pdv/db";
import type {
  MembroEquipe,
  MembroEquipeAtualizar,
  MembroEquipeCriadoResponse,
  MembroEquipeCriar,
} from "@super-pdv/shared";
import { AuthCore } from "../auth/auth-core.service";
import { gerarSenhaTemporaria, hashSenha } from "../auth/senhas";
import { conflito, naoEncontrado, regraDeNegocio } from "../comum/erros";
import { SystemDb, type Transacao } from "../database/system-db";

const comoMembro = (m: typeof schema.equipeMembros.$inferSelect): MembroEquipe => ({
  id: m.id,
  nome: m.nome,
  email: m.email,
  ativo: m.ativo,
  senhaTemporaria: m.senhaTemporaria,
});

/** Gestão dos membros da equipe Super PDV. */
@Injectable()
export class EquipeService {
  constructor(
    private readonly system: SystemDb,
    private readonly auth: AuthCore,
  ) {}

  async listar(): Promise<MembroEquipe[]> {
    const membros = await this.system.db
      .select()
      .from(schema.equipeMembros)
      .orderBy(asc(schema.equipeMembros.nome));
    return membros.map(comoMembro);
  }

  async criar(dados: MembroEquipeCriar): Promise<MembroEquipeCriadoResponse> {
    const senhaTemporaria = gerarSenhaTemporaria();
    const senhaHash = await hashSenha(senhaTemporaria);
    const [membro] = await this.system.db
      .insert(schema.equipeMembros)
      .values({ nome: dados.nome, email: dados.email, senhaHash, senhaTemporaria: true })
      .onConflictDoNothing({ target: schema.equipeMembros.email })
      .returning();
    if (!membro) throw conflito("E-mail já está em uso", "email");
    return { membro: comoMembro(membro), senhaTemporaria };
  }

  async atualizar(
    id: string,
    dados: MembroEquipeAtualizar,
    solicitanteId: string,
  ): Promise<MembroEquipe> {
    return this.system.transacao(async (tx) => {
      const atual = await this.obter(tx, id);
      if (dados.ativo === false && atual.ativo) {
        if (id === solicitanteId) throw regraDeNegocio("Você não pode desativar a si mesmo");
        await this.exigirOutroMembroAtivo(tx, id);
      }
      const [membro] = await tx
        .update(schema.equipeMembros)
        .set(dados)
        .where(eq(schema.equipeMembros.id, id))
        .returning();
      if (dados.ativo === false)
        await this.auth.revogarSessoesDoSujeito("equipe", id, undefined, tx);
      return comoMembro(membro!);
    });
  }

  async redefinirSenha(id: string): Promise<{ senhaTemporaria: string }> {
    const senhaTemporaria = gerarSenhaTemporaria();
    await this.system.transacao(async (tx) => {
      await this.obter(tx, id);
      await this.auth.definirSenhaTemporaria("equipe", id, senhaTemporaria, tx);
    });
    return { senhaTemporaria };
  }

  private async obter(tx: Transacao, id: string) {
    const [m] = await tx
      .select()
      .from(schema.equipeMembros)
      .where(eq(schema.equipeMembros.id, id))
      .for("update");
    if (!m) throw naoEncontrado("Membro da equipe não encontrado");
    return m;
  }

  private async exigirOutroMembroAtivo(tx: Transacao, id: string): Promise<void> {
    const [r] = await tx
      .select({ total: count() })
      .from(schema.equipeMembros)
      .where(and(eq(schema.equipeMembros.ativo, true), ne(schema.equipeMembros.id, id)));
    if (!r || r.total === 0) {
      throw regraDeNegocio("A equipe precisa de ao menos um membro ativo");
    }
  }
}
