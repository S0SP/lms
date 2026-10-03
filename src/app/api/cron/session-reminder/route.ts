import { type NextRequest } from 'next/server';
import { db } from '@/lib/drizzle';
import { sessions, sessionAttendees, users, notificationLog, sessionReminderJobs } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { sendSessionReminder } from '@/lib/email';
import { apiSuccess, apiError } from '@/lib/api';
import { verifyQstashRequest, isQstashEnabled } from '@/lib/integrations/qstash';

// POST /api/cron/session-reminder
// Triggered by QStash at t-1h and t-10m before each session.
// MUST be signature-verified — only QStash can call this route.
export async function POST(req: NextRequest) {
  // ─── 0. Fail loudly if the receiver is unconfigured ───────────────────────
  if (!isQstashEnabled()) {
    return apiError('QStash is not configured on this deployment', 503);
  }

  // ─── 1. Verify QStash signature ──────────────────────────────────────────
  const rawBody = await req.text();
  const isValid = await verifyQstashRequest(req.headers.get('upstash-signature'), rawBody);

  if (!isValid) {
    return apiError('Invalid QStash signature', 401);
  }

  let payload: { sessionId: string; minutesBefore: number; jobId?: string };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return apiError('Malformed JSON body', 400);
  }

  const { sessionId, minutesBefore, jobId } = payload;
  if (!sessionId || typeof minutesBefore !== 'number') {
    return apiError('sessionId and minutesBefore are required', 400);
  }

  // ─── 2. Load session + attendees ──────────────────────────────────────────
  const [session] = await db
    .select({
      id: sessions.id,
      title: sessions.title,
      topic: sessions.topic,
      status: sessions.status,
      scheduledAt: sessions.scheduledAt,
      zoomMeetingUrl: sessions.zoomMeetingUrl,
    })
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);

  // Skip if session was cancelled or already completed
  if (!session || session.status === 'cancelled' || session.status === 'completed') {
    await markJobSent(jobId);
    return apiSuccess({ skipped: true, reason: session?.status ?? 'not_found' });
  }

  const attendees = await db
    .select({
      learnerId: users.id,
      name: users.name,
      email: users.email,
      // Opt-out model: enabled unless an explicit `false` row exists.
      emailEnabled: sql<boolean>`COALESCE(
        (SELECT np.enabled FROM notification_preferences np
          WHERE np.user_id = ${users.id}
            AND np.type = 'session_reminder'
            AND np.channel = 'email'
          LIMIT 1),
        true
      )`,
    })
    .from(sessionAttendees)
    .innerJoin(users, eq(sessionAttendees.learnerId, users.id))
    .where(eq(sessionAttendees.sessionId, sessionId));

  // ─── 3. Send reminder emails + durable notification log ───────────────────
  const eligible = attendees.filter(
    (a) => a.emailEnabled && !!a.email && a.name && isFutureish(session.scheduledAt, minutesBefore),
  );

  await Promise.allSettled(
    eligible.map(async (attendee) => {
      await sendSessionReminder({
        to: attendee.email!,
        name: attendee.name!,
        sessionTitle: session.title,
        sessionTopic: session.topic,
        scheduledAt: session.scheduledAt,
        zoomUrl: session.zoomMeetingUrl,
        minutesBefore,
      });
      await db.insert(notificationLog).values({
        userId: attendee.learnerId,
        type: 'session_reminder',
        channel: 'email',
        payloadJson: {
          sessionId,
          minutesBefore,
          scheduledAt: session.scheduledAt.toISOString(),
        },
      });
    }),
  );

  await markJobSent(jobId);

  return apiSuccess({
    sent: eligible.length,
    skippedMuted: attendees.length - eligible.length,
  });
}

/** Marks a tracked reminder job as delivered. Never throws. */
async function markJobSent(jobId: string | undefined) {
  if (!jobId) return;
  await db
    .update(sessionReminderJobs)
    .set({ sentAt: new Date() })
    .where(eq(sessionReminderJobs.id, jobId))
    .catch((error) => console.error('[cron] failed to mark job sent:', error));
}

/**
 * A reminder is only worth sending if the session is still in the future.
 * `minutesBefore` gives tolerance for QStash delivery drift.
 */
function isFutureish(scheduledAt: Date, minutesBefore: number): boolean {
  return scheduledAt.getTime() > Date.now() - minutesBefore * 60_000;
}

