import { Module } from "@nestjs/common";
import { ModulesContainer } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";
import { violacoesDeAcessoAoBanco } from "../src/database/fronteiras";
import { SystemDbModule } from "../src/database/system-db";
import { aplicarAmbienteDeTeste } from "./ambiente";

// O pool do pg só conecta na primeira consulta: compilar o grafo não exige banco.
beforeAll(() => aplicarAmbienteDeTeste("postgres://x:y@localhost:1/nenhum"));

describe("fronteiras de acesso ao banco", () => {
  it("a aplicação não tem módulos não autorizados usando o acesso privilegiado", async () => {
    const { AppModule } = await import("../src/app.module.js");
    const ref = await Test.createTestingModule({ imports: [AppModule] }).compile();
    expect(violacoesDeAcessoAoBanco(ref.get(ModulesContainer))).toEqual([]);
    await ref.close();
  });

  it("detecta um módulo não autorizado importando o SystemDbModule", async () => {
    @Module({ imports: [SystemDbModule] })
    class RelatoriosModule {}

    const { AppModule } = await import("../src/app.module.js");
    const ref = await Test.createTestingModule({
      imports: [AppModule, RelatoriosModule],
    }).compile();
    expect(violacoesDeAcessoAoBanco(ref.get(ModulesContainer))).toEqual([
      "RelatoriosModule importa SystemDbModule",
    ]);
    await ref.close();
  });
});
