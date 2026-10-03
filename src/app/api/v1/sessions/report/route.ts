import { type NextRequest, NextResponse } from 'next/server';
import { requireAuth, apiError } from '@/lib/api';
import { db } from '@/lib/drizzle';
import { sessions, courses, users, sessionAttendees } from '@/db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

// GET /api/v1/sessions/report?courseId=...&range=this_month
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(['owner', 'admin', 'educator']);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get('courseId');
  const range = searchParams.get('range') || 'this_month';
  const customFrom = searchParams.get('from');
  const customTo = searchParams.get('to');

  const now = new Date();
  let fromDate = new Date();
  let toDate = new Date();

  if (range === 'this_month') {
    fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
    toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  } else if (range === 'last_month') {
    fromDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    toDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  } else if (range === 'last_7_days') {
    fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (range === 'last_30_days') {
    fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  } else if (range === 'last_90_days') {
    fromDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  } else if (customFrom && customTo) {
    fromDate = new Date(customFrom);
    toDate = new Date(customTo);
  } else {
    fromDate = new Date(0); // All time
  }

  const conditions = [
    gte(sessions.scheduledAt, fromDate),
    lte(sessions.scheduledAt, toDate),
  ];

  if (courseId) {
    conditions.push(eq(sessions.courseId, courseId));
  }

  const sessionRecords = await db
    .select({
      id: sessions.id,
      title: sessions.title,
      topic: sessions.topic,
      scheduledAt: sessions.scheduledAt,
      durationMin: sessions.durationMin,
      status: sessions.status,
      creditsConsumed: sessions.creditsConsumed,
      courseName: courses.name,
      educatorName: users.name,
      educatorEmail: users.email,
    })
    .from(sessions)
    .innerJoin(courses, eq(sessions.courseId, courses.id))
    .innerJoin(users, eq(sessions.educatorId, users.id))
    .where(and(...conditions))
    .orderBy(desc(sessions.scheduledAt));

  // Build CSV
  const headers = [
    'Session ID',
    'Course Name',
    'Session Title',
    'Topic',
    'Scheduled At (UTC)',
    'Duration (mins)',
    'Status',
    'Credits Consumed',
    'Educator Name',
    'Educator Email',
  ];

  const rows = sessionRecords.map((s) => [
    s.id,
    `"${(s.courseName || '').replace(/"/g, '""')}"`,
    `"${(s.title || '').replace(/"/g, '""')}"`,
    `"${(s.topic || '').replace(/"/g, '""')}"`,
    new Date(s.scheduledAt).toISOString(),
    s.durationMin,
    s.status,
    s.creditsConsumed || '1.0',
    `"${(s.educatorName || '').replace(/"/g, '""')}"`,
    s.educatorEmail || '',
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="sessions-report-${range}-${Date.now()}.csv"`,
    },
  });
}
