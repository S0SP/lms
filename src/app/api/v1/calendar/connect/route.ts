import { type NextRequest, NextResponse } from 'next/server';
import { requireAuth, apiError } from '@/lib/api';
import { getCalendarAuthUrl } from '@/lib/integrations/googleCalendar';
import { config } from '@/config/unifiedConfig';

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(['owner', 'admin', 'educator']);
  if (error) return error;

  if (!config.googleCalendar.enabled) {
    return apiError('Google Calendar integration is not configured on this server', 503);
  }

  const role = (session!.user as any).role as string;
  const currentUserId = session!.user!.id as string;
  const { searchParams } = new URL(req.url);

  const educatorId = role === 'educator' ? currentUserId : (searchParams.get('educatorId') || currentUserId);

  try {
    const redirectUri = config.googleCalendar.redirectUri || `${req.nextUrl.origin}/api/v1/calendar/callback`;
    const authUrl = getCalendarAuthUrl(educatorId, redirectUri);
    return NextResponse.redirect(authUrl);
  } catch (err: any) {
    return apiError(err.message || 'Failed to generate calendar authorization URL', 500);
  }
}

