import { type NextRequest } from 'next/server';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';
import { db } from '@/lib/drizzle';
import { googleCalendarTokens } from '@/db/schema';
import { encryptToken } from '@/lib/integrations/googleCalendar';

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth(['owner', 'admin', 'educator']);
  if (error) return error;

  const role = (session!.user as any).role as string;
  const currentUserId = session!.user!.id as string;
  const { searchParams } = new URL(req.url);

  const educatorId = role === 'educator' ? currentUserId : (searchParams.get('educatorId') || currentUserId);

  try {
    const now = new Date();
    const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await db
      .insert(googleCalendarTokens)
      .values({
        educatorId,
        accessTokenEnc: encryptToken('dev_mock_access_token'),
        refreshTokenEnc: encryptToken('dev_mock_refresh_token'),
        calendarId: 'primary (dev simulated)',
        expiry,
        connectedAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [googleCalendarTokens.educatorId],
        set: {
          accessTokenEnc: encryptToken('dev_mock_access_token'),
          refreshTokenEnc: encryptToken('dev_mock_refresh_token'),
          calendarId: 'primary (dev simulated)',
          expiry,
          updatedAt: now,
        },
      });

    return apiSuccess({ connected: true, isDevMock: true });
  } catch (err: any) {
    return apiError(err.message || 'Failed to simulate dev calendar connection', 500);
  }
}
