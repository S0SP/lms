import { type NextRequest } from 'next/server';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';
import { db } from '@/lib/drizzle';
import { sessionConflicts, sessions } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { sessionService } from '@/services/sessionService';

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: RouteParams) {
  const { session, error } = await requireAuth(['educator', 'owner', 'admin']);
  if (error) return error;

  const { id: sessionId } = await params;
  const currentUserId = session!.user!.id as string;

  const sess = await sessionService.getSessionById(sessionId);
  if (!sess) return apiError('Session not found', 404);

  // If educator, verify educator is assigned to session
  const userRole = (session!.user as any).role;
  if (userRole === 'educator' && sess.educatorId !== currentUserId) {
    return apiError('Forbidden: you do not have permission to manage this session', 403);
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const { conflictId, action = 'dismiss', shiftMinutes, newScheduledAt } = body;

  try {
    // 1. If rescheduling, update session scheduled time
    if (action === 'reschedule') {
      let targetTime: Date | null = null;
      if (newScheduledAt) {
        targetTime = new Date(newScheduledAt);
      } else if (shiftMinutes && typeof shiftMinutes === 'number') {
        targetTime = new Date(new Date(sess.scheduledAt).getTime() + shiftMinutes * 60_000);
      }

      if (!targetTime || isNaN(targetTime.getTime())) {
        return apiError('Valid newScheduledAt or shiftMinutes is required for reschedule action', 400);
      }

      await sessionService.updateSession(sessionId, {
        scheduledAt: targetTime,
      });
    }

    // 2. Mark conflict as resolved in sessionConflicts table
    if (conflictId) {
      await db
        .update(sessionConflicts)
        .set({
          resolvedAt: new Date(),
          resolvedBy: currentUserId,
        })
        .where(eq(sessionConflicts.id, conflictId));
    } else {
      await db
        .update(sessionConflicts)
        .set({
          resolvedAt: new Date(),
          resolvedBy: currentUserId,
        })
        .where(
          and(
            eq(sessionConflicts.sessionId, sessionId),
            isNull(sessionConflicts.resolvedAt)
          )
        );
    }

    return apiSuccess({
      message: action === 'reschedule' ? 'Session rescheduled and conflict marked resolved' : 'Conflict dismissed and marked resolved',
      sessionId,
      action,
    });
  } catch (err: any) {
    console.error('[resolve-conflict/POST] Error:', err);
    return apiError(err?.message || 'Failed to resolve conflict', 500);
  }
}
