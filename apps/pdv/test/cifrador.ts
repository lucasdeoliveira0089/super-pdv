import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import type { Cifrador } from "../src/main/session-store";

/**
 * Substituto do `safeStorage` nos testes unitários: ele só existe com o app
 * Electron iniciado (o E2E cobre a reabertura com a criptografia do Windows).
 * AES-256-GCM com uma chave por instância, como uma chave por usuário do sistema.
 */
export function cifradorDeTeste(disponivel = true): Cifrador {
  const chave = randomBytes(32);
  return {
    isEncryptionAvailable: () => disponivel,
    encryptString(texto) {
      const iv = randomBytes(12);
      const c = createCipheriv("aes-256-gcm", chave, iv);
      const dados = Buffer.concat([c.update(texto, "utf8"), c.final()]);
      return Buffer.concat([iv, c.getAuthTag(), dados]);
    },
    decryptString(buf) {
      const d = createDecipheriv("aes-256-gcm", chave, buf.subarray(0, 12));
      d.setAuthTag(buf.subarray(12, 28));
      return Buffer.concat([d.update(buf.subarray(28)), d.final()]).toString("utf8");
    },
  };
}
