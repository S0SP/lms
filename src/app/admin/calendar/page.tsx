import React from 'react';
import { db } from '@/lib/drizzle';
import { sessions, courses, sessionAttendees, users } from '@/db/schema';
import { eq, and, gte, lte, inArray } from 'drizzle-orm';
import { AdminCalendarClient, AdminCalendarSession } from '@/components/admin/AdminCalendarClient';

export const dynamic = 'force-dynamic';

export default async function AdminCalendarPage() {
  const windowStart = new Date();
  windowStart.setMonth(windowStart.getMonth() - 1);
  const windowEnd = new Date();
  windowEnd.setMonth(windowEnd.getMonth() + 3);

  // 1. Fetch sessions
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
      educatorName: users.name,
    })
    .from(sessions)
    .leftJoin(courses, eq(sessions.courseId, courses.id))
    .leftJoin(users, eq(sessions.educatorId, users.id))
    .where(
      and(
        gte(sessions.scheduledAt, windowStart),
        lte(sessions.scheduledAt, windowEnd),
      )
    )
    .orderBy(sessions.scheduledAt);

  // 2. Fetch attendees for these sessions
  const sessionIds = sessionsData.map(s => s.id);
  let attendeesData: { sessionId: string; learnerName: string | null }[] = [];
  
  if (sessionIds.length > 0) {
    attendeesData = await db
      .select({
        sessionId: sessionAttendees.sessionId,
        learnerName: users.name,
      })
      .from(sessionAttendees)
      .leftJoin(users, eq(sessionAttendees.learnerId, users.id))
      .where(inArray(sessionAttendees.sessionId, sessionIds));
  }

  // 3. Map attendees to sessions
  const attendeesMap = new Map<string, string[]>();
  attendeesData.forEach(a => {
    if (!attendeesMap.has(a.sessionId)) {
      attendeesMap.set(a.sessionId, []);
    }
    if (a.learnerName) {
      attendeesMap.get(a.sessionId)!.push(a.learnerName);
    }
  });

  const calendarSessions: AdminCalendarSession[] = sessionsData.map((s) => ({
    id: s.id,
    title: s.title,
    topic: s.topic,
    scheduledAt: s.scheduledAt.toISOString(),
    durationMin: s.durationMin,
    status: s.status,
    zoomMeetingUrl: s.zoomMeetingUrl,
    courseName: s.courseName ?? null,
    educatorName: s.educatorName ?? 'Unknown Educator',
    learnerNames: attendeesMap.get(s.id) || [],
  }));

  return <AdminCalendarClient sessions={calendarSessions} />;
}
