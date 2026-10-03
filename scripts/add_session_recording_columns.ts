import { db } from '../src/lib/drizzle';
import { sql } from 'drizzle-orm';

async function main() {
  await db.execute(sql`
    ALTER TABLE sessions 
    ADD COLUMN IF NOT EXISTS recording_url text,
    ADD COLUMN IF NOT EXISTS recording_duration integer,
    ADD COLUMN IF NOT EXISTS recording_files jsonb;
  `);
  console.log('✅ Added recording_url, recording_duration, recording_files columns to sessions table.');
  process.exit(0);
}

main().catch((e) => {
  console.error('Failed to update sessions table schema:', e);
  process.exit(1);
});
