import { type NextRequest } from 'next/server';
import { db } from '@/lib/drizzle';
import { googleCalendarChannels } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const channelId = req.headers.get('x-goog-channel-id');
    const tokenUuid = req.headers.get('x-goog-channel-token');
    const resourceState = req.headers.get('x-goog-resource-state');

    if (!channelId) {
      return new Response('Missing channel id', { status: 400 });
    }

    // Verify channel and token in database
    const [channel] = await db
      .select({
        id: googleCalendarChannels.id,
        educatorId: googleCalendarChannels.educatorId,
        tokenUuid: googleCalendarChannels.tokenUuid,
      })
      .from(googleCalendarChannels)
      .where(eq(googleCalendarChannels.channelId, channelId))
      .limit(1);

    if (channel && tokenUuid && channel.tokenUuid !== tokenUuid) {
      return new Response('Invalid channel token', { status: 401 });
    }

    if (resourceState === 'sync') {
      return new Response('Sync OK', { status: 200 });
    }

    if (resourceState === 'exists') {
      // Future incremental sync hook with Google Calendar API
      if (channel) {
        console.log(`[Google Calendar] Push notification received for educator: ${channel.educatorId}`);
      }
    }

    return new Response('OK', { status: 200 });
  } catch (error: any) {
    console.error('Calendar Webhook Error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
