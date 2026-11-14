// Spins up an in-memory Postgres (PGlite) with our migrations + demo seed,
// so RLS, RPC rules and scoring can be tested without Docker or a cloud project.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { unaccent } from "@electric-sql/pglite/contrib/unaccent";

const root = join(__dirname, "..", "..");

export async function createTestDb({ seed = true } = {}) {
  const db = await PGlite.create({ extensions: { pgcrypto, unaccent } });
  await db.exec(readFileSync(join(__dirname, "supabase-stub.sql"), "utf8"));
  const dir = join(root, "supabase", "migrations");
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    try {
      await db.exec(readFileSync(join(dir, f), "utf8"));
    } catch (e) {
      throw new Error(`Migration ${f} failed: ${(e as Error).message}`);
    }
  }
  if (seed) {
    try {
      await db.exec(readFileSync(join(root, "supabase", "seed.sql"), "utf8"));
    } catch (e) {
      throw new Error(`Seed failed: ${(e as Error).message}`);
    }
  }
  return db;
}

export type Db = Awaited<ReturnType<typeof createTestDb>>;

/** Runs `fn` as an API user: role authenticated (or anon) + JWT sub, inside a transaction that is rolled back. */
export async function as<T>(db: Db, userId: string | null, fn: (q: Db["query"]) => Promise<T>, opts: { keep?: boolean } = {}): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.exec(`set local role ${userId ? "authenticated" : "anon"}`);
    await tx.query(`select set_config('request.jwt.claim.sub', $1, true), set_config('request.jwt.claim.role', $2, true)`,
      [userId ?? "", userId ? "authenticated" : "anon"]);
    const out = await fn(tx.query.bind(tx) as Db["query"]);
    if (!opts.keep) await tx.rollback();
    return out;
  }) as Promise<T>;
}

/** Like `as` but expects the call to fail; returns the error message. */
export async function failsAs(db: Db, userId: string | null, sql: string, params: unknown[] = []): Promise<string> {
  try {
    await as(db, userId, (q) => q(sql, params));
  } catch (e) {
    return (e as Error).message;
  }
  throw new Error(`Expected failure but succeeded: ${sql}`);
}

export async function userId(db: Db, username: string) {
  const r = await db.query<{ id: string }>("select id from public.profiles where username = $1", [username]);
  if (!r.rows[0]) throw new Error(`no user ${username}`);
  return r.rows[0].id;
}
