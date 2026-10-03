import { db } from '../src/lib/drizzle';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Running migration: add course template, session transcript, and report columns...');

  // 1. Courses table
  await db.execute(sql`
    ALTER TABLE courses
    ADD COLUMN IF NOT EXISTS is_template boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES courses(id) ON DELETE SET NULL;
  `);
  console.log('✅ Added is_template and template_id to courses table.');

  // 2. Sessions table
  await db.execute(sql`
    ALTER TABLE sessions
    ADD COLUMN IF NOT EXISTS transcript_text text,
    ADD COLUMN IF NOT EXISTS transcript_vtt text,
    ADD COLUMN IF NOT EXISTS transcript_url text;
  `);
  console.log('✅ Added transcript_text, transcript_vtt, and transcript_url to sessions table.');

  // 3. Monthly reports table
  await db.execute(sql`
    ALTER TABLE monthly_reports
    ADD COLUMN IF NOT EXISTS selected_session_ids jsonb,
    ADD COLUMN IF NOT EXISTS share_token text,
    ADD COLUMN IF NOT EXISTS brand_theme text;
  `);
  console.log('✅ Added selected_session_ids, share_token, and brand_theme to monthly_reports table.');

  process.exit(0);
}

main().catch((e) => {
  console.error('Migration failed:', e);
  process.exit(1);
});
