/// <reference types="vite/client" />

import type { SuperPdvApi } from "../../shared/ipc";

declare global {
  interface Window {
    superPdv: SuperPdvApi;
  }
}
