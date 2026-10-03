/**
 * Ably — realtime fan-out for chat.
 *
 * Architecture note: Postgres is the single source of truth for messages.
 * Ably is used ONLY to broadcast a lightweight "something changed on thread X"
 * signal, so connected clients can refetch. This means:
 *   - losing the Ably connection degrades to polling, never to data loss
 *   - swapping Ably for another broker touches only this file
 */

import { config } from '@/config/unifiedConfig';

/** Channel names are namespaced so we can grant per-thread capabilities. */
export const CHANNEL_PREFIX = 'chat:thread:';

export function threadChannelName(threadId: string): string {
  return `${CHANNEL_PREFIX}${threadId}`;
}

/**
 * Capability for the threads a user actually belongs to. Built per-request from
 * a DB membership check, so a revoked membership takes effect on the next token
 * refresh. Users with no threads get an empty capability (connect-only).
 */
export function buildCapability(threadIds: string[]): Record<string, ('subscribe' | 'publish' | 'history')[]> {
  if (threadIds.length === 0) return {};
  return Object.fromEntries(
    threadIds.map((id) => [threadChannelName(id), ['subscribe', 'publish', 'history']]),
  );
}

let restClient: import('ably').Rest | null = null;

/**
 * Server-side REST client. Lazily constructed so importing this module never
 * throws when ABLY_API_KEY is absent.
 */
function getRest(): import('ably').Rest | null {
  if (!config.ably.enabled || !config.ably.apiKey) return null;
  if (!restClient) {
    // Lazy require keeps `ably` out of the server bundle for deployments
    // that run in polling-only mode.
    const Ably = require('ably') as typeof import('ably');
    restClient = new Ably.Rest({ key: config.ably.apiKey });
  }
  return restClient;
}

export type RealtimeAuthPayload = {
  /**
   * Ably `TokenRequest` (keyName + nonce + mac). Safe to hand to the browser:
   * it proves authenticity without exposing the API key secret, and Ably
   * exchanges it for a short-lived token itself.
   */
  tokenRequest: import('ably').TokenRequest;
  clientId: string;
  /** Seconds until the token expires; the client re-fetches after this. */
  expiresIn: number;
  transport: 'ably' | 'polling';
  pollIntervalMs: number;
};

/**
 * Mints a short-lived, capability-scoped token request for a signed-in user.
 * Returns null when Ably is not configured — the client then falls back to
 * polling, which is why the transport mode is reported alongside the token.
 */
export async function createRealtimeToken(
  userId: string,
  threadIds: string[],
): Promise<RealtimeAuthPayload | null> {
  const ably = getRest();
  const clientId = toClientId(userId);
  const expiresIn = 30 * 60;

  if (!ably) {
    return {
      tokenRequest: null as unknown as import('ably').TokenRequest,
      clientId,
      expiresIn,
      transport: 'polling',
      pollIntervalMs: config.ably.chatPollIntervalMs,
    };
  }

  const tokenRequest = await ably.auth.createTokenRequest({
    clientId,
    capability: buildCapability(threadIds),
    // 30 minutes keeps the blast radius of a leaked token small.
    ttl: expiresIn * 1000,
  });

  return {
    tokenRequest,
    clientId,
    expiresIn,
    transport: 'ably',
    pollIntervalMs: config.ably.chatPollIntervalMs,
  };
}

export type ChatEventName = 'message.created' | 'message.updated' | 'message.deleted' | 'thread.updated';

export type ChatBroadcast = {
  event: ChatEventName;
  threadId: string;
  messageId?: string;
  at: string;
};

/**
 * Broadcasts a change signal. Fire-and-forget: a failure here must never fail
 * the originating request, because Postgres already holds the truth.
 */
export async function broadcastChatEvent(payload: ChatBroadcast): Promise<void> {
  const ably = getRest();
  if (!ably) return;
  try {
    await ably.channels.get(threadChannelName(payload.threadId)).publish(
      payload.event,
      payload,
    );
  } catch (error) {
    console.error('[ably] broadcast failed:', error);
  }
}

/**
 * Sanitises a row id for use as an Ably clientId (no wildcards allowed).
 */
export function toClientId(userId: string): string {
  return `u_${userId.replace(/\*/g, '')}`;
}
