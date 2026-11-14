import { describe, expect, it } from "vitest";
import { createTestDb } from "./harness";

describe("migrations + seed", () => {
  it("load cleanly", async () => {
    const db = await createTestDb();
    const r = await db.query<{ n: number }>("select count(*)::int n from public.tournament_registrations");
    expect(r.rows[0].n).toBeGreaterThan(40);
  });
});
