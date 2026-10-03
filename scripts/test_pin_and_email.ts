import { db } from '../src/lib/drizzle';
import { users } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { sendLearnerInvite, sendEducatorInvite, sendParentInvite, sendPinReminderEmail } from '../src/lib/email';

async function run() {
  console.log('=== Checking Learner PIN Status in Database ===');
  const sumit = await db
    .select({ email: users.email, role: users.role, loginPin: users.loginPin, phone: users.phone })
    .from(users)
    .where(eq(users.email, 'sumitchourasia63@gmail.com'))
    .limit(1);
  console.log('Student user:', sumit[0]);

  const demoStudent = await db
    .select({ email: users.email, role: users.role, loginPin: users.loginPin })
    .from(users)
    .where(eq(users.email, 'student@unboundyou.com'))
    .limit(1);
  console.log('Demo Student:', demoStudent[0]);

  console.log('\n=== Testing Email Template Generation ===');
  await sendLearnerInvite({
    to: 'sumitchourasia63@gmail.com',
    name: 'Sumit-Tech-Demo ID',
    phone: '+917003249959',
    pin: '8128',
    loginUrl: 'https://learn.unboundyou.com',
  });
  console.log('✔ sendLearnerInvite executed successfully');

  await sendEducatorInvite({
    to: 'piyushtesting@gmail.com',
    name: 'priyanshu prasad',
    phone: '+9170000000000',
    loginUrl: 'https://learn.unboundyou.com',
  });
  console.log('✔ sendEducatorInvite executed successfully');

  await sendParentInvite({
    to: 'parent@unboundyou.com',
    name: 'Priya Sharma',
    phone: '+919876543210',
    learnerName: 'Sumit-Tech-Demo ID',
    loginUrl: 'https://learn.unboundyou.com',
  });
  console.log('✔ sendParentInvite executed successfully');

  await sendPinReminderEmail({
    to: 'sumitchourasia63@gmail.com',
    name: 'Sumit-Tech-Demo ID',
    pin: '8128',
    loginUrl: 'https://learn.unboundyou.com',
  });
  console.log('✔ sendPinReminderEmail executed successfully');

  console.log('\n=== All tests passed successfully! ===');
  process.exit(0);
}

run().catch((err) => {
  console.error('Error during test:', err);
  process.exit(1);
});
