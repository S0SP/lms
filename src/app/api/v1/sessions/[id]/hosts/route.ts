import { type NextRequest } from 'next/server';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';
import { db } from '@/lib/drizzle';
import { sessions, users, courses, courseEducators } from '@/db/schema';
import { eq, or, and, ne, lt, gte, desc } from 'drizzle-orm';
import { sessionService } from '@/services/sessionService';

type Params = { params: Promise<{ id: string }> };

// GET /api/v1/sessions/[id]/hosts
export async function GET(req: NextRequest, { params }: Params) {
  const { session: authSession, error } = await requireAuth(['owner', 'admin']);
  if (error) return error;

  const { id } = await params;
  if (!id) return apiError('Session ID is required', 400);

  // 1. Fetch target session
  const targetSession = await sessionService.getSessionById(id);
  if (!targetSession) {
    return apiError('Session not found', 404);
  }

  const sessionStart = new Date(targetSession.scheduledAt);
  const sessionEnd = new Date(sessionStart.getTime() + (targetSession.durationMin || 60) * 60 * 1000);

  // 2. Fetch all educators & admins capable of hosting
  const allHostUsers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl,
      role: users.role,
      isActive: users.isActive,
    })
    .from(users)
    .where(
      and(
        or(eq(users.role, 'educator'), eq(users.role, 'admin'), eq(users.role, 'owner')),
        eq(users.isActive, true)
      )
    )
    .orderBy(users.name);

  // 3. Fetch course educators for this session's course
  let courseEducatorIds = new Set<string>();
  if (targetSession.courseId) {
    const assignedCourseEducators = await db
      .select({ educatorId: courseEducators.educatorId })
      .from(courseEducators)
      .where(eq(courseEducators.courseId, targetSession.courseId));
    courseEducatorIds = new Set(assignedCourseEducators.map((c) => c.educatorId));
  }

  // 4. Check for schedule conflicts across non-cancelled sessions in this time window
  // Candidate sessions: sessions starting within 24 hours prior to sessionEnd and before sessionEnd
  const searchWindowStart = new Date(sessionStart.getTime() - 24 * 60 * 60 * 1000);
  const candidateSessions = await db
    .select({
      id: sessions.id,
      title: sessions.title,
      educatorId: sessions.educatorId,
      scheduledAt: sessions.scheduledAt,
      durationMin: sessions.durationMin,
    })
    .from(sessions)
    .where(
      and(
        ne(sessions.id, id),
        ne(sessions.status, 'cancelled'),
        gte(sessions.scheduledAt, searchWindowStart),
        lt(sessions.scheduledAt, sessionEnd)
      )
    );

  const sessionStartTime = sessionStart.getTime();
  const sessionEndTime = sessionEnd.getTime();

  const conflictMap = new Map<string, { id: string; title: string; scheduledAt: string; durationMin: number }>();
  for (const cs of candidateSessions) {
    if (!cs.educatorId) continue;
    const csStart = new Date(cs.scheduledAt).getTime();
    const csEnd = csStart + (cs.durationMin || 60) * 60 * 1000;

    // Overlapping condition: candidate session starts before current session ends, and ends after current session starts
    const hasOverlap = csStart < sessionEndTime && csEnd > sessionStartTime;
    if (hasOverlap && !conflictMap.has(cs.educatorId)) {
      conflictMap.set(cs.educatorId, {
        id: cs.id,
        title: cs.title,
        scheduledAt: new Date(cs.scheduledAt).toISOString(),
        durationMin: cs.durationMin || 60,
      });
    }
  }

  // 5. Structure host list
  const hosts = allHostUsers.map((u) => {
    const isCurrentHost = u.id === targetSession.educatorId;
    const isCourseEducator = courseEducatorIds.has(u.id);
    const conflict = conflictMap.get(u.id);

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      avatarUrl: u.avatarUrl,
      role: u.role,
      isCurrentHost,
      isCourseEducator,
      hasConflict: Boolean(conflict),
      conflictInfo: conflict || null,
    };
  });

  // Sort: Current Host first, then Course Educators (conflict-free first), then others (conflict-free first)
  hosts.sort((a, b) => {
    if (a.isCurrentHost) return -1;
    if (b.isCurrentHost) return 1;
    if (a.isCourseEducator && !b.isCourseEducator) return -1;
    if (!a.isCourseEducator && b.isCourseEducator) return 1;
    if (!a.hasConflict && b.hasConflict) return -1;
    if (a.hasConflict && !b.hasConflict) return 1;
    return a.name.localeCompare(b.name);
  });

  return apiSuccess({
    session: {
      id: targetSession.id,
      title: targetSession.title,
      topic: targetSession.topic,
      scheduledAt: targetSession.scheduledAt,
      durationMin: targetSession.durationMin,
      courseId: targetSession.courseId,
      courseName: targetSession.courseName,
      currentEducatorId: targetSession.educatorId,
      currentEducatorName: targetSession.educatorName,
    },
    hosts,
  });
}
