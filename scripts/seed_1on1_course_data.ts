import { db } from '../src/lib/drizzle';
import {
  users,
  courses,
  courseEducators,
  courseEnrollments,
  credits,
  creditLedger,
  sessions,
  sessionAttendees,
  contentSections,
  contentResources,
  fileAssets,
  videoAssets,
  tags,
  orgs,
} from '../src/db/schema';
import { eq, and } from 'drizzle-orm';

async function main() {
  console.log('Seeding 1-on-1 personalization course data from screenshots...');

  // 1. Get or create Org
  let [org] = await db.select().from(orgs).limit(1);
  if (!org) {
    [org] = await db
      .insert(orgs)
      .values({ name: 'UnboundYou Academy', subdomain: 'unboundyou' })
      .returning();
  }

  // 2. Educators list from screenshot
  const educatorsData = [
    { name: 'Abir Sir', email: 'abirsan.saha@gmail.com', phone: '+919876543210' },
    { name: 'Ankarao Paritala', email: 'akathyd@gmail.com', phone: '+919876543211' },
    { name: 'Dr. Sudeshna Chakraborty', email: 'schakraborty.bio@gmail.com', phone: '+919876543212' },
    { name: 'Japjee Soin', email: 'japjee@unboundyou.com', phone: '+919876543213' },
    { name: 'K. Sujatha', email: 'sujatha@unboundyou.com', phone: '+919876543214' },
    { name: 'Priyanka Ma\'am', email: 'priyanka@unboundyou.com', phone: '+919876543215' },
    { name: 'Rahul Sir', email: 'rahul@unboundyou.com', phone: '+919876543216' },
  ];

  const educatorMap: Record<string, string> = {};

  for (const edu of educatorsData) {
    let [existing] = await db.select().from(users).where(eq(users.email, edu.email)).limit(1);
    if (!existing) {
      [existing] = await db
        .insert(users)
        .values({
          orgId: org.id,
          name: edu.name,
          email: edu.email,
          phone: edu.phone,
          role: 'educator',
          passwordHash: 'seeded_pwd_hash',
          isActive: true,
        })
        .returning();
    }
    educatorMap[edu.name] = existing.id;
  }

  // Admin: Ms. Khushi
  let [adminKhushi] = await db.select().from(users).where(eq(users.email, 'itskhushibh@gmail.com')).limit(1);
  if (!adminKhushi) {
    [adminKhushi] = await db
      .insert(users)
      .values({
        orgId: org.id,
        name: 'Ms. Khushi',
        email: 'itskhushibh@gmail.com',
        role: 'admin',
        passwordHash: 'seeded_pwd_hash',
        isActive: true,
      })
      .returning();
  }

  // Learner: S.Y.Swayammirithika
  let [learner] = await db.select().from(users).where(eq(users.email, 'swayam@unboundyou.com')).limit(1);
  if (!learner) {
    [learner] = await db
      .insert(users)
      .values({
        orgId: org.id,
        name: 'S.Y.Swayammirithika',
        email: 'swayam@unboundyou.com',
        phone: '+919566640437',
        role: 'learner',
        passwordHash: 'seeded_pwd_hash',
        isActive: true,
      })
      .returning();
  }

  // 3. Course: Swayammirithika-IG-G9-Phy-UnboundYou
  let [course] = await db
    .select()
    .from(courses)
    .where(eq(courses.name, 'Swayammirithika-IG-G9-Phy-UnboundYou'))
    .limit(1);

  if (!course) {
    [course] = await db
      .insert(courses)
      .values({
        orgId: org.id,
        name: 'Swayammirithika-IG-G9-Phy-UnboundYou',
        shortCode: 'SWAYAM-PHY',
        description: 'Personalized 1-on-1 Physics curriculum for Grade 9 IGCSE.',
        type: 'one_on_one',
        status: 'published',
        board: 'IGCSE',
        grade: 'Grade 9',
        defaultSessionDurationMin: 60,
        createdBy: adminKhushi.id,
      })
      .returning();
  }

  // 4. Enroll Learner
  const [existingEnrollment] = await db
    .select()
    .from(courseEnrollments)
    .where(and(eq(courseEnrollments.courseId, course.id), eq(courseEnrollments.learnerId, learner.id)))
    .limit(1);

  if (!existingEnrollment) {
    await db.insert(courseEnrollments).values({
      courseId: course.id,
      learnerId: learner.id,
      status: 'active',
    });
  }

  // 5. Assign Educator: Abir Sir
  const abirId = educatorMap['Abir Sir'];
  if (abirId) {
    const [existingEdu] = await db
      .select()
      .from(courseEducators)
      .where(and(eq(courseEducators.courseId, course.id), eq(courseEducators.educatorId, abirId)))
      .limit(1);

    if (!existingEdu) {
      await db.insert(courseEducators).values({
        courseId: course.id,
        educatorId: abirId,
      });
    }
  }

  // 6. Credits: 8 Total, 5 Consumed, 3 Remaining
  const [existingCredits] = await db
    .select()
    .from(credits)
    .where(and(eq(credits.courseId, course.id), eq(credits.learnerId, learner.id)))
    .limit(1);

  if (!existingCredits) {
    await db.insert(credits).values({
      courseId: course.id,
      learnerId: learner.id,
      total: '8.00',
      consumed: '5.00',
      adjustedBy: adminKhushi.id,
      adjustedAt: new Date(),
    });
  } else {
    await db
      .update(credits)
      .set({ total: '8.00', consumed: '5.00' })
      .where(eq(credits.id, existingCredits.id));
  }

  // 7. Seed Credit Ledger
  await db.delete(creditLedger).where(eq(creditLedger.courseId, course.id));
  await db.insert(creditLedger).values([
    {
      courseId: course.id,
      learnerId: learner.id,
      delta: '8.00',
      balanceAfter: '8.00',
      note: 'Initial 8 Credit Pack Allotted',
      source: 'admin',
      adjustedBy: adminKhushi.id,
      createdAt: new Date('2026-09-15T10:00:00Z'),
    },
    {
      courseId: course.id,
      learnerId: learner.id,
      delta: '-1.00',
      balanceAfter: '7.00',
      note: 'Session by Abir Sir',
      source: 'session',
      adjustedBy: adminKhushi.id,
      createdAt: new Date('2026-09-18T18:55:00Z'),
    },
    {
      courseId: course.id,
      learnerId: learner.id,
      delta: '-1.00',
      balanceAfter: '6.00',
      note: 'Session by Abir Sir',
      source: 'session',
      adjustedBy: adminKhushi.id,
      createdAt: new Date('2026-09-21T19:59:00Z'),
    },
    {
      courseId: course.id,
      learnerId: learner.id,
      delta: '-1.00',
      balanceAfter: '5.00',
      note: 'Session by Abir Sir',
      source: 'session',
      adjustedBy: adminKhushi.id,
      createdAt: new Date('2026-09-25T18:58:00Z'),
    },
    {
      courseId: course.id,
      learnerId: learner.id,
      delta: '-1.00',
      balanceAfter: '4.00',
      note: 'Session by Abir Sir',
      source: 'session',
      adjustedBy: adminKhushi.id,
      createdAt: new Date('2026-09-28T19:59:00Z'),
    },
    {
      courseId: course.id,
      learnerId: learner.id,
      delta: '-1.00',
      balanceAfter: '3.00',
      note: 'Session by Abir Sir',
      source: 'session',
      adjustedBy: adminKhushi.id,
      createdAt: new Date('2026-10-02T18:55:00Z'),
    },
  ]);

  // 8. Seed Sessions matching the screenshots exactly
  await db.delete(sessions).where(eq(sessions.courseId, course.id));
  const pastSessions = [
    {
      title: 'Swayammirithika-IG-G9-Phy-UnboundYou',
      topic: 'Introductory Dynamics & Kinematics',
      scheduledAt: new Date('2026-09-18T18:55:00+05:30'),
      durationMin: 63,
      status: 'completed' as const,
      creditsConsumed: '1.00',
      recordingUrl: 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4',
      aiSummary: 'This was an educational tutoring session between Swayammirithika and Abir focused on fundamental physics concepts, kinematics, velocity vs speed, and foundational measurement units.',
    },
    {
      title: 'Momentum, Force, and Acceleration',
      topic: 'Newton\'s Second Law & Momentum Math',
      scheduledAt: new Date('2026-09-21T19:59:00+05:30'),
      durationMin: 60,
      status: 'completed' as const,
      creditsConsumed: '1.00',
      recordingUrl: 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4',
      aiSummary: 'Tutoring session covering momentum vectors, impulse equations, and practical numerical problems on force equilibrium.',
    },
    {
      title: 'Swayammirithika-IG-G9-Phy-UnboundYou',
      topic: 'Work, Energy, and Power Calculations',
      scheduledAt: new Date('2026-09-25T18:58:00+05:30'),
      durationMin: 65,
      status: 'completed' as const,
      creditsConsumed: '1.00',
      recordingUrl: 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4',
      aiSummary: 'Detailed session on kinetic energy conservation and gravitational potential energy models with step-by-step math.',
    },
    {
      title: 'Momentum, Force and Motion',
      topic: 'Elastic and Inelastic Collisions',
      scheduledAt: new Date('2026-09-28T19:50:00+05:30'),
      durationMin: 59,
      status: 'completed' as const,
      creditsConsumed: '1.00',
      recordingUrl: 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4',
      aiSummary: 'Covered coefficient of restitution and 1D momentum conservation under varied friction coefficients.',
    },
    {
      title: 'Stress-Strain and Elastic Modulus Math',
      topic: 'Elasticity, Young\'s Modulus, Stress & Strain',
      scheduledAt: new Date('2026-10-02T18:55:00+05:30'),
      durationMin: 60,
      status: 'completed' as const,
      creditsConsumed: '1.00',
      recordingUrl: 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4',
      aiSummary: 'This was an educational tutoring session between Hardi/Swayammirithika and Abir focused on physics concepts, particularly elasticity, stress, strain, and Young\'s modulus calculations with IGCSE past papers.',
    },
    {
      title: 'Live Session',
      topic: 'Thermal Physics and Specific Heat Capacity',
      scheduledAt: new Date('2026-10-12T20:00:00+05:30'),
      durationMin: 60,
      status: 'scheduled' as const,
      creditsConsumed: '1.00',
      zoomMeetingUrl: 'https://zoom.us/j/9988776655',
    },
    {
      title: 'Live Session',
      topic: 'Wave Properties and Sound Waves',
      scheduledAt: new Date('2026-10-16T19:00:00+05:30'),
      durationMin: 60,
      status: 'scheduled' as const,
      creditsConsumed: '1.00',
      zoomMeetingUrl: 'https://zoom.us/j/9988776656',
    },
  ];

  for (const s of pastSessions) {
    const [inserted] = await db
      .insert(sessions)
      .values({
        courseId: course.id,
        educatorId: abirId || adminKhushi.id,
        title: s.title,
        topic: s.topic,
        scheduledAt: s.scheduledAt,
        durationMin: s.durationMin,
        status: s.status,
        hostedBy: 'educator',
        recordingUrl: s.recordingUrl,
        aiSummary: s.aiSummary,
        zoomMeetingUrl: s.zoomMeetingUrl,
        creditsConsumed: s.creditsConsumed,
      })
      .returning();

    // Link attendee
    await db.insert(sessionAttendees).values({
      sessionId: inserted.id,
      learnerId: learner.id,
    });
  }

  // 9. Content: Section 1 with PDF (Image 23)
  await db.delete(contentSections).where(eq(contentSections.courseId, course.id));
  const [section1] = await db
    .insert(contentSections)
    .values({
      courseId: course.id,
      title: 'Section 1',
      sortOrder: 0,
    })
    .returning();

  const [pdfResource] = await db
    .insert(contentResources)
    .values({
      sectionId: section1.id,
      type: 'file',
      title: 'UnboundYou Physics Master Revision EBook-compressed.pdf.pdf',
      sortOrder: 0,
      isPublished: true,
      access: 'paid',
      externalUrl: '/sample-curriculum.pdf',
    })
    .returning();

  await db.insert(fileAssets).values({
    resourceId: pdfResource.id,
    r2Key: 'courses/phy/UnboundYou-Physics-Master-Revision-EBook.pdf',
    fileType: 'pdf',
    sizeBytes: 4500000,
    originalName: 'UnboundYou Physics Master Revision EBook-compressed.pdf.pdf',
  });

  // 10. Tags: Telugu, IB, Chemistry
  const tagList = [
    { name: 'Telugu', colorHex: '#ec4899', category: 'language' as const },
    { name: 'IB', colorHex: '#eab308', category: 'curriculum' as const },
    { name: 'Chemistry', colorHex: '#3b82f6', category: 'core' as const },
  ];

  for (const t of tagList) {
    const [existing] = await db
      .select()
      .from(tags)
      .where(and(eq(tags.orgId, org.id), eq(tags.name, t.name)))
      .limit(1);
    if (!existing) {
      await db.insert(tags).values({
        orgId: org.id,
        name: t.name,
        colorHex: t.colorHex,
        category: t.category,
      });
    }
  }

  console.log('✅ Successfully seeded 1-on-1 personalized course Swayammirithika-IG-G9-Phy-UnboundYou!');
  process.exit(0);
}

main().catch((e) => {
  console.error('Seeding error:', e);
  process.exit(1);
});
