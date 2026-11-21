import { HealthIndicatorService } from "@nestjs/terminus";
import type { DbClient } from "@super-pdv/db";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DATABASE_CHECK_TIMEOUT_MS, DatabaseHealthIndicator } from "./database.health";

function indicatorWith(execute: () => Promise<unknown>) {
  const client = { db: { execute } } as unknown as DbClient;
  return new DatabaseHealthIndicator(new HealthIndicatorService(), client);
}

describe("DatabaseHealthIndicator", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("informa up quando o banco responde", async () => {
    const result = await indicatorWith(async () => ({ rows: [] })).isHealthy("database");
    expect(result).toEqual({ database: { status: "up" } });
  });

  it("informa down, sem detalhes do erro, quando a consulta falha", async () => {
    const result = await indicatorWith(async () => {
      throw new Error("connect ECONNREFUSED 10.0.0.5:5432");
    }).isHealthy("database");
    expect(result).toEqual({ database: { status: "down" } });
  });

  it("informa down quando o banco não responde dentro do tempo limite", async () => {
    vi.useFakeTimers();
    const pending = indicatorWith(() => new Promise(() => undefined)).isHealthy("database");
    await vi.advanceTimersByTimeAsync(DATABASE_CHECK_TIMEOUT_MS);
    await expect(pending).resolves.toEqual({ database: { status: "down" } });
  });
});
