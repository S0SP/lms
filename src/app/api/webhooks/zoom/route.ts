import { type NextRequest } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/drizzle';
import { sessions, zoomAttendance, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { apiSuccess, apiError } from '@/lib/api';

// ─── POST /api/webhooks/zoom ─────────────────────────────────────────────────
// Zoom Server-to-Server OAuth webhook
// MUST respond in < 3 seconds. Heavy logic dispatched to QStash.
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-zm-signature') ?? '';
  const timestamp = req.headers.get('x-zm-request-timestamp') ?? '';

  const webhookSecret =
    process.env.ZOOM_WEBHOOK_SECRET ||
    process.env.ZOOM_WEBHOOK_SECRET_TOKEN ||
    '';

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch (parseErr) {
    return apiError('Invalid JSON payload', 400);
  }

  const event = payload?.event as string;

  // ─── 1. URL validation handshake (Zoom CRC challenge) ─────────────────────
  // Zoom sends this when adding or verifying the endpoint in Zoom Marketplace.
  // Must return HTTP 200 with encryptedToken within 3 seconds.
  if (event === 'endpoint.url_validation') {
    const plainToken = payload?.payload?.plainToken || '';
    const secret = webhookSecret || 'plain_secret';
    const hash = crypto
      .createHmac('sha256', secret)
      .update(plainToken)
      .digest('hex');

    console.log('[Zoom Webhook] Successfully validated URL challenge token with Zoom Marketplace');
    return Response.json({
      plainToken,
      encryptedToken: hash,
    });
  }

  // ─── 2. HMAC-SHA256 signature verification for events ─────────────────────
  if (webhookSecret) {
    const message = `v0:${timestamp}:${rawBody}`;
    const expected = `v0=${crypto
      .createHmac('sha256', webhookSecret)
      .update(message)
      .digest('hex')}`;

    if (expected !== signature) {
      console.warn('[Zoom Webhook] Signature verification failed. Check ZOOM_WEBHOOK_SECRET / ZOOM_WEBHOOK_SECRET_TOKEN.');
      return apiError('Invalid Zoom webhook signature', 401);
    }
  } else {
    console.warn('[Zoom Webhook] ZOOM_WEBHOOK_SECRET not configured, running in local/test mode');
  }

  // ─── 3. Participant joined/left events ────────────────────────────────────
  if (
    event === 'meeting.participant_joined' ||
    event === 'meeting.participant_left'
  ) {
    const { id: zoomMeetingId, participant } = payload.payload.object;

    // Find the LMS session by zoom meeting ID
    const [lmsSession] = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(eq(sessions.zoomMeetingId, String(zoomMeetingId)))
      .limit(1);

    if (!lmsSession) {
      // Unknown meeting — acknowledge and ignore
      return Response.json({ ok: true });
    }

    // Try to match participant to a user by email
    const [matchedUser] = participant.email
      ? await db
          .select({ id: users.id, role: users.role })
          .from(users)
          .where(eq(users.email, participant.email.toLowerCase()))
          .limit(1)
      : [null];

    // Log the attendance event
    await db.insert(zoomAttendance).values({
      sessionId: lmsSession.id,
      userId: matchedUser?.id ?? null,
      role: matchedUser?.role === 'educator' ? 'educator' : 'learner',
      event: event === 'meeting.participant_joined' ? 'joined' : 'left',
      zoomParticipantId: participant.participant_uuid ?? participant.id,
      zoomDisplayName: participant.user_name,
      zoomEmail: participant.email,
      eventAt: new Date(participant.join_time ?? participant.leave_time ?? Date.now()),
    });
  }

  // ─── 4. Meeting ended — update session status ─────────────────────────────
  if (event === 'meeting.ended') {
    const { id: zoomMeetingId } = payload.payload.object;
    await db
      .update(sessions)
      .set({ actualEndAt: new Date(), updatedAt: new Date() })
      .where(eq(sessions.zoomMeetingId, String(zoomMeetingId)));
  }

  // ─── 5. Cloud Recording completed — persist recording URL & files to session ───
  if (event === 'recording.completed' || event === 'meeting.recordings.completed') {
    const obj = payload.payload?.object;
    if (obj) {
      const zoomMeetingId = String(obj.id);
      const recordingFiles = obj.recording_files || [];
      const duration = obj.duration || 0;

      // Look for the MP4 video recording file
      const mp4File = recordingFiles.find(
        (f: any) => f.file_type === 'MP4' || f.file_extension === 'MP4'
      );

      // Preferred play url: MP4 play_url, or recording share_url
      const playUrl = mp4File?.play_url || obj.share_url || recordingFiles[0]?.play_url;

      if (zoomMeetingId && playUrl) {
        await db
          .update(sessions)
          .set({
            recordingUrl: playUrl,
            recordingDuration: duration,
            recordingFiles: recordingFiles,
            status: 'completed',
            updatedAt: new Date(),
          })
          .where(eq(sessions.zoomMeetingId, zoomMeetingId));

        console.log(`[Zoom Webhook] Successfully recorded cloud video URL for meeting ${zoomMeetingId}`);
      }
    }
  }

  // ─── 6. Cloud Transcript completed — download & store VTT transcript ─────────
  if (event === 'recording.transcript.completed') {
    const obj = payload.payload?.object;
    const downloadToken = payload.download_token || payload.downloadToken;
    if (obj) {
      const zoomMeetingId = String(obj.id);
      const recordingFiles = obj.recording_files || [];
      const transcriptFile = recordingFiles.find(
        (f: any) => f.file_type === 'TRANSCRIPT' || f.file_extension === 'VTT'
      );

      if (transcriptFile && transcriptFile.download_url) {
        try {
          const downloadUrl = downloadToken
            ? `${transcriptFile.download_url}?download_token=${downloadToken}`
            : transcriptFile.download_url;

          console.log(`[Zoom Webhook] Downloading transcript for meeting ${zoomMeetingId}...`);
          const res = await fetch(downloadUrl);
          if (res.ok) {
            const rawVtt = await res.text();
            // Clean VTT
            const cleanText = rawVtt
              .replace(/^WEBVTT.*$/gm, '')
              .replace(/NOTE.*$/gm, '')
              .replace(/^\d+$/gm, '')
              .replace(/\d{2}:\d{2}:\d{2}\.\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}\.\d{3}.*$/gm, '')
              .replace(/\d{2}:\d{2}\.\d{3}\s*-->\s*\d{2}:\d{2}\.\d{3}.*$/gm, '')
              .replace(/<[^>]+>/g, '')
              .split('\n')
              .map((l) => l.trim())
              .filter(Boolean)
              .join('\n');

            await db
              .update(sessions)
              .set({
                transcriptVtt: rawVtt,
                transcriptText: cleanText,
                transcriptUrl: transcriptFile.download_url,
                updatedAt: new Date(),
              })
              .where(eq(sessions.zoomMeetingId, zoomMeetingId));

            console.log(`[Zoom Webhook] Saved transcript for meeting ${zoomMeetingId} (${cleanText.length} chars)`);
          } else {
            console.error(`[Zoom Webhook] Failed to download transcript file: status=${res.status}`);
          }
        } catch (downloadErr) {
          console.error('[Zoom Webhook] Error downloading/parsing transcript:', downloadErr);
        }
      }
    }
  }

  // ─── 7. Zoom AI Companion Meeting Summary completed ────────────────────────
  if (
    event === 'meeting.summary_completed' ||
    event === 'meeting.summary.completed' ||
    event === 'meeting.ai_summary.completed'
  ) {
    const obj = payload.payload?.object;
    if (obj) {
      const zoomMeetingId = String(obj.id || obj.meeting_id);
      const summaryOverview = obj.summary_overview || obj.summary_title || '';
      const summaryDetails = obj.summary_details || obj.summary_content || '';
      const nextSteps = obj.next_steps ? `\nNext Steps: ${obj.next_steps}` : '';
      
      const fullSummary = [summaryOverview, summaryDetails, nextSteps]
        .filter(Boolean)
        .join('\n\n')
        .trim();

      if (zoomMeetingId && fullSummary) {
        await db
          .update(sessions)
          .set({
            aiSummary: fullSummary,
            topic: summaryOverview || undefined,
            status: 'completed',
            updatedAt: new Date(),
          })
          .where(eq(sessions.zoomMeetingId, zoomMeetingId));

        console.log(`[Zoom Webhook] Successfully stored Zoom AI Companion summary for meeting ${zoomMeetingId}`);
      }
    }
  }

  return Response.json({ ok: true });
}
