import { db } from '../src/lib/drizzle';
import { sql } from 'drizzle-orm';

async function migrate() {
  console.log('Migrating attendance policy columns...');

  // 1. Add min_attendance_minutes to orgs
  await db.execute(sql`
    ALTER TABLE orgs 
    ADD COLUMN IF NOT EXISTS min_attendance_minutes integer NOT NULL DEFAULT 40;
  `);
  console.log('Added min_attendance_minutes to orgs table.');

  // 2. Add attended, duration_minutes, attended_at to session_attendees
  await db.execute(sql`
    ALTER TABLE session_attendees 
    ADD COLUMN IF NOT EXISTS attended boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS duration_minutes integer NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS attended_at timestamp with time zone;
  `);
  console.log('Added attended, duration_minutes, attended_at to session_attendees table.');

  // Verify
  const orgCols = await db.execute(sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'orgs' AND column_name = 'min_attendance_minutes'
  `);
  console.log('Verified orgs column:', orgCols);

  const attendeeCols = await db.execute(sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'session_attendees'
  `);
  console.log('Verified session_attendees columns:', attendeeCols);

  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
