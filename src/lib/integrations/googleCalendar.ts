/**
 * Google Calendar API v3 integration for 2-way educator sync, channel watching, and event management.
 * Conforms to Google Calendar v3 REST API specifications:
 * - Events (insert, patch, delete, get, list, watch)
 * - Channels (stop)
 * - Freebusy (query)
 * - OAuth 2.0 (token refresh, AES-256-GCM encryption at rest)
 */

import { config } from '@/config/unifiedConfig';
import { db } from '@/lib/drizzle';
import { googleCalendarTokens, googleCalendarChannels, GoogleCalendarChannel } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

const CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
];

// ─── AES-256-GCM Token Encryption ─────────────────────────────────────────────

function getEncryptionKey(): Buffer {
  const secret = config.auth.authSecret || 'default-fallback-dev-secret-32-chars!!';
  return crypto.createHash('sha256').update(secret).digest();
}

export function encryptToken(token: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

export function decryptToken(encryptedStr: string): string {
  const [ivHex, tagHex, encryptedData] = encryptedStr.split(':');
  if (!ivHex || !tagHex || !encryptedData) {
    throw new Error('Invalid encrypted token format');
  }
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    getEncryptionKey(),
    Buffer.from(ivHex, 'hex'),
  );
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// ─── OAuth2 Flow Helpers ──────────────────────────────────────────────────────

/**
 * Builds Google OAuth 2.0 consent URL for an educator connecting their Google Calendar.
 */
export function getCalendarAuthUrl(educatorId: string, customRedirectUri?: string): string {
  const clientId = config.googleCalendar.clientId;
  if (!clientId) {
    throw new Error('Google Calendar client ID is not configured');
  }

  const redirectUri = customRedirectUri || config.googleCalendar.redirectUri;
  const statePayload = Buffer.from(
    JSON.stringify({ educatorId, timestamp: Date.now() }),
  ).toString('base64url');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: CALENDAR_SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state: statePayload,
  });

  return `${AUTH_URL}?${params.toString()}`;
}

/**
 * Exchanges authorization code for tokens, encrypts them, and persists to google_calendar_tokens.
 */
export async function exchangeCalendarAuthCode(
  code: string,
  educatorId: string,
  customRedirectUri?: string,
): Promise<{ success: boolean; error?: string }> {
  const clientId = config.googleCalendar.clientId;
  const clientSecret = config.googleCalendar.clientSecret;
  const redirectUri = customRedirectUri || config.googleCalendar.redirectUri;

  if (!clientId || !clientSecret) {
    return { success: false, error: 'Google Calendar credentials are not configured' };
  }

  try {
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error('[Google Calendar] Token exchange failed:', res.status, errText);
      return { success: false, error: `Token exchange failed: ${res.status}` };
    }

    const data = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };

    if (!data.refresh_token) {
      // In case Google did not return a refresh token (if user re-consented without prompt=consent)
      console.warn('[Google Calendar] No refresh_token returned in exchange');
    }

    const expiry = new Date(Date.now() + data.expires_in * 1000);
    const accessTokenEnc = encryptToken(data.access_token);
    const refreshTokenEnc = data.refresh_token ? encryptToken(data.refresh_token) : null;

    // Check existing
    const [existing] = await db
      .select()
      .from(googleCalendarTokens)
      .where(eq(googleCalendarTokens.educatorId, educatorId))
      .limit(1);

    if (existing) {
      await db
        .update(googleCalendarTokens)
        .set({
          accessTokenEnc,
          refreshTokenEnc: refreshTokenEnc || existing.refreshTokenEnc,
          expiry,
          updatedAt: new Date(),
        })
        .where(eq(googleCalendarTokens.educatorId, educatorId));
    } else {
      if (!refreshTokenEnc) {
        return { success: false, error: 'Refresh token was not provided by Google' };
      }
      await db.insert(googleCalendarTokens).values({
        educatorId,
        accessTokenEnc,
        refreshTokenEnc,
        calendarId: 'primary',
        expiry,
      });
    }

    // Set up watch channel automatically
    await watchCalendarEvents(educatorId).catch((err) => {
      console.error('[Google Calendar] Auto watch channel setup error:', err);
    });

    return { success: true };
  } catch (error: any) {
    console.error('[Google Calendar] exchangeCalendarAuthCode exception:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

// ─── Token Lifecycle & Refresh ────────────────────────────────────────────────

export async function getValidAccessToken(educatorId: string): Promise<string | null> {
  if (!config.googleCalendar.enabled) return null;

  const [row] = await db
    .select()
    .from(googleCalendarTokens)
    .where(eq(googleCalendarTokens.educatorId, educatorId))
    .limit(1);

  if (!row) return null;

  const now = Date.now();
  const expiryMs = row.expiry ? new Date(row.expiry).getTime() : 0;
  const isExpiringSoon = !row.expiry || expiryMs - now < 5 * 60 * 1000;

  if (!isExpiringSoon) {
    try {
      return decryptToken(row.accessTokenEnc);
    } catch {
      // If decryption fails, proceed to refresh
    }
  }

  // Refresh token
  try {
    const refreshToken = decryptToken(row.refreshTokenEnc);
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.googleCalendar.clientId!,
        client_secret: config.googleCalendar.clientSecret!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!res.ok) {
      console.error('[Google Calendar] Token refresh failed with status:', res.status);
      return null;
    }

    const data = (await res.json()) as { access_token: string; expires_in: number };
    const newAccessToken = data.access_token;
    const newExpiry = new Date(Date.now() + data.expires_in * 1000);

    await db
      .update(googleCalendarTokens)
      .set({
        accessTokenEnc: encryptToken(newAccessToken),
        expiry: newExpiry,
        updatedAt: new Date(),
      })
      .where(eq(googleCalendarTokens.educatorId, educatorId));

    return newAccessToken;
  } catch (error) {
    console.error('[Google Calendar] Error refreshing token:', error);
    return null;
  }
}

// ─── Channels & Push Notifications (v3 Channels.stop & Events.watch) ─────────

/**
 * Initiates a push notification watch channel for an educator's primary calendar.
 * Conforms to Google Calendar API v3 `events.watch`.
 */
export async function watchCalendarEvents(
  educatorId: string,
  webhookUrl?: string,
  ttlSeconds: number = 604800, // 7 days (Google's max)
): Promise<GoogleCalendarChannel | null> {
  const token = await getValidAccessToken(educatorId);
  if (!token) return null;

  const [calToken] = await db
    .select({ calendarId: googleCalendarTokens.calendarId })
    .from(googleCalendarTokens)
    .where(eq(googleCalendarTokens.educatorId, educatorId))
    .limit(1);

  const calendarId = calToken?.calendarId || 'primary';
  const targetWebhookUrl =
    webhookUrl ||
    `${config.appUrl}/api/v1/webhooks/calendar`;

  const channelId = crypto.randomUUID();
  const tokenUuid = crypto.randomUUID();

  try {
    const res = await fetch(
      `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/watch`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: channelId,
          type: 'web_hook',
          address: targetWebhookUrl,
          token: tokenUuid,
          params: {
            ttl: String(ttlSeconds),
          },
        }),
      },
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error(`[Google Calendar] watch failed ${res.status}: ${errText}`);
      return null;
    }

    const watchData = (await res.json()) as {
      id: string;
      resourceId: string;
      expiration: string;
    };

    const expiry = new Date(Number(watchData.expiration) || Date.now() + ttlSeconds * 1000);

    const [channel] = await db
      .insert(googleCalendarChannels)
      .values({
        educatorId,
        channelId: watchData.id,
        resourceId: watchData.resourceId,
        tokenUuid,
        calendarId,
        expiry,
      })
      .returning();

    return channel;
  } catch (error) {
    console.error('[Google Calendar] watchCalendarEvents exception:', error);
    return null;
  }
}

/**
 * Stops watching changes through a channel.
 * Conforms to Google Calendar API v3 `channels.stop`.
 */
export async function stopCalendarChannel(
  channelId: string,
  resourceId: string,
  educatorId?: string,
): Promise<boolean> {
  let token: string | null = null;
  if (educatorId) {
    token = await getValidAccessToken(educatorId);
  }

  // If no specific educator token, try to find one
  if (!token) {
    const [chan] = await db
      .select({ educatorId: googleCalendarChannels.educatorId })
      .from(googleCalendarChannels)
      .where(eq(googleCalendarChannels.channelId, channelId))
      .limit(1);
    if (chan?.educatorId) {
      token = await getValidAccessToken(chan.educatorId);
    }
  }

  try {
    if (token) {
      await fetch(`${CALENDAR_API_BASE}/channels/stop`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: channelId,
          resourceId,
        }),
      });
    }

    // Remove channel from database
    await db.delete(googleCalendarChannels).where(eq(googleCalendarChannels.channelId, channelId));
    return true;
  } catch (error) {
    console.error('[Google Calendar] stopCalendarChannel error:', error);
    return false;
  }
}

// ─── Freebusy Query (v3 Freebusy.query) ────────────────────────────────────────

export interface FreeBusySlot {
  start: string;
  end: string;
}

/**
 * Queries free/busy blocks for an educator within a given time range.
 * Conforms to Google Calendar API v3 `freebusy.query`.
 */
export async function queryFreeBusy(
  educatorId: string,
  timeMin: Date,
  timeMax: Date,
): Promise<FreeBusySlot[]> {
  const token = await getValidAccessToken(educatorId);
  if (!token) return [];

  const [calToken] = await db
    .select({ calendarId: googleCalendarTokens.calendarId })
    .from(googleCalendarTokens)
    .where(eq(googleCalendarTokens.educatorId, educatorId))
    .limit(1);

  const calendarId = calToken?.calendarId || 'primary';

  try {
    const res = await fetch(`${CALENDAR_API_BASE}/freeBusy`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        items: [{ id: calendarId }],
      }),
    });

    if (!res.ok) {
      console.error('[Google Calendar] freebusy query failed with status:', res.status);
      return [];
    }

    const data = await res.json();
    const busySlots = data.calendars?.[calendarId]?.busy || [];
    return busySlots as FreeBusySlot[];
  } catch (error) {
    console.error('[Google Calendar] queryFreeBusy exception:', error);
    return [];
  }
}

// ─── Calendar Event Operations (v3 Events.insert, patch, delete, get, list) ───

export interface CalendarEventInput {
  summary: string;
  description?: string | null;
  startTime: Date;
  endTime: Date;
  attendeeEmails?: string[];
  zoomJoinUrl?: string | null;
  timeZone?: string;
}

export async function createCalendarEvent(
  educatorId: string,
  input: CalendarEventInput,
): Promise<{ eventId: string; htmlLink: string } | null> {
  const token = await getValidAccessToken(educatorId);
  if (!token) return null;

  const [calToken] = await db
    .select({ calendarId: googleCalendarTokens.calendarId })
    .from(googleCalendarTokens)
    .where(eq(googleCalendarTokens.educatorId, educatorId))
    .limit(1);

  const calendarId = calToken?.calendarId || 'primary';
  const tz = input.timeZone || 'Asia/Kolkata';

  const body: any = {
    summary: input.summary,
    description: [
      input.description || '',
      input.zoomJoinUrl ? `\nJoin Zoom Meeting: ${input.zoomJoinUrl}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
    start: {
      dateTime: input.startTime.toISOString(),
      timeZone: tz,
    },
    end: {
      dateTime: input.endTime.toISOString(),
      timeZone: tz,
    },
    attendees: (input.attendeeEmails || []).map((email) => ({ email })),
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 10 },
        { method: 'email', minutes: 60 },
      ],
    },
  };

  try {
    const res = await fetch(
      `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      },
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error(`[Google Calendar] createEvent failed ${res.status}: ${errText}`);
      return null;
    }

    const created = await res.json();
    return {
      eventId: created.id,
      htmlLink: created.htmlLink,
    };
  } catch (error) {
    console.error('[Google Calendar] createCalendarEvent exception:', error);
    return null;
  }
}

/**
 * Updates an event on the educator's calendar using Google Calendar v3 PATCH semantics.
 */
export async function updateCalendarEvent(
  educatorId: string,
  eventId: string,
  input: Partial<CalendarEventInput>,
): Promise<boolean> {
  const token = await getValidAccessToken(educatorId);
  if (!token) return false;

  const [calToken] = await db
    .select({ calendarId: googleCalendarTokens.calendarId })
    .from(googleCalendarTokens)
    .where(eq(googleCalendarTokens.educatorId, educatorId))
    .limit(1);

  const calendarId = calToken?.calendarId || 'primary';

  const patchBody: any = {};
  if (input.summary) patchBody.summary = input.summary;
  if (input.description !== undefined) {
    patchBody.description = [
      input.description || '',
      input.zoomJoinUrl ? `\nJoin Zoom Meeting: ${input.zoomJoinUrl}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  }
  if (input.startTime) patchBody.start = { dateTime: input.startTime.toISOString() };
  if (input.endTime) patchBody.end = { dateTime: input.endTime.toISOString() };
  if (input.attendeeEmails) {
    patchBody.attendees = input.attendeeEmails.map((email) => ({ email }));
  }

  try {
    const res = await fetch(
      `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(patchBody),
      },
    );
    return res.ok;
  } catch (error) {
    console.error('[Google Calendar] updateCalendarEvent exception:', error);
    return false;
  }
}

/**
 * Deletes an event from the educator's calendar.
 */
export async function deleteCalendarEvent(educatorId: string, eventId: string): Promise<boolean> {
  const token = await getValidAccessToken(educatorId);
  if (!token) return false;

  const [calToken] = await db
    .select({ calendarId: googleCalendarTokens.calendarId })
    .from(googleCalendarTokens)
    .where(eq(googleCalendarTokens.educatorId, educatorId))
    .limit(1);

  const calendarId = calToken?.calendarId || 'primary';

  try {
    const res = await fetch(
      `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    return res.ok || res.status === 404;
  } catch (error) {
    console.error('[Google Calendar] deleteCalendarEvent exception:', error);
    return false;
  }
}

/**
 * Fetches event details from Google Calendar.
 */
export async function getCalendarEvent(educatorId: string, eventId: string): Promise<any | null> {
  const token = await getValidAccessToken(educatorId);
  if (!token) return null;

  const [calToken] = await db
    .select({ calendarId: googleCalendarTokens.calendarId })
    .from(googleCalendarTokens)
    .where(eq(googleCalendarTokens.educatorId, educatorId))
    .limit(1);

  const calendarId = calToken?.calendarId || 'primary';

  try {
    const res = await fetch(
      `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error('[Google Calendar] getCalendarEvent exception:', error);
    return null;
  }
}

/**
 * Lists events on the educator's calendar within a time range.
 */
export async function listCalendarEvents(
  educatorId: string,
  params: { timeMin?: Date; timeMax?: Date; maxResults?: number },
): Promise<any[]> {
  const token = await getValidAccessToken(educatorId);
  if (!token) return [];

  const [calToken] = await db
    .select({ calendarId: googleCalendarTokens.calendarId })
    .from(googleCalendarTokens)
    .where(eq(googleCalendarTokens.educatorId, educatorId))
    .limit(1);

  const calendarId = calToken?.calendarId || 'primary';

  const queryParams = new URLSearchParams({
    singleEvents: 'true',
    orderBy: 'startTime',
  });
  if (params.timeMin) queryParams.set('timeMin', params.timeMin.toISOString());
  if (params.timeMax) queryParams.set('timeMax', params.timeMax.toISOString());
  if (params.maxResults) queryParams.set('maxResults', String(params.maxResults));

  try {
    const res = await fetch(
      `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events?${queryParams.toString()}`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.items || [];
  } catch (error) {
    console.error('[Google Calendar] listCalendarEvents exception:', error);
    return [];
  }
}

/**
 * Disconnects Google Calendar for an educator: stops active watch channels and purges tokens.
 */
export async function disconnectCalendar(educatorId: string): Promise<boolean> {
  try {
    const channels = await db
      .select()
      .from(googleCalendarChannels)
      .where(eq(googleCalendarChannels.educatorId, educatorId));

    for (const ch of channels) {
      await stopCalendarChannel(ch.channelId, ch.resourceId, educatorId);
    }

    await db.delete(googleCalendarTokens).where(eq(googleCalendarTokens.educatorId, educatorId));
    return true;
  } catch (error) {
    console.error('[Google Calendar] disconnectCalendar error:', error);
    return false;
  }
}
