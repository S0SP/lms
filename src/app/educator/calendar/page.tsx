import { auth } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import { sessions, courses, sessionAttendees, users, googleCalendarTokens } from '@/db/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { EducatorCalendarClient } from '@/components/educator/EducatorCalendarClient';

export const dynamic = 'force-dynamic';

export type CalendarSession = {
  id: string;
  title: string;
  topic: string | null;
  scheduledAt: string; // ISO string
  durationMin: number;
  status: string;
  zoomMeetingUrl: string | null;
  courseName: string | null;
  attendeeCount: number;
};

export default async function EducatorCalendarPage() {
  const session = await auth();
  const educatorId = session!.user!.id as string;
  const educatorName = session?.user?.name ?? 'Educator';

  // Check if educator has connected Google Calendar
  const [calToken] = await db
    .select({ id: googleCalendarTokens.id })
    .from(googleCalendarTokens)
    .where(eq(googleCalendarTokens.educatorId, educatorId))
    .limit(1);
  const isCalendarConnected = Boolean(calToken);

  // Fetch sessions for the next 60 days + past 30 days (covers current month & week views)
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - 30);
  const windowEnd = new Date();
  windowEnd.setDate(windowEnd.getDate() + 60);

  const sessionsData = await db
    .select({
      id: sessions.id,
      title: sessions.title,
      topic: sessions.topic,
      scheduledAt: sessions.scheduledAt,
      durationMin: sessions.durationMin,
      status: sessions.status,
      zoomMeetingUrl: sessions.zoomMeetingUrl,
      courseName: courses.name,
      attendeeCount: sql<number>`(
        SELECT count(*)::int FROM session_attendees WHERE session_id = ${sessions.id}
      )`,
    })
    .from(sessions)
    .leftJoin(courses, eq(sessions.courseId, courses.id))
    .where(
      and(
        eq(sessions.educatorId, educatorId),
        gte(sessions.scheduledAt, windowStart),
        lte(sessions.scheduledAt, windowEnd),
      ),
    )
    .orderBy(sessions.scheduledAt);

  // Fetch published courses for quick session booking
  const availableCourses = await db
    .select({
      id: courses.id,
      name: courses.name,
    })
    .from(courses)
    .where(eq(courses.status, 'published'));

  // Fetch learners for attendee selection
  const availableLearners = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
    })
    .from(users)
    .where(eq(users.role, 'learner'));

  const calendarSessions: CalendarSession[] = sessionsData.map((s) => ({
    ...s,
    scheduledAt: s.scheduledAt.toISOString(),
    courseName: s.courseName ?? null,
    attendeeCount: s.attendeeCount ?? 0,
  }));

  return (
    <EducatorCalendarClient
      sessions={calendarSessions}
      educatorName={educatorName}
      educatorId={educatorId}
      isCalendarConnected={isCalendarConnected}
      courses={availableCourses}
      learners={availableLearners}
    />
  );
}

