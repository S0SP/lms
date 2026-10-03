import { type NextRequest } from 'next/server';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';
import { db } from '@/lib/drizzle';
import { googleCalendarTokens, googleCalendarChannels } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { config } from '@/config/unifiedConfig';

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(['owner', 'admin', 'educator']);
  if (error) return error;

  const role = (session!.user as any).role as string;
  const currentUserId = session!.user!.id as string;
  const { searchParams } = new URL(req.url);

  const educatorId = role === 'educator' ? currentUserId : (searchParams.get('educatorId') || currentUserId);

  const [tokenRow] = await db
    .select({
      id: googleCalendarTokens.id,
      calendarId: googleCalendarTokens.calendarId,
      connectedAt: googleCalendarTokens.connectedAt,
      expiry: googleCalendarTokens.expiry,
    })
    .from(googleCalendarTokens)
    .where(eq(googleCalendarTokens.educatorId, educatorId))
    .limit(1);

  const [channelRow] = await db
    .select({
      channelId: googleCalendarChannels.channelId,
      expiry: googleCalendarChannels.expiry,
      createdAt: googleCalendarChannels.createdAt,
    })
    .from(googleCalendarChannels)
    .where(eq(googleCalendarChannels.educatorId, educatorId))
    .limit(1);

  return apiSuccess({
    isIntegrationEnabled: config.googleCalendar.enabled,
    connected: Boolean(tokenRow),
    calendarId: tokenRow?.calendarId || null,
    connectedAt: tokenRow?.connectedAt || null,
    watchChannelActive: Boolean(channelRow && new Date(channelRow.expiry).getTime() > Date.now()),
    watchChannelExpiry: channelRow?.expiry || null,
  });
}
