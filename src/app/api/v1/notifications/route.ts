import { type NextRequest } from 'next/server';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';
import { db } from '@/lib/drizzle';
import { notificationLog } from '@/db/schema/notifications';
import { and, desc, eq, isNull } from 'drizzle-orm';

// GET /api/v1/notifications — fetch in-app notifications for the current user
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(['owner', 'admin', 'educator', 'learner', 'parent']);
  if (error) return error;

  const userId = session!.user!.id as string;
  const { searchParams } = new URL(req.url);
  const unreadOnly = searchParams.get('unread') === 'true';
  const limit = Math.min(Number(searchParams.get('limit') ?? '30'), 50);

  const query = db
    .select()
    .from(notificationLog)
    .where(
      and(
        eq(notificationLog.userId, userId),
        eq(notificationLog.channel, 'in_app'),
        unreadOnly ? isNull(notificationLog.readAt) : undefined,
      ),
    )
    .orderBy(desc(notificationLog.createdAt))
    .limit(limit);

  const items = await query;
  const unreadCount = items.filter((n) => !n.readAt).length;

  return apiSuccess({ items, unreadCount });
}

// PATCH /api/v1/notifications — mark all as read
export async function PATCH(req: NextRequest) {
  const { session, error } = await requireAuth(['owner', 'admin', 'educator', 'learner', 'parent']);
  if (error) return error;

  const userId = session!.user!.id as string;
  const now = new Date();

  await db
    .update(notificationLog)
    .set({ readAt: now })
    .where(
      and(
        eq(notificationLog.userId, userId),
        eq(notificationLog.channel, 'in_app'),
        isNull(notificationLog.readAt),
      ),
    );

  return apiSuccess({ ok: true });
}
