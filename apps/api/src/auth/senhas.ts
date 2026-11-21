import { randomInt } from "node:crypto";
import { type Algorithm, hash, verify } from "@node-rs/argon2";

/** Parâmetros argon2id recomendados pela OWASP (m=19 MiB, t=2, p=1). */
const OPCOES = {
  // Algorithm.Argon2id (const enum não pode ser usado com isolatedModules).
  algorithm: 2 as Algorithm,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

export function hashSenha(senha: string): Promise<string> {
  return hash(senha, OPCOES);
}

export async function verificarSenha(hashArmazenado: string, senha: string): Promise<boolean> {
  try {
    return await verify(hashArmazenado, senha);
  } catch {
    return false;
  }
}

// Hash de uma senha aleatória descartada: usado para gastar o mesmo tempo de
// verificação quando o e-mail não existe (não revela quais e-mails existem).
let hashFicticio: Promise<string> | undefined;

/** Verifica contra um hash fictício e devolve sempre `false`. */
export async function verificarSenhaFicticia(senha: string): Promise<false> {
  hashFicticio ??= hashSenha(`ficticia-${randomInt(1e9)}-${Date.now()}`);
  await verificarSenha(await hashFicticio, senha);
  return false;
}

// Sem caracteres ambíguos (0/O, 1/l/I) para facilitar a digitação da senha temporária.
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
export const TAMANHO_SENHA_TEMPORARIA = 16;

/** Gera uma senha temporária aleatória (criptograficamente segura). */
export function gerarSenhaTemporaria(): string {
  let senha = "";
  for (let i = 0; i < TAMANHO_SENHA_TEMPORARIA; i++) senha += ALFABETO[randomInt(ALFABETO.length)];
  return senha;
}
