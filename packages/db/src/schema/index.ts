// Schema do PostgreSQL da nuvem.
//
// Tabelas com `tenant_id` pertencem a um cliente e têm Row Level Security: a
// aplicação só as acessa no papel `superpdv_app` com `app.tenant_id` definido
// (políticas criadas na migration SQL `0002_rls`). As demais tabelas são
// acessadas apenas pelo caminho privilegiado (autenticação, admin e CLI).

import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const papelEnum = pgEnum("papel", ["dono", "administrador", "gerente", "operador"]);
export const dominioAuthEnum = pgEnum("dominio_auth", ["cliente", "equipe"]);

const id = () =>
  uuid()
    .primaryKey()
    .default(sql`uuidv7()`);
const quando = () => timestamp({ withTimezone: true, mode: "date" });
const timestamps = {
  createdAt: quando().notNull().defaultNow(),
  updatedAt: quando()
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/** Cliente (tenant): quem contrata o Super PDV e usa o gestor. */
export const clientes = pgTable("clientes", {
  id: id(),
  nome: text().notNull(),
  ativo: boolean().notNull().default(true),
  ...timestamps,
});

/** Empresa (CNPJ). Cada estabelecimento tem o seu CNPJ. */
export const empresas = pgTable(
  "empresas",
  {
    id: id(),
    tenantId: uuid()
      .notNull()
      .references(() => clientes.id),
    cnpj: text().notNull().unique(),
    razaoSocial: text().notNull(),
    nomeFantasia: text().notNull(),
    ativa: boolean().notNull().default(true),
    ...timestamps,
  },
  (t) => [
    unique("empresas_tenant_id_id_key").on(t.tenantId, t.id),
    index("empresas_tenant_id_idx").on(t.tenantId),
    check("empresas_cnpj_formato", sql`${t.cnpj} ~ '^[0-9A-Z]{12}[0-9]{2}$'`),
  ],
).enableRLS();

/** Usuário de um cliente (Dono, Administrador, Gerente, Operador de caixa). */
export const usuarios = pgTable(
  "usuarios",
  {
    id: id(),
    tenantId: uuid()
      .notNull()
      .references(() => clientes.id),
    nome: text().notNull(),
    email: text().notNull().unique(),
    senhaHash: text().notNull(),
    senhaTemporaria: boolean().notNull().default(true),
    papel: papelEnum().notNull(),
    ativo: boolean().notNull().default(true),
    ...timestamps,
  },
  (t) => [
    unique("usuarios_tenant_id_id_key").on(t.tenantId, t.id),
    index("usuarios_tenant_id_idx").on(t.tenantId),
    check("usuarios_email_minusculo", sql`${t.email} = lower(${t.email})`),
  ],
).enableRLS();

/** Empresas em que um Gerente ou Operador de caixa atua. */
export const usuarioEmpresas = pgTable(
  "usuario_empresas",
  {
    tenantId: uuid().notNull(),
    usuarioId: uuid().notNull(),
    empresaId: uuid().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.usuarioId, t.empresaId] }),
    // FKs compostas com tenant_id: o banco impede vínculos entre clientes diferentes.
    foreignKey({
      name: "usuario_empresas_usuario_fk",
      columns: [t.tenantId, t.usuarioId],
      foreignColumns: [usuarios.tenantId, usuarios.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "usuario_empresas_empresa_fk",
      columns: [t.tenantId, t.empresaId],
      foreignColumns: [empresas.tenantId, empresas.id],
    }),
    index("usuario_empresas_empresa_idx").on(t.empresaId),
  ],
).enableRLS();

/** Membro da equipe Super PDV (usa o admin). */
export const equipeMembros = pgTable(
  "equipe_membros",
  {
    id: id(),
    nome: text().notNull(),
    email: text().notNull().unique(),
    senhaHash: text().notNull(),
    senhaTemporaria: boolean().notNull().default(true),
    ativo: boolean().notNull().default(true),
    ...timestamps,
  },
  (t) => [check("equipe_membros_email_minusculo", sql`${t.email} = lower(${t.email})`)],
);

const sujeitoUnico = (nome: string) =>
  check(
    nome,
    sql`(dominio = 'cliente' AND usuario_id IS NOT NULL AND membro_id IS NULL)
     OR (dominio = 'equipe' AND membro_id IS NOT NULL AND usuario_id IS NULL)`,
  );

/** Sessão de login (equipe ou usuário de cliente). */
export const sessoes = pgTable(
  "sessoes",
  {
    id: id(),
    dominio: dominioAuthEnum().notNull(),
    usuarioId: uuid().references(() => usuarios.id, { onDelete: "cascade" }),
    membroId: uuid().references(() => equipeMembros.id, { onDelete: "cascade" }),
    expiraEm: quando().notNull(),
    revogadaEm: quando(),
    userAgent: text(),
    createdAt: quando().notNull().defaultNow(),
  },
  (t) => [
    sujeitoUnico("sessoes_sujeito_unico"),
    index("sessoes_usuario_idx").on(t.usuarioId),
    index("sessoes_membro_idx").on(t.membroId),
  ],
);

/** Tokens de renovação (rotativos) de uma sessão; só o hash é guardado. */
export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: id(),
    sessaoId: uuid()
      .notNull()
      .references(() => sessoes.id, { onDelete: "cascade" }),
    tokenHash: text().notNull().unique(),
    usadoEm: quando(),
    createdAt: quando().notNull().defaultNow(),
  },
  (t) => [index("refresh_tokens_sessao_idx").on(t.sessaoId)],
);

/** Links de recuperação de senha (uso único); só o hash é guardado. */
export const passwordResets = pgTable(
  "password_resets",
  {
    id: id(),
    dominio: dominioAuthEnum().notNull(),
    usuarioId: uuid().references(() => usuarios.id, { onDelete: "cascade" }),
    membroId: uuid().references(() => equipeMembros.id, { onDelete: "cascade" }),
    tokenHash: text().notNull().unique(),
    expiraEm: quando().notNull(),
    usadoEm: quando(),
    createdAt: quando().notNull().defaultNow(),
  },
  () => [sujeitoUnico("password_resets_sujeito_unico")],
);

/** Tentativas de login falhas por e-mail, para bloqueio temporário. */
export const loginThrottle = pgTable(
  "login_throttle",
  {
    dominio: dominioAuthEnum().notNull(),
    email: text().notNull(),
    falhas: integer().notNull().default(0),
    janelaInicio: quando().notNull().defaultNow(),
    bloqueadoAte: quando(),
  },
  (t) => [primaryKey({ columns: [t.dominio, t.email] })],
);
