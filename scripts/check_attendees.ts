import { db } from '../src/lib/drizzle';
import { sql } from 'drizzle-orm';

async function check() {
  const cols = await db.execute(sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'session_attendees'
  `);
  console.log('Columns of session_attendees:', cols);

  const zoomCols = await db.execute(sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'zoom_attendance'
  `);
  console.log('Columns of zoom_attendance:', zoomCols);
  process.exit(0);
}

check();
