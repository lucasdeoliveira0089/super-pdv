/// <reference types="electron-vite/node" />

// Variáveis do processo principal gravadas no build pelo electron-vite (D5).
interface ImportMetaEnv {
  readonly MAIN_VITE_API_URL?: string;
  readonly MAIN_VITE_GESTOR_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
