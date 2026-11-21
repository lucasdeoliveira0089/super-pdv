import type { INestApplication, Type } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { schema } from "@super-pdv/db";
import { iniciarPostgresDeTeste, type PostgresDeTeste } from "@super-pdv/db/testing";
import type { Papel, TokensResponse } from "@super-pdv/shared";
import request from "supertest";
import { configurarApp } from "../src/app.setup";
import { Relogio, RelogioControlado } from "../src/auth/relogio";
import { hashSenha } from "../src/auth/senhas";
import { SystemDb, SystemDbModule } from "../src/database/system-db";
import { Mailer, MailerEmMemoria } from "../src/email/mailer";
import { aplicarAmbienteDeTeste } from "./ambiente";

export const SENHA_PADRAO = "Senha#Forte2026";

let sequencia = 0;
const proximo = () => ++sequencia;

/** Gera um CNPJ numérico válido e único a partir de um número. */
export function gerarCnpj(n = proximo()): string {
  const base = String(10_000_000 + n).padStart(8, "0") + "0001";
  const dv = (b: string, pesos: number[]) => {
    const r = [...b].reduce((s, c, i) => s + Number(c) * pesos[i]!, 0) % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const d1 = dv(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = dv(base + d1, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return `${base}${d1}${d2}`;
}

export interface AppDeTeste {
  app: INestApplication;
  http: () => ReturnType<typeof request>;
  relogio: RelogioControlado;
  mailer: MailerEmMemoria;
  system: SystemDb;
  pg: PostgresDeTeste;
  fechar: () => Promise<void>;
  // fábrica de dados (caminho privilegiado)
  criarCliente: (dados?: { nome?: string; ativo?: boolean }) => Promise<string>;
  criarEmpresa: (
    tenantId: string,
    dados?: { nomeFantasia?: string; ativa?: boolean; cnpj?: string },
  ) => Promise<string>;
  criarUsuario: (
    tenantId: string,
    dados: {
      papel: Papel;
      nome?: string;
      email?: string;
      senha?: string;
      senhaTemporaria?: boolean;
      ativo?: boolean;
      empresaIds?: string[];
    },
  ) => Promise<{ id: string; email: string; senha: string }>;
  criarMembro: (dados?: {
    nome?: string;
    email?: string;
    senha?: string;
    senhaTemporaria?: boolean;
    ativo?: boolean;
  }) => Promise<{ id: string; email: string; senha: string }>;
  /** Faz login e devolve os tokens (falha o teste se não for 200). */
  entrar: (
    email: string,
    senha?: string,
    dominio?: "cliente" | "equipe",
  ) => Promise<TokensResponse>;
}

export async function criarAppDeTeste(
  opcoes: { controllers?: Type[]; env?: Record<string, string> } = {},
): Promise<AppDeTeste> {
  const pg = await iniciarPostgresDeTeste();
  aplicarAmbienteDeTeste(pg.url);
  Object.assign(process.env, opcoes.env ?? {});

  const relogio = new RelogioControlado();
  const mailer = new MailerEmMemoria();
  const { AppModule } = await import("../src/app.module.js");
  const ref = await Test.createTestingModule({
    imports: [AppModule, SystemDbModule],
    controllers: opcoes.controllers ?? [],
  })
    .overrideProvider(Relogio)
    .useValue(relogio)
    .overrideProvider(Mailer)
    .useValue(mailer)
    .compile();
  const app = configurarApp(ref.createNestApplication({ logger: false }));
  await app.init();
  const system = ref.get(SystemDb);
  const http = () => request(app.getHttpServer());

  return {
    app,
    http,
    relogio,
    mailer,
    system,
    pg,
    fechar: async () => {
      await app.close();
      await pg.parar();
    },
    criarCliente: async ({ nome, ativo = true } = {}) => {
      const [c] = await system.db
        .insert(schema.clientes)
        .values({ nome: nome ?? `Cliente ${proximo()}`, ativo })
        .returning();
      return c!.id;
    },
    criarEmpresa: async (tenantId, { nomeFantasia, ativa = true, cnpj } = {}) => {
      const n = proximo();
      const [e] = await system.db
        .insert(schema.empresas)
        .values({
          tenantId,
          cnpj: cnpj ?? gerarCnpj(n),
          razaoSocial: `Razão ${n}`,
          nomeFantasia: nomeFantasia ?? `Empresa ${n}`,
          ativa,
        })
        .returning();
      return e!.id;
    },
    criarUsuario: async (tenantId, d) => {
      const n = proximo();
      const email = d.email ?? `usuario${n}@teste.com.br`;
      const senha = d.senha ?? SENHA_PADRAO;
      const [u] = await system.db
        .insert(schema.usuarios)
        .values({
          tenantId,
          nome: d.nome ?? `Usuário ${n}`,
          email,
          senhaHash: await hashSenha(senha),
          senhaTemporaria: d.senhaTemporaria ?? false,
          papel: d.papel,
          ativo: d.ativo ?? true,
        })
        .returning();
      for (const empresaId of d.empresaIds ?? []) {
        await system.db
          .insert(schema.usuarioEmpresas)
          .values({ tenantId, usuarioId: u!.id, empresaId });
      }
      return { id: u!.id, email, senha };
    },
    criarMembro: async (d = {}) => {
      const n = proximo();
      const email = d.email ?? `equipe${n}@superpdv.com.br`;
      const senha = d.senha ?? SENHA_PADRAO;
      const [m] = await system.db
        .insert(schema.equipeMembros)
        .values({
          nome: d.nome ?? `Membro ${n}`,
          email,
          senhaHash: await hashSenha(senha),
          senhaTemporaria: d.senhaTemporaria ?? false,
          ativo: d.ativo ?? true,
        })
        .returning();
      return { id: m!.id, email, senha };
    },
    entrar: async (email, senha = SENHA_PADRAO, dominio = "cliente") => {
      const rota = dominio === "equipe" ? "/v1/admin/auth/login" : "/v1/auth/login";
      const res = await http().post(rota).send({ email, senha });
      if (res.status !== 200) {
        throw new Error(`login falhou (${res.status}): ${JSON.stringify(res.body)}`);
      }
      return res.body as TokensResponse;
    },
  };
}

export const bearer = (t: { accessToken: string }) => ({
  Authorization: `Bearer ${t.accessToken}`,
});
