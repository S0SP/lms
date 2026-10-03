import { NextRequest } from 'next/server';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';
import { db } from '@/lib/drizzle';
import { notificationPreferences } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

const DEFAULT_PREFERENCES: Record<string, boolean> = {
  courseAnnouncements: true,
  sessionReminders: true,
  directMessages: false,
  browserPush: false,
};

// GET /api/v1/user/notifications
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error || !session?.user?.id) return error || apiError('Unauthorized', 401);

  const userId = session.user.id;

  try {
    const rows = await db
      .select({
        type: notificationPreferences.type,
        enabled: notificationPreferences.enabled,
      })
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId));

    const prefs = { ...DEFAULT_PREFERENCES };
    for (const row of rows) {
      if (row.type in prefs) {
        prefs[row.type] = row.enabled;
      }
    }

    return apiSuccess(prefs);
  } catch (err: any) {
    console.error('Failed to get notification preferences:', err);
    return apiError('Failed to fetch notification preferences', 500);
  }
}

// PATCH /api/v1/user/notifications
export async function PATCH(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error || !session?.user?.id) return error || apiError('Unauthorized', 401);

  const userId = session.user.id;
  const body = await req.json();

  try {
    const validKeys = Object.keys(DEFAULT_PREFERENCES);
    const updates: { key: string; value: boolean }[] = [];

    for (const key of validKeys) {
      if (typeof body[key] === 'boolean') {
        updates.push({ key, value: body[key] });
      }
    }

    await db.transaction(async (tx) => {
      for (const update of updates) {
        const existing = await tx
          .select({ id: notificationPreferences.id })
          .from(notificationPreferences)
          .where(
            and(
              eq(notificationPreferences.userId, userId),
              eq(notificationPreferences.type, update.key)
            )
          )
          .limit(1);

        if (existing.length > 0) {
          await tx
            .update(notificationPreferences)
            .set({
              enabled: update.value,
              updatedAt: new Date(),
            })
            .where(eq(notificationPreferences.id, existing[0].id));
        } else {
          await tx.insert(notificationPreferences).values({
            userId,
            channel: 'in_app',
            type: update.key,
            enabled: update.value,
            updatedAt: new Date(),
          });
        }
      }
    });

    // Return the updated full preferences state
    const currentRows = await db
      .select({
        type: notificationPreferences.type,
        enabled: notificationPreferences.enabled,
      })
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId));

    const result = { ...DEFAULT_PREFERENCES };
    for (const row of currentRows) {
      if (row.type in result) {
        result[row.type] = row.enabled;
      }
    }

    return apiSuccess(result);
  } catch (err: any) {
    console.error('Failed to update notification preferences:', err);
    return apiError('Failed to update notification preferences', 500);
  }
}
