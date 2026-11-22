import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { z } from "zod";

// Sessão do PDV guardada entre reinícios (D1): apenas o token de renovação e a
// empresa escolhida, cifrados com a criptografia do sistema operacional
// (`safeStorage`: DPAPI no Windows). O token de acesso nunca vai para o disco.

export const SESSION_FILENAME = "session.bin";

/** Subconjunto do `safeStorage` do Electron usado aqui (injetável nos testes). */
export interface Cifrador {
  isEncryptionAvailable(): boolean;
  encryptString(texto: string): Buffer;
  decryptString(dados: Buffer): string;
}

const sessaoSalvaSchema = z.object({
  refreshToken: z.string().min(1),
  empresaId: z.uuid().nullable(),
});
export type SessaoSalva = z.infer<typeof sessaoSalvaSchema>;

export class SessionStore {
  readonly path: string;
  /** Usada quando a criptografia não está disponível: vale só com o app aberto. */
  private emMemoria: SessaoSalva | null = null;

  constructor(
    userDataDir: string,
    private readonly cifrador: Cifrador,
  ) {
    this.path = join(userDataDir, SESSION_FILENAME);
  }

  /** Indica se a sessão sobrevive a um reinício (há criptografia disponível). */
  get persistente(): boolean {
    return this.cifrador.isEncryptionAvailable();
  }

  carregar(): SessaoSalva | null {
    if (!this.persistente) return this.emMemoria;
    let dados: Buffer;
    try {
      dados = readFileSync(this.path);
    } catch {
      return null; // sem sessão salva
    }
    try {
      return sessaoSalvaSchema.parse(JSON.parse(this.cifrador.decryptString(dados)));
    } catch {
      // Arquivo corrompido ou cifrado por outro usuário do Windows: descarta.
      this.apagar();
      return null;
    }
  }

  salvar(sessao: SessaoSalva): void {
    const valida = sessaoSalvaSchema.parse(sessao);
    if (!this.persistente) {
      // Nunca grava o token em texto puro.
      this.emMemoria = valida;
      return;
    }
    mkdirSync(dirname(this.path), { recursive: true });
    writeFileSync(this.path, this.cifrador.encryptString(JSON.stringify(valida)), { mode: 0o600 });
  }

  apagar(): void {
    this.emMemoria = null;
    rmSync(this.path, { force: true });
  }
}
