import { type NextRequest } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/drizzle';
import { sessions, zoomAttendance, users, sessionAttendees, orgs, credits, creditLedger } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
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
      .select({
        id: sessions.id,
        courseId: sessions.courseId,
        creditsConsumed: sessions.creditsConsumed,
      })
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

    // Compute duration in seconds if participant left
    let durationSec: number | null = null;
    if (participant.duration) {
      durationSec = Number(participant.duration);
    } else if (participant.join_time && participant.leave_time) {
      const joinMs = new Date(participant.join_time).getTime();
      const leaveMs = new Date(participant.leave_time).getTime();
      durationSec = Math.max(0, Math.round((leaveMs - joinMs) / 1000));
    }

    // Log the attendance event
    await db.insert(zoomAttendance).values({
      sessionId: lmsSession.id,
      userId: matchedUser?.id ?? null,
      role: matchedUser?.role === 'educator' ? 'educator' : 'learner',
      event: event === 'meeting.participant_joined' ? 'joined' : 'left',
      zoomParticipantId: participant.participant_uuid ?? participant.id,
      zoomDisplayName: participant.user_name,
      zoomEmail: participant.email,
      durationSeconds: durationSec,
      eventAt: new Date(participant.leave_time ?? participant.join_time ?? Date.now()),
    });

    // If a learner leaves, evaluate their accumulated meeting attendance against the Admin policy
    if (event === 'meeting.participant_left' && matchedUser && matchedUser.role === 'learner') {
      // 1. Fetch minimum attendance threshold from Super Admin settings (default 40 min)
      const [orgRow] = await db
        .select({ minAttendanceMinutes: orgs.minAttendanceMinutes })
        .from(orgs)
        .limit(1);
      const minThresholdMinutes = orgRow?.minAttendanceMinutes ?? 40;

      // 2. Sum up total seconds across all join/leave sessions for this user in this meeting
      const priorEvents = await db
        .select({ durationSeconds: zoomAttendance.durationSeconds })
        .from(zoomAttendance)
        .where(
          and(
            eq(zoomAttendance.sessionId, lmsSession.id),
            eq(zoomAttendance.userId, matchedUser.id),
            eq(zoomAttendance.event, 'left')
          )
        );

      const totalSec = priorEvents.reduce((acc, ev) => acc + (ev.durationSeconds || 0), 0);
      const totalMinutes = Math.round(totalSec / 60);
      const hasMetThreshold = totalMinutes >= minThresholdMinutes;

      // 3. Update session attendee record with attendance result
      await db
        .update(sessionAttendees)
        .set({
          attended: hasMetThreshold,
          durationMinutes: totalMinutes,
          attendedAt: hasMetThreshold ? new Date() : null,
        })
        .where(
          and(
            eq(sessionAttendees.sessionId, lmsSession.id),
            eq(sessionAttendees.learnerId, matchedUser.id)
          )
        );

      console.log(
        `[Zoom Webhook] Learner ${matchedUser.id} accumulated ${totalMinutes}m in session ${lmsSession.id}. Policy threshold: ${minThresholdMinutes}m -> Attended: ${hasMetThreshold}`
      );

      // 4. If learner attended and course is credit-based, deduct dynamic credits setup by Admin
      if (hasMetThreshold && lmsSession.courseId) {
        // Read the credit deduction configured by the Admin for this session/student (default: 1.0)
        const creditsToDeduct =
          lmsSession.creditsConsumed !== null && lmsSession.creditsConsumed !== undefined
            ? Math.max(0, Number(lmsSession.creditsConsumed))
            : 1.0;

        if (creditsToDeduct > 0) {
          await db
            .update(credits)
            .set({
              consumed: sql`consumed + ${creditsToDeduct}`,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(credits.courseId, lmsSession.courseId),
                eq(credits.learnerId, matchedUser.id)
              )
            );

          // Fetch updated balance for immutable ledger
          const [updatedCredit] = await db
            .select({ total: credits.total, consumed: credits.consumed })
            .from(credits)
            .where(
              and(
                eq(credits.courseId, lmsSession.courseId),
                eq(credits.learnerId, matchedUser.id)
              )
            )
            .limit(1);

          const balanceAfter = updatedCredit
            ? Number(updatedCredit.total) - Number(updatedCredit.consumed)
            : 0;

          await db
            .insert(creditLedger)
            .values({
              courseId: lmsSession.courseId,
              learnerId: matchedUser.id,
              delta: String(-creditsToDeduct),
              balanceAfter: String(balanceAfter),
              note: `Auto-deducted ${creditsToDeduct} credit(s) configured by Admin for Zoom session attendance`,
              source: 'session',
              sessionId: lmsSession.id,
            })
            .catch((err) =>
              console.error('[Zoom Webhook] Failed to insert creditLedger entry:', err)
            );

          console.log(
            `[Zoom Webhook] Successfully deducted ${creditsToDeduct} credit(s) for learner ${matchedUser.id} in course ${lmsSession.courseId} (balance after: ${balanceAfter})`
          );
        }
      }
    }
  }

  // ─── 4. Meeting ended — update session status & finalize attendance ────────
  if (event === 'meeting.ended') {
    const { id: zoomMeetingId } = payload.payload.object;
    
    const [lmsSession] = await db
      .select({
        id: sessions.id,
        courseId: sessions.courseId,
        creditsConsumed: sessions.creditsConsumed,
      })
      .from(sessions)
      .where(eq(sessions.zoomMeetingId, String(zoomMeetingId)))
      .limit(1);

    if (lmsSession) {
      await db
        .update(sessions)
        .set({ actualEndAt: new Date(), status: 'completed', updatedAt: new Date() })
        .where(eq(sessions.id, lmsSession.id));

      // Final pass: check all session attendees who might still need threshold evaluation
      const [orgRow] = await db
        .select({ minAttendanceMinutes: orgs.minAttendanceMinutes })
        .from(orgs)
        .limit(1);
      const minThresholdMinutes = orgRow?.minAttendanceMinutes ?? 40;

      const attendees = await db
        .select({ id: sessionAttendees.id, learnerId: sessionAttendees.learnerId, attended: sessionAttendees.attended })
        .from(sessionAttendees)
        .where(eq(sessionAttendees.sessionId, lmsSession.id));

      for (const attendee of attendees) {
        const studentEvents = await db
          .select({ durationSeconds: zoomAttendance.durationSeconds })
          .from(zoomAttendance)
          .where(
            and(
              eq(zoomAttendance.sessionId, lmsSession.id),
              eq(zoomAttendance.userId, attendee.learnerId),
              eq(zoomAttendance.event, 'left')
            )
          );

        const totalSec = studentEvents.reduce((acc, ev) => acc + (ev.durationSeconds || 0), 0);
        const totalMinutes = Math.round(totalSec / 60);
        const hasMetThreshold = totalMinutes >= minThresholdMinutes;

        await db
          .update(sessionAttendees)
          .set({
            attended: hasMetThreshold,
            durationMinutes: totalMinutes,
            attendedAt: hasMetThreshold ? new Date() : null,
          })
          .where(eq(sessionAttendees.id, attendee.id));

        if (hasMetThreshold && !attendee.attended && lmsSession.courseId) {
          const creditsToDeduct =
            lmsSession.creditsConsumed !== null && lmsSession.creditsConsumed !== undefined
              ? Math.max(0, Number(lmsSession.creditsConsumed))
              : 1.0;

          if (creditsToDeduct > 0) {
            await db
              .update(credits)
              .set({
                consumed: sql`consumed + ${creditsToDeduct}`,
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(credits.courseId, lmsSession.courseId),
                  eq(credits.learnerId, attendee.learnerId)
                )
              );

            const [updatedCredit] = await db
              .select({ total: credits.total, consumed: credits.consumed })
              .from(credits)
              .where(
                and(
                  eq(credits.courseId, lmsSession.courseId),
                  eq(credits.learnerId, attendee.learnerId)
                )
              )
              .limit(1);

            const balanceAfter = updatedCredit
              ? Number(updatedCredit.total) - Number(updatedCredit.consumed)
              : 0;

            await db
              .insert(creditLedger)
              .values({
                courseId: lmsSession.courseId,
                learnerId: attendee.learnerId,
                delta: String(-creditsToDeduct),
                balanceAfter: String(balanceAfter),
                note: `Auto-deducted ${creditsToDeduct} credit(s) configured by Admin on meeting end`,
                source: 'session',
                sessionId: lmsSession.id,
              })
              .catch((err) =>
                console.error('[Zoom Webhook] Failed to insert creditLedger on meeting end:', err)
              );
          }
        }
      }
    }
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
