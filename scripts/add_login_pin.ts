import { db } from '../src/lib/drizzle';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Adding login_pin column to users table if not exists...');
  await db.execute(sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS login_pin VARCHAR(10);
  `);
  console.log('Column login_pin verified in users table.');
}

main().catch(console.error);
