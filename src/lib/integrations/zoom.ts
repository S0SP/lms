/**
 * Zoom Server-to-Server OAuth client.
 *
 * Access tokens live 1 hour with no refresh token, so we cache them in memory
 * and re-request on expiry (and on any 401) rather than calling the token
 * endpoint per request.
 *
 * When ZOOM_* credentials are absent every function degrades to a logged no-op
 * so session creation still succeeds in local dev.
 */

import { config } from '@/config/unifiedConfig';
import crypto from 'crypto';

const TOKEN_URL = 'https://zoom.us/oauth/token';
const API_BASE = 'https://api.zoom.us/v2';

/** Refresh this many ms before the documented 3600s expiry. */
const TOKEN_SAFETY_MARGIN_MS = 60_000;

type CachedToken = { accessToken: string; expiresAt: number };

let cachedToken: CachedToken | null = null;
/** De-duplicates concurrent token requests (avoids a thundering herd). */
let inFlight: Promise<string | null> | null = null;

export class ZoomError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ZoomError';
  }
}

export function isZoomEnabled(): boolean {
  return config.zoom.enabled;
}

async function fetchAccessToken(): Promise<string | null> {
  if (!config.zoom.enabled) return null;

  const { accountId, clientId, clientSecret } = config.zoom;
  if (!accountId || !clientId || !clientSecret) return null;

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'account_credentials',
      account_id: accountId,
    }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new ZoomError(`Zoom token request failed: ${res.status} ${detail}`, res.status);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000 - TOKEN_SAFETY_MARGIN_MS,
  };
  return cachedToken.accessToken;
}

async function getAccessToken(): Promise<string | null> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.accessToken;
  if (!inFlight) {
    inFlight = fetchAccessToken().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

async function zoomFetch<T>(path: string, init?: RequestInit & { _retry?: boolean }): Promise<T> {
  if (!config.zoom.enabled) {
    throw new ZoomError('Zoom is not configured', 503);
  }

  const token = await getAccessToken();
  if (!token) throw new ZoomError('Zoom is not configured', 503);

  const { _retry, ...rest } = init ?? {};
  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(rest.headers ?? {}),
    },
    cache: 'no-store',
  });

  // A cached token can be revoked server-side; drop it and retry once.
  if (res.status === 401 && !_retry) {
    cachedToken = null;
    return zoomFetch<T>(path, { ...rest, _retry: true });
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new ZoomError(`Zoom API ${path} failed: ${res.status} ${detail}`, res.status);
  }

  // 204 No Content has no body.
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export type ZoomMeeting = {
  id: number;
  uuid: string;
  host_id: string;
  topic: string;
  start_time: string;
  duration: number;
  timezone?: string;
  join_url: string;
  start_url?: string;
  password?: string;
};

export type CreateMeetingInput = {
  topic: string;
  agenda?: string | null;
  /** ISO 8601. Zoom converts to the account's default timezone. */
  startTime: Date;
  durationMin: number;
  timezone?: string;
  /**
   * Zoom user id or email that owns the meeting. Defaults to the account's
   * primary user when omitted.
   */
  hostUserId?: string;
  /** Learner emails to pre-invite. */
  inviteeEmails?: string[];
};

export type CreateMeetingResult = {
  meetingId: string;
  joinUrl: string;
  startUrl: string | null;
  password: string | null;
} | null;

/**
 * Creates a scheduled Zoom meeting.
 *
 * Returns `null` (rather than throwing) when Zoom is not configured, so the
 * caller can persist a session without a meeting link and the UI degrades to
 * "link available in portal".
 */
export async function createMeeting(input: CreateMeetingInput): Promise<CreateMeetingResult> {
  if (!config.zoom.enabled) {
    console.warn('[zoom] not configured — skipping meeting creation for', input.topic);
    return null;
  }

  try {
    const host = input.hostUserId ? `/users/${encodeURIComponent(input.hostUserId)}` : '/users/me';

    const meeting = await zoomFetch<ZoomMeeting>(`${host}/meetings`, {
      method: 'POST',
      body: JSON.stringify({
        topic: input.topic,
        agenda: input.agenda ?? undefined,
        type: 2, // scheduled meeting
        start_time: input.startTime.toISOString(),
        duration: input.durationMin,
        timezone: input.timezone ?? 'UTC',
        settings: {
          // Learners join from the portal; no passcode prompt.
          join_before_host: false,
          waiting_room: true,
          mute_upon_entry: true,
          approval_type: 2, // no registration required
          meeting_invitees: (input.inviteeEmails ?? []).map((email) => ({ email })),
        },
      }),
    });

    return {
      meetingId: String(meeting.id),
      joinUrl: meeting.join_url,
      startUrl: meeting.start_url ?? null,
      password: meeting.password ?? null,
    };
  } catch (error) {
    // A missing meeting must never block session creation.
    console.error('[zoom] createMeeting failed:', error);
    return null;
  }
}

/** Cancels a meeting. No-op when the id is absent or Zoom is not configured. */
export async function cancelMeeting(meetingId: string | null | undefined): Promise<void> {
  if (!meetingId || !config.zoom.enabled) return;
  try {
    await zoomFetch<void>(`/meetings/${encodeURIComponent(meetingId)}`, { method: 'DELETE' });
  } catch (error) {
    // Already-deleted meetings 404; that is a success from our perspective.
    if (error instanceof ZoomError && error.status === 404) return;
    console.error('[zoom] cancelMeeting failed:', error);
  }
}

/** Resolves the Zoom user id for an email, used to link educator_profiles. */
export async function findUserByEmail(email: string): Promise<{ id: string; name: string } | null> {
  if (!config.zoom.enabled) return null;
  try {
    const user = await zoomFetch<{ id: string; first_name: string; last_name: string; email: string }>(
      `/users/${encodeURIComponent(email)}`,
    );
    return { id: user.id, name: `${user.first_name} ${user.last_name}`.trim() };
  } catch (error) {
    console.error('[zoom] findUserByEmail failed:', error);
    return null;
  }
}

export type UpdateMeetingInput = {
  topic?: string;
  agenda?: string | null;
  startTime?: Date;
  durationMin?: number;
  timezone?: string;
};

/**
 * Updates an existing scheduled Zoom meeting (e.g. on session reschedule).
 */
export async function updateMeeting(
  meetingId: string | null | undefined,
  input: UpdateMeetingInput,
): Promise<boolean> {
  if (!meetingId || !config.zoom.enabled) return false;
  try {
    const body: Record<string, any> = {};
    if (input.topic) body.topic = input.topic;
    if (input.agenda !== undefined) body.agenda = input.agenda;
    if (input.startTime) body.start_time = input.startTime.toISOString();
    if (input.durationMin) body.duration = input.durationMin;
    if (input.timezone) body.timezone = input.timezone;

    await zoomFetch<void>(`/meetings/${encodeURIComponent(meetingId)}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    return true;
  } catch (error) {
    console.error('[zoom] updateMeeting failed:', error);
    return false;
  }
}

/**
 * Retrieves details for a specific Zoom meeting.
 */
export async function getMeeting(meetingId: string): Promise<ZoomMeeting | null> {
  if (!config.zoom.enabled) return null;
  try {
    return await zoomFetch<ZoomMeeting>(`/meetings/${encodeURIComponent(meetingId)}`, {
      method: 'GET',
    });
  } catch (error) {
    console.error('[zoom] getMeeting failed:', error);
    return null;
  }
}

export type ZoomRecordingFile = {
  id: string;
  meeting_id: string;
  recording_start: string;
  recording_end: string;
  file_type: string;
  file_size: number;
  play_url: string;
  download_url: string;
  status: string;
};

export type ZoomRecordingsResponse = {
  uuid: string;
  id: number;
  account_id: string;
  host_id: string;
  topic: string;
  start_time: string;
  duration: number;
  total_size: number;
  recording_count: number;
  recording_files: ZoomRecordingFile[];
};

/**
 * Retrieves cloud recording assets for a completed meeting.
 */
export async function getMeetingRecordings(
  meetingId: string,
): Promise<ZoomRecordingsResponse | null> {
  if (!config.zoom.enabled) return null;
  try {
    return await zoomFetch<ZoomRecordingsResponse>(
      `/meetings/${encodeURIComponent(meetingId)}/recordings`,
      { method: 'GET' },
    );
  } catch (error) {
    console.error('[zoom] getMeetingRecordings failed:', error);
    return null;
  }
}

/**
 * Generates HMAC-SHA256 signature for client-side Zoom Meeting SDK / Video SDK embedded web embeds.
 */
export function generateMeetingSdkSignature(params: {
  meetingNumber: string;
  role: 0 | 1;
}): string | null {
  const sdkKey = config.zoom.clientId;
  const sdkSecret = config.zoom.clientSecret;
  if (!sdkKey || !sdkSecret) return null;

  const iat = Math.round(new Date().getTime() / 1000) - 30;
  const exp = iat + 60 * 60 * 2;
  const oHeader = { alg: 'HS256', typ: 'JWT' };
  const oPayload = {
    appKey: sdkKey,
    sdkKey: sdkKey,
    mn: params.meetingNumber,
    role: params.role,
    iat: iat,
    exp: exp,
    tokenExp: exp,
  };

  const sHeader = Buffer.from(JSON.stringify(oHeader)).toString('base64url');
  const sPayload = Buffer.from(JSON.stringify(oPayload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', sdkSecret)
    .update(`${sHeader}.${sPayload}`)
    .digest('base64url');

  return `${sHeader}.${sPayload}.${signature}`;
}

