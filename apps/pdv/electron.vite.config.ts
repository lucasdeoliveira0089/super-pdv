import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "electron-vite";

// Somente `dependencies` do package.json ficam externas ao bundle do main (o módulo
// nativo better-sqlite3). Todo o resto, inclusive pacotes do workspace, é empacotado.
export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    plugins: [react(), tailwindcss()],
  },
});
