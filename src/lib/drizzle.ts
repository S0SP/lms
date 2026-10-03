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

const sql = postgres(process.env.DATABASE_URL, {
  // Serverless: each function invocation opens/closes one connection.
  // Long-running server: maintain a pool.
  max: isServerless ? 1 : 10,

  // Gracefully handle idle connections being terminated by the provider.
  idle_timeout: isServerless ? 0 : 30,

  // Connection timeout (seconds).
  connect_timeout: 10,

  // SSL is enabled automatically when the DATABASE_URL contains sslmode=require.
  // No provider-specific SSL config needed here.
});

export const db = drizzle(sql, {
  schema,
  logger: process.env.NODE_ENV === 'development',
});

// Export the raw sql client if you ever need to run raw queries directly.
export { sql };
