import { createHash, randomBytes } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { jwtVerify, SignJWT } from "jose";
import type { Env } from "../config/env";
import { Relogio } from "./relogio";

export type Dominio = "cliente" | "equipe";

/** Duração do token de acesso. */
export const ACESSO_SEGUNDOS = 15 * 60;

export interface ClaimsAcesso {
  /** Domínio de identidade (audiência). */
  aud: Dominio;
  /** Usuário (cliente) ou membro da equipe. */
  sub: string;
  /** Sessão. */
  sid: string;
  /** Cliente (somente domínio `cliente`). */
  tid?: string;
}

/** Gera um token opaco aleatório (256 bits) e o hash que é guardado no banco. */
export function gerarTokenOpaco(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Assina e verifica tokens de acesso (JWT HS256). */
@Injectable()
export class TokensAcesso {
  private readonly segredo: Uint8Array;

  constructor(
    config: ConfigService<Env, true>,
    private readonly relogio: Relogio,
  ) {
    this.segredo = new TextEncoder().encode(config.get("JWT_SECRET", { infer: true }));
  }

  async assinar(claims: ClaimsAcesso): Promise<string> {
    const agora = Math.floor(this.relogio.agora().getTime() / 1000);
    const jwt = new SignJWT({ sid: claims.sid, ...(claims.tid ? { tid: claims.tid } : {}) })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setAudience(claims.aud)
      .setSubject(claims.sub)
      .setIssuer("super-pdv")
      .setIssuedAt(agora)
      .setExpirationTime(agora + ACESSO_SEGUNDOS);
    return jwt.sign(this.segredo);
  }

  /** Verifica assinatura, expiração e audiência. Retorna `null` se inválido. */
  async verificar(token: string, dominio: Dominio): Promise<ClaimsAcesso | null> {
    try {
      const { payload } = await jwtVerify(token, this.segredo, {
        algorithms: ["HS256"],
        audience: dominio,
        issuer: "super-pdv",
        currentDate: this.relogio.agora(),
      });
      if (typeof payload.sub !== "string" || typeof payload.sid !== "string") return null;
      if (dominio === "cliente" && typeof payload.tid !== "string") return null;
      return {
        aud: dominio,
        sub: payload.sub,
        sid: payload.sid,
        ...(typeof payload.tid === "string" ? { tid: payload.tid } : {}),
      };
    } catch {
      return null;
    }
  }
}
