/**
 * Generic PostgreSQL client — works with ANY Postgres provider.
 * Switch providers by changing DATABASE_URL in .env — no code changes required.
 *
 * Compatible with: Neon, Supabase, AWS RDS, Railway, Render, PlanetScale (Postgres),
 * fly.io Postgres, Vercel Postgres, local Docker Postgres, or any standard pg server.
 *
 * Driver: `postgres` (postgres.js) — the fastest Node.js Postgres client.
 * ORM:    Drizzle ORM (drizzle-orm/postgres-js)
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/db/schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set.');
}

// Connection pool settings that work well across providers:
// - max: 10 connections in long-running server (Next.js dev / Node server)
// - max: 1 connection in serverless (each function invocation gets one)
// The DATABASE_URL can include ?sslmode=require for providers that need SSL.
const isServerless =
  process.env.VERCEL === '1' ||
  process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined ||
  process.env.CF_PAGES === '1';

// Singleton caching on globalThis prevents pool re-creation on every Next.js SSR / HMR request
const globalForDb = globalThis as unknown as {
  _postgresSql?: postgres.Sql;
  _drizzleDb?: ReturnType<typeof drizzle<typeof schema>>;
};

export const sql =
  globalForDb._postgresSql ??
  postgres(process.env.DATABASE_URL, {
    max: isServerless ? 1 : 15,
    idle_timeout: isServerless ? 0 : 30,
    connect_timeout: 10,
    prepare: false,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForDb._postgresSql = sql;
}

export const db =
  globalForDb._drizzleDb ??
  drizzle(sql, {
    schema,
    logger: process.env.DEBUG_DB === 'true',
  });

if (process.env.NODE_ENV !== 'production') {
  globalForDb._drizzleDb = db;
}

export default db;
