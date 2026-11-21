import { describe, expect, it } from "vitest";
import { healthResponseSchema } from "./health";

describe("healthResponseSchema", () => {
  it("aceita resposta de sucesso com dependências", () => {
    const result = healthResponseSchema.safeParse({ status: "ok", checks: { database: "up" } });
    expect(result.success).toBe(true);
  });

  it("aceita resposta de erro", () => {
    const result = healthResponseSchema.safeParse({
      status: "error",
      checks: { database: "down" },
    });
    expect(result.success).toBe(true);
  });

  it("rejeita status desconhecido", () => {
    const result = healthResponseSchema.safeParse({ status: "degraded", checks: {} });
    expect(result.success).toBe(false);
  });

  it("rejeita campos extras, para não vazar detalhes internos", () => {
    const result = healthResponseSchema.safeParse({
      status: "error",
      checks: { database: "down" },
      message: "connect ECONNREFUSED 10.0.0.5:5432 user=postgres",
    });
    expect(result.success).toBe(false);
  });
});
