import { db } from '../src/lib/drizzle';
import { sql } from 'drizzle-orm';

async function main() {
  await db.execute(sql`
    ALTER TABLE educator_profiles 
    ADD COLUMN IF NOT EXISTS cover_photo_url text,
    ADD COLUMN IF NOT EXISTS tags jsonb DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS reviews jsonb DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS payout_details jsonb DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS booking_preferences jsonb DEFAULT '{"minNotice": "1 hour", "bufferTime": "0 mins", "restrictAdjacent": false, "limitFuture": "30 days"}'::jsonb;
  `);

  console.log('✅ Added cover_photo_url, tags, reviews, payout_details, booking_preferences to educator_profiles.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
