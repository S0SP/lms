import { type NextRequest } from 'next/server';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';
import { db } from '@/lib/drizzle';
import { sessions, sessionAttendees, sessionFeedback, courseEducators, courseEnrollments, courses, users } from '@/db/schema';
import { eq, and, gte, lte, sql, notInArray, desc, asc } from 'drizzle-orm';

// GET /api/v1/educator/dashboard
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(['educator', 'admin', 'owner']);
  if (error || !session?.user?.id) return error || apiError('Unauthorized', 401);

  const educatorId = session.user.id;

  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    // 1. Today's sessions
    const [todaySessionsResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(sessions)
      .where(
        and(
          eq(sessions.educatorId, educatorId),
          gte(sessions.scheduledAt, startOfToday),
          lte(sessions.scheduledAt, endOfToday),
          eq(sessions.status, 'scheduled')
        )
      );

    // 2. Active learners count across educator's courses
    const [activeLearnersResult] = await db
      .select({ count: sql<number>`count(DISTINCT ce.learner_id)::int` })
      .from(courseEducators)
      .innerJoin(courseEnrollments, eq(courseEducators.courseId, courseEnrollments.courseId))
      .where(
        and(
          eq(courseEducators.educatorId, educatorId),
          eq(courseEnrollments.status, 'active')
        )
      );

    // 3. Pending feedback count (completed sessions without feedback)
    const [pendingFeedbackResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(sessions)
      .leftJoin(sessionFeedback, eq(sessions.id, sessionFeedback.sessionId))
      .where(
        and(
          eq(sessions.educatorId, educatorId),
          eq(sessions.status, 'completed'),
          sql`${sessionFeedback.id} IS NULL`
        )
      );

    // 4. Upcoming sessions (next 5)
    const upcomingSessions = await db
      .select({
        id: sessions.id,
        title: sessions.title,
        topic: sessions.topic,
        scheduledAt: sessions.scheduledAt,
        durationMin: sessions.durationMin,
        status: sessions.status,
        zoomMeetingUrl: sessions.zoomMeetingUrl,
        courseName: courses.name,
        courseType: courses.type,
      })
      .from(sessions)
      .innerJoin(courses, eq(sessions.courseId, courses.id))
      .where(
        and(
          eq(sessions.educatorId, educatorId),
          gte(sessions.scheduledAt, now)
        )
      )
      .orderBy(asc(sessions.scheduledAt))
      .limit(5);

    return apiSuccess({
      educatorName: session.user.name || 'Educator',
      todaySessionsCount: todaySessionsResult?.count ?? 0,
      activeLearnersCount: activeLearnersResult?.count ?? 0,
      pendingFeedbackCount: pendingFeedbackResult?.count ?? 0,
      upcomingSessions,
    });
  } catch (err: any) {
    console.error('Educator dashboard API error:', err);
    return apiError('Failed to fetch educator dashboard stats', 500);
  }
}
