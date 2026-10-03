import { type NextRequest } from 'next/server';
import { db } from '@/lib/drizzle';
import { googleCalendarChannels } from '@/db/schema';
import { lte } from 'drizzle-orm';
import { stopCalendarChannel, watchCalendarEvents } from '@/lib/integrations/googleCalendar';
import { verifyQstashRequest, isQstashEnabled } from '@/lib/integrations/qstash';
import { apiSuccess, apiError } from '@/lib/api';

// POST /api/cron/renew-calendar-channels
// Daily cron job triggered by QStash to renew Google Calendar watch channels before they expire (Google channels expire in max 7 days).
export async function POST(req: NextRequest) {
  // 1. Signature verification if QStash is active
  if (isQstashEnabled()) {
    const rawBody = await req.text();
    const signature = req.headers.get('upstash-signature');
    const isValid = await verifyQstashRequest(signature, rawBody);
    if (!isValid) {
      return apiError('Invalid QStash signature', 401);
    }
  }

  try {
    // Find all channels expiring within the next 24 hours
    const threshold = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const expiringChannels = await db
      .select()
      .from(googleCalendarChannels)
      .where(lte(googleCalendarChannels.expiry, threshold));

    const results = [];

    for (const channel of expiringChannels) {
      try {
        // 1. Stop old channel
        await stopCalendarChannel(channel.channelId, channel.resourceId, channel.educatorId);

        // 2. Establish renewed watch channel
        const renewed = await watchCalendarEvents(channel.educatorId);

        results.push({
          educatorId: channel.educatorId,
          oldChannelId: channel.channelId,
          newChannelId: renewed?.channelId || null,
          status: renewed ? 'renewed' : 'failed',
        });
      } catch (err: any) {
        console.error(`[Renew Channels] Failed to renew channel for educator ${channel.educatorId}:`, err);
        results.push({
          educatorId: channel.educatorId,
          error: err.message,
          status: 'error',
        });
      }
    }

    return apiSuccess({
      checkedAt: new Date().toISOString(),
      channelsRenewed: results.filter((r) => r.status === 'renewed').length,
      totalExpiring: expiringChannels.length,
      details: results,
    });
  } catch (error: any) {
    console.error('[Renew Channels] Unhandled exception:', error);
    return apiError(error.message || 'Failed to renew calendar channels', 500);
  }
}
