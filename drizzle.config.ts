import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  // All schema files — Drizzle Kit merges them automatically
  schema: './src/db/schema/index.ts',

  // Migration SQL output folder
  out: './drizzle',

  // Generic PostgreSQL dialect — works with Neon, Supabase, AWS RDS, Railway, local, etc.
  dialect: 'postgresql',

  dbCredentials: {
    // Just set DATABASE_URL in your .env — no provider-specific config.
    // Examples:
    //   postgresql://user:password@localhost:5432/lms_db
    //   postgresql://user:password@db.neon.tech/lms_db?sslmode=require
    //   postgresql://user:password@db.supabase.co:5432/postgres?sslmode=require
    //   postgresql://user:password@mydb.region.rds.amazonaws.com:5432/lms_db
    url: process.env.DATABASE_URL!,
  },

  // Strict migration mode — never drops data without explicit confirmation
  strict: true,

  // Verbose output during generate/migrate
  verbose: true,
});
