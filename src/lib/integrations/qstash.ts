/**
 * QStash wrapper for delayed/background jobs.
 *
 * All scheduling funcs return gracefully when QStash is not configured so the
 * calling transaction is never blocked by a missing credential.
 */

import { Client, Receiver } from '@upstash/qstash';
import { config } from '@/config/unifiedConfig';

let client: Client | null = null;

function getClient(): Client | null {
  if (!config.qstash.enabled || !config.qstash.token) return null;
  if (!client) {
    client = new Client({
      token: config.qstash.token,
      baseUrl: config.qstash.url,
    });
  }
  return client;
}

export function isQstashEnabled(): boolean {
  return config.qstash.enabled;
}

/**
 * Verifies an inbound QStash request. Returns false when QStash is not
 * configured so the route can reject with 503 instead of pretending to verify.
 */
export async function verifyQstashRequest(
  signature: string | null,
  body: string,
): Promise<boolean> {
  if (!config.qstash.currentSigningKey || !config.qstash.nextSigningKey) return false;
  if (!signature) return false;

  const receiver = new Receiver({
    currentSigningKey: config.qstash.currentSigningKey,
    nextSigningKey: config.qstash.nextSigningKey,
  });

  return receiver
    .verify({ signature, body })
    .then(() => true)
    .catch(() => false);
}

export type ScheduleResult = { messageId: string } | null;

/**
 * Publishes a JSON payload to `destination`, optionally after `delayMs`.
 * Returns the QStash message id (needed later to cancel), or null when the
 * publish was skipped or failed.
 */
export async function scheduleJson(opts: {
  url: string;
  body: unknown;
  delayMs?: number;
  /** Retries on top of the initial attempt. */
  retries?: number;
  label?: string;
}): Promise<ScheduleResult> {
  const qstash = getClient();
  if (!qstash) {
    if (!config.qstash.enabled) {
      console.warn('[qstash] not configured — job skipped for', opts.url);
    }
    return null;
  }

  try {
    const res = await qstash.publishJSON({
      url: opts.url,
      body: opts.body,
      ...(opts.delayMs ? { delay: Math.round(opts.delayMs / 1000) } : {}),
      ...(opts.retries !== undefined ? { retries: opts.retries } : {}),
    });
    return { messageId: res.messageId };
  } catch (error) {
    console.error('[qstash] publish failed:', error);
    return null;
  }
}

/**
 * Cancels previously scheduled messages. Used when a session is rescheduled or
 * cancelled, so stale reminders never fire.
 */
export async function cancelJobs(messageIds: string[]): Promise<number> {
  const qstash = getClient();
  if (!qstash || messageIds.length === 0) return 0;

  try {
    const { cancelled } = await qstash.messages.cancel(messageIds);
    return cancelled;
  } catch (error) {
    console.error('[qstash] cancel failed:', error);
    return 0;
  }
}

/** Absolute URL for a job destination, derived from APP_URL. */
export function jobUrl(pathname: string): string {
  return new URL(pathname, config.appUrl).toString();
}
