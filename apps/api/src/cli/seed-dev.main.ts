// Cria dados de demonstração no banco local (recusa NODE_ENV=production).
//
//   pnpm db:seed   (na raiz)
import { rodarComando } from "./executar";
import { executarSeedDev } from "./seed-dev";

rodarComando((ctx) => executarSeedDev(ctx));
