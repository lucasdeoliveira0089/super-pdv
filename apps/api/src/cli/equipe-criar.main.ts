// Cria um membro da equipe Super PDV (ex.: o primeiro, para entrar no admin).
//
//   pnpm --filter @super-pdv/api equipe:criar -- --nome "Fulana" --email fulana@superpdv.com.br
import { executarEquipeCriar } from "./equipe-criar";
import { rodarComando } from "./executar";

rodarComando(executarEquipeCriar);
