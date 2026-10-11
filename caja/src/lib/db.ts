import postgres from "postgres";
import { PGlite } from "@electric-sql/pglite";
import { SCHEMA } from "./schema";

export type Row = Record<string, any>;
export type Query = <T = Row>(text: string, params?: unknown[]) => Promise<T[]>;

interface Db {
  exec(text: string): Promise<unknown>;
  query: Query;
  transaction<T>(fn: (q: Query) => Promise<T>): Promise<T>;
}

// Con DATABASE_URL usa Postgres (Neon/Vercel). Sin ella usa PGlite en memoria,
// para desarrollar y probar sin instalar nada.
function crearDb(): Db {
  const url = process.env.DATABASE_URL;
  if (url) {
    const sql = postgres(url, { max: 5, prepare: false });
    return {
      exec: (text) => sql.unsafe(text),
      query: (text, params) => sql.unsafe(text, params as any[]) as any,
      transaction: (fn) =>
        sql.begin((tx) => fn((text, params) => tx.unsafe(text, params as any[]) as any)) as any,
    };
  }
  const lite = new PGlite();
  return {
    exec: (text) => lite.exec(text),
    query: async (text, params) => ((await lite.query(text, params as any[])).rows as any),
    transaction: (fn) =>
      lite.transaction((tx) => fn(async (text, params) => (await tx.query(text, params as any[])).rows as any)),
  };
}

const g = globalThis as unknown as { __cajaDb?: Promise<Db> };

export function db(): Promise<Db> {
  if (!g.__cajaDb) {
    const d = crearDb();
    g.__cajaDb = d.exec(SCHEMA).then(() => d);
  }
  return g.__cajaDb;
}

export async function query<T = Row>(text: string, params?: unknown[]): Promise<T[]> {
  return (await db()).query<T>(text, params);
}

export async function transaction<T>(fn: (q: Query) => Promise<T>): Promise<T> {
  return (await db()).transaction(fn);
}
