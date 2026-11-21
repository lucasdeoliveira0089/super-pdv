// Lógica do comando equipe:criar (ponto de entrada em equipe-criar.main.ts).
import { parseArgs } from "node:util";
import type { INestApplicationContext } from "@nestjs/common";
import { membroEquipeCriarSchema } from "@super-pdv/shared";
import { EquipeService } from "../admin/equipe.service";
import { ErroApi } from "../comum/erros";
import type { ResultadoCli } from "./executar";

export async function executarEquipeCriar(
  ctx: INestApplicationContext,
  argv: string[],
): Promise<ResultadoCli> {
  const { values } = parseArgs({
    args: argv,
    options: { nome: { type: "string" }, email: { type: "string" } },
    strict: true,
  });
  const dados = membroEquipeCriarSchema.safeParse(values);
  if (!dados.success) {
    const erros = dados.error.issues.map((i) => `  --${i.path.join(".")}: ${i.message}`).join("\n");
    return {
      codigo: 2,
      saida: `Dados inválidos:\n${erros}\n\nUso: equipe:criar --nome <nome> --email <email>`,
    };
  }
  try {
    const { membro, senhaTemporaria } = await ctx.get(EquipeService).criar(dados.data);
    return {
      codigo: 0,
      saida:
        `Membro da equipe criado: ${membro.nome} <${membro.email}>\n` +
        `Senha temporária (exibida apenas agora): ${senhaTemporaria}\n` +
        `No primeiro acesso ao admin será pedida uma nova senha.`,
    };
  } catch (erro) {
    if (erro instanceof ErroApi) return { codigo: 1, saida: `Erro: ${erro.corpo.message}` };
    throw erro;
  }
}
