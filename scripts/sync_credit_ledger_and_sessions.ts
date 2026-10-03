import { db } from '../src/lib/drizzle';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Synchronizing credit_ledger and sessions schema...');

  await db.execute(sql`
    ALTER TABLE sessions 
    ADD COLUMN IF NOT EXISTS ai_summary text;
  `);
  console.log('✅ Added ai_summary column to sessions table.');

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS credit_ledger (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      learner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      delta numeric(8, 2) NOT NULL,
      balance_after numeric(8, 2) NOT NULL,
      note text,
      source text NOT NULL DEFAULT 'admin',
      session_id uuid,
      adjusted_by uuid REFERENCES users(id),
      created_at timestamp with time zone DEFAULT now() NOT NULL
    );
  `);
  console.log('✅ Created credit_ledger table.');

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS credit_ledger_course_learner_idx ON credit_ledger(course_id, learner_id);
    CREATE INDEX IF NOT EXISTS credit_ledger_created_idx ON credit_ledger(created_at);
  `);
  console.log('✅ Created indexes on credit_ledger table.');

  process.exit(0);
}

main().catch((e) => {
  console.error('Failed schema synchronization:', e);
  process.exit(1);
});
