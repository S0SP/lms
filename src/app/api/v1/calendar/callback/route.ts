import { type NextRequest, NextResponse } from 'next/server';
import { exchangeCalendarAuthCode } from '@/lib/integrations/googleCalendar';
import { config } from '@/config/unifiedConfig';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const redirectBase = `${config.appUrl}/educator/calendar`;

  if (error || !code || !state) {
    console.error('[Google Calendar Callback] Authorization failed or denied:', error);
    return NextResponse.redirect(`${redirectBase}?error=${encodeURIComponent(error || 'missing_code')}`);
  }

  try {
    const parsedState = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
    const educatorId = parsedState.educatorId;

    if (!educatorId) {
      return NextResponse.redirect(`${redirectBase}?error=invalid_state`);
    }

    const redirectUri = config.googleCalendar.redirectUri || `${req.nextUrl.origin}/api/v1/calendar/callback`;
    const exchange = await exchangeCalendarAuthCode(code, educatorId, redirectUri);
    if (!exchange.success) {
      return NextResponse.redirect(`${redirectBase}?error=${encodeURIComponent(exchange.error || 'token_exchange_failed')}`);
    }

    return NextResponse.redirect(`${redirectBase}?connected=true`);
  } catch (err: any) {
    console.error('[Google Calendar Callback] Exception:', err);
    return NextResponse.redirect(`${redirectBase}?error=callback_exception`);
  }
}
