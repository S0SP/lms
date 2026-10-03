import { db } from '../src/lib/drizzle';
import { sql } from 'drizzle-orm';

async function main() {
  const educators = await db.execute(sql`
    SELECT u.id, u.name, u.email, u.phone, ep.* 
    FROM users u 
    LEFT JOIN educator_profiles ep ON ep.user_id = u.id 
    WHERE u.role = 'educator'
  `);
  console.log('Educators count:', educators.length);
  if (educators.length > 0) {
    console.log('Sample educator:', educators[0]);
  }

  const emailCount = await db.execute(sql`SELECT count(*) FROM email_log`);
  console.log('email_log count:', emailCount[0]);

  const notifCount = await db.execute(sql`SELECT count(*) FROM notification_log`);
  console.log('notification_log count:', notifCount[0]);

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
