// Lógica do comando seed:dev (ponto de entrada em seed-dev.main.ts).
import type { INestApplicationContext } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { eq, schema } from "@super-pdv/db";
import type { Papel } from "@super-pdv/shared";
import { hashSenha } from "../auth/senhas";
import type { Env } from "../config/env";
import { SystemDb } from "../database/system-db";
import type { ResultadoCli } from "./executar";

/** Credenciais de DEMONSTRAÇÃO (apenas desenvolvimento). Documentadas no README. */
export const SEED = {
  equipe: { nome: "Equipe Demonstração", email: "equipe@superpdv.local", senha: "Equipe#Demo2026" },
  cliente: "Demonstração",
  empresas: [
    {
      cnpj: "11222333000181",
      razaoSocial: "Mercado Demo Centro Ltda",
      nomeFantasia: "Mercado Demo Centro",
    },
    {
      cnpj: "12ABC34501DE35",
      razaoSocial: "Mercado Demo Norte Ltda",
      nomeFantasia: "Mercado Demo Norte",
    },
  ],
  senhaUsuarios: "Demo#Senha2026",
  usuarios: [
    { nome: "Dono Demonstração", email: "dono@demo.local", papel: "dono", empresas: [] },
    {
      nome: "Administrador Demonstração",
      email: "admin@demo.local",
      papel: "administrador",
      empresas: [],
    },
    { nome: "Gerente Centro", email: "gerente@demo.local", papel: "gerente", empresas: [0] },
    { nome: "Operador Centro", email: "operador@demo.local", papel: "operador", empresas: [0] },
  ] satisfies { nome: string; email: string; papel: Papel; empresas: number[] }[],
} as const;

export async function executarSeedDev(ctx: INestApplicationContext): Promise<ResultadoCli> {
  if (ctx.get(ConfigService<Env, true>).get("NODE_ENV", { infer: true }) === "production") {
    return { codigo: 1, saida: "Erro: seed:dev não pode ser executado com NODE_ENV=production" };
  }
  const system = ctx.get(SystemDb);

  const [existente] = await system.db
    .select({ id: schema.equipeMembros.id })
    .from(schema.equipeMembros)
    .where(eq(schema.equipeMembros.email, SEED.equipe.email));
  if (existente) {
    return { codigo: 0, saida: "Dados de demonstração já existem; nada foi alterado." };
  }

  const [hashEquipe, hashUsuarios] = await Promise.all([
    hashSenha(SEED.equipe.senha),
    hashSenha(SEED.senhaUsuarios),
  ]);

  await system.transacao(async (tx) => {
    await tx.insert(schema.equipeMembros).values({
      nome: SEED.equipe.nome,
      email: SEED.equipe.email,
      senhaHash: hashEquipe,
      senhaTemporaria: false,
    });
    const [cliente] = await tx.insert(schema.clientes).values({ nome: SEED.cliente }).returning();
    const empresas = await tx
      .insert(schema.empresas)
      .values(SEED.empresas.map((e) => ({ ...e, tenantId: cliente!.id })))
      .returning();
    for (const u of SEED.usuarios) {
      const [usuario] = await tx
        .insert(schema.usuarios)
        .values({
          tenantId: cliente!.id,
          nome: u.nome,
          email: u.email,
          senhaHash: hashUsuarios,
          senhaTemporaria: false,
          papel: u.papel,
        })
        .returning();
      for (const i of u.empresas) {
        await tx
          .insert(schema.usuarioEmpresas)
          .values({ tenantId: cliente!.id, usuarioId: usuario!.id, empresaId: empresas[i]!.id });
      }
    }
  });

  const linhas = [
    "Dados de demonstração criados (somente desenvolvimento):",
    `  Admin  (http://localhost:3001): ${SEED.equipe.email} / ${SEED.equipe.senha}`,
    `  Gestor (http://localhost:3000), senha ${SEED.senhaUsuarios}:`,
    ...SEED.usuarios.map((u) => `    ${u.papel.padEnd(13)} ${u.email}`),
  ];
  return { codigo: 0, saida: linhas.join("\n") };
}
