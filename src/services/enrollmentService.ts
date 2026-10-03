import { db } from '@/lib/drizzle';
import {
  courseEnrollments,
  sessionAttendees,
  sessions,
  credits,
  courseEducators,
  users,
  courses,
} from '@/db/schema';
import { eq, and, ne, isNull } from 'drizzle-orm';

export interface ClassEnrollmentResult {
  enrollmentId: string;
  learnerId: string;
  courseId: string;
  courseName: string;
  educatorId?: string | null;
  educatorName?: string | null;
  sessionsLinked: number;
}

/**
 * Enrolls a student into a class/course and automatically synchronizes
 * all calendar dates, attendees, credits, and educator bindings.
 */
export async function enrollStudentInClass(
  learnerId: string,
  courseId: string,
  assignedEducatorId?: string
): Promise<ClassEnrollmentResult> {
  // 1. Verify course exists
  const [course] = await db
    .select({ id: courses.id, name: courses.name })
    .from(courses)
    .where(eq(courses.id, courseId))
    .limit(1);

  if (!course) {
    throw new Error('Course not found');
  }

  // 2. Check or insert into course_enrollments
  const [existingEnrollment] = await db
    .select()
    .from(courseEnrollments)
    .where(and(eq(courseEnrollments.learnerId, learnerId), eq(courseEnrollments.courseId, courseId)))
    .limit(1);

  let enrollmentId = existingEnrollment?.id;

  if (!existingEnrollment) {
    const [created] = await db
      .insert(courseEnrollments)
      .values({
        learnerId,
        courseId,
        status: 'active',
      })
      .returning({ id: courseEnrollments.id });
    enrollmentId = created.id;
  } else if (existingEnrollment.status !== 'active') {
    await db
      .update(courseEnrollments)
      .set({ status: 'active', completedAt: null })
      .where(eq(courseEnrollments.id, existingEnrollment.id));
  }

  // 3. Ensure credit ledger row exists for this learner & course
  const [existingCredit] = await db
    .select({ id: credits.id })
    .from(credits)
    .where(and(eq(credits.learnerId, learnerId), eq(credits.courseId, courseId)))
    .limit(1);

  if (!existingCredit) {
    await db.insert(credits).values({
      learnerId,
      courseId,
      total: '10.0',
      consumed: '0.0',
    });
  }

  // 4. Resolve educator for the class
  let targetEducatorId = assignedEducatorId;
  if (!targetEducatorId) {
    const [assigned] = await db
      .select({ educatorId: courseEducators.educatorId })
      .from(courseEducators)
      .where(eq(courseEducators.courseId, courseId))
      .limit(1);
    targetEducatorId = assigned?.educatorId;
  }

  let educatorName: string | null = null;
  if (targetEducatorId) {
    const [eduUser] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, targetEducatorId))
      .limit(1);
    educatorName = eduUser?.name ?? null;

    // Ensure educator is recorded in course_educators
    const [eduCourseRel] = await db
      .select({ id: courseEducators.id })
      .from(courseEducators)
      .where(and(eq(courseEducators.courseId, courseId), eq(courseEducators.educatorId, targetEducatorId)))
      .limit(1);

    if (!eduCourseRel) {
      await db.insert(courseEducators).values({
        courseId,
        educatorId: targetEducatorId,
      });
    }
  }

  // 5. Find ALL active sessions for this course and automatically link the learner
  const courseSessions = await db
    .select({
      id: sessions.id,
      educatorId: sessions.educatorId,
    })
    .from(sessions)
    .where(
      and(
        eq(sessions.courseId, courseId),
        ne(sessions.status, 'cancelled')
      )
    );

  let linkedCount = 0;
  for (const s of courseSessions) {
    // Check if attendee already exists
    const [attendee] = await db
      .select({ id: sessionAttendees.id })
      .from(sessionAttendees)
      .where(and(eq(sessionAttendees.sessionId, s.id), eq(sessionAttendees.learnerId, learnerId)))
      .limit(1);

    if (!attendee) {
      await db.insert(sessionAttendees).values({
        sessionId: s.id,
        learnerId,
      });
      linkedCount++;
    }

    // If session had no educator assigned, attach the course educator
    if (targetEducatorId && !s.educatorId) {
      await db
        .update(sessions)
        .set({ educatorId: targetEducatorId })
        .where(eq(sessions.id, s.id));
    }
  }

  return {
    enrollmentId: enrollmentId!,
    learnerId,
    courseId,
    courseName: course.name,
    educatorId: targetEducatorId,
    educatorName,
    sessionsLinked: linkedCount,
  };
}
