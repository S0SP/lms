import { db } from '../src/lib/drizzle';
import * as schema from '../src/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
  console.log('🌱 Seeding production courses and enrollments...');

  // 1. Get Root Org
  const [org] = await db.select().from(schema.orgs).limit(1);
  if (!org) {
    throw new Error('No org found in DB');
  }

  // 2. Get Educator & Learner
  const [educator] = await db.select().from(schema.users).where(eq(schema.users.email, 'educator@unboundyou.com'));
  const [learner] = await db.select().from(schema.users).where(eq(schema.users.email, 'student@unboundyou.com'));

  if (!educator || !learner) {
    throw new Error('Educator or student not found in DB');
  }

  const courseList = [
    {
      name: 'Advanced Mathematics & Statistics',
      shortCode: 'MATH-ADV-201',
      description: 'Comprehensive calculus, linear algebra, and advanced statistical mechanics.',
      board: 'IGCSE / A-Level',
      grade: '12',
    },
    {
      name: 'Quantum Physics & Electrodynamics',
      shortCode: 'PHY-Q-301',
      description: 'Deep dive into wave-particle duality, EPR paradox, and Maxwell equations.',
      board: 'IB DP',
      grade: '12',
    },
    {
      name: 'Computer Science: Algorithms & Architecture',
      shortCode: 'CS-ALGO-101',
      description: 'Data structures, algorithm complexity, and systems programming.',
      board: 'Cambridge',
      grade: '11',
    },
  ];

  for (const cData of courseList) {
    const [existing] = await db.select().from(schema.courses).where(eq(schema.courses.shortCode, cData.shortCode));
    let courseId = existing?.id;

    if (!existing) {
      const [c] = await db
        .insert(schema.courses)
        .values({
          orgId: org.id,
          name: cData.name,
          shortCode: cData.shortCode,
          description: cData.description,
          type: 'one_on_one',
          status: 'published',
          board: cData.board,
          grade: cData.grade,
          defaultSessionDurationMin: 60,
        })
        .returning();
      courseId = c.id;
      console.log(`  ✅ Created Course: "${c.name}" (${c.id})`);
    } else {
      console.log(`  ℹ️ Course already exists: "${existing.name}" (${existing.id})`);
    }

    // Link Educator
    const [educatorLink] = await db
      .select()
      .from(schema.courseEducators)
      .where(eq(schema.courseEducators.courseId, courseId!));
    if (!educatorLink) {
      await db.insert(schema.courseEducators).values({
        courseId: courseId!,
        educatorId: educator.id,
      });
      console.log(`     Assigned educator: ${educator.name}`);
    }

    // Enroll Learner
    const [enrollment] = await db
      .select()
      .from(schema.courseEnrollments)
      .where(eq(schema.courseEnrollments.courseId, courseId!));
    if (!enrollment) {
      await db.insert(schema.courseEnrollments).values({
        courseId: courseId!,
        learnerId: learner.id,
      });
      console.log(`     Enrolled learner: ${learner.name}`);
    }
  }

  console.log('🎉 Seeding complete! All courses published and linked.');
  process.exit(0);
}

main().catch((e) => {
  console.error('Seeding error:', e);
  process.exit(1);
});
