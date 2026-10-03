import { db } from '../src/lib/drizzle';
import { sql } from 'drizzle-orm';

async function main() {
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS availability_profiles_educator_unique_idx ON availability_profiles (educator_id);`);
  console.log('✅ Unique index availability_profiles_educator_unique_idx successfully ensured.');
  process.exit(0);
}

main().catch((e) => {
  console.error('Failed to create index:', e);
  process.exit(1);
});
