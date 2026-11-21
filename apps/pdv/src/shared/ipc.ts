/** Canais IPC entre o processo principal e o renderer. */
export const IpcChannel = {
  LocalDbStatus: "local-db:status",
} as const;

/** Estado do banco SQLite local do caixa. */
export type LocalDbStatus =
  { status: "operante"; sqliteVersion: string } | { status: "indisponivel" };

/** API exposta ao renderer pelo preload (`window.superPdv`). */
export interface SuperPdvApi {
  localDb: {
    status: () => Promise<LocalDbStatus>;
  };
}
