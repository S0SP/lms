import { db } from '@/lib/drizzle';
import { chatMembers, chatMessages, chatThreads, courses, users } from '@/db/schema';
import { alias } from 'drizzle-orm/pg-core';
import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm';

/**
 * A row in `chat_members` is the ONLY authorization source for this feature.
 * Role never grants access: an admin, an educator and a learner each see a
 * thread if and only if a chat_members row exists for (threadId, userId).
 * Every read below is written so that the membership predicate is part of the
 * query itself (an inner join) or is checked before the data is touched, so
 * access control can never depend on the client, the URL, or a role check.
 */

export type ChatThreadType = 'course_group' | 'direct' | 'admin_support';
export type ChatMessageKind = 'text' | 'file' | 'system';

/** Attachment metadata stored on chat_messages.attachment for kind = 'file'. */
export interface ChatAttachment {
  key: string;
  url: string;
  name: string;
  size: number;
  mime: string;
}

/** A thread member as seen from the outside (chatMembers denormalised, users fallback). */
export interface ChatParticipant {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  role?: string | null;
}

export interface ThreadMember extends ChatParticipant {
  role: string | null;
  lastReadAt: string | null;
  mutedAt: string | null;
}

/**
 * One row of the inbox list. Timestamps are ISO strings rather than `Date`s so
 * the value can be handed straight to a client component as a serializable prop.
 */
export interface ThreadSummary {
  id: string;
  type: ChatThreadType;
  title: string | null;
  courseId: string | null;
  courseName: string | null;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  memberCount: number;
  /** Everyone except the viewer, ordered by the time they were added. */
  participants: ChatParticipant[];
  viewerLastReadAt: string | null;
  viewerMutedAt: string | null;
}

export interface ThreadDetail {
  thread: {
    id: string;
    type: ChatThreadType;
    title: string | null;
    courseId: string | null;
    courseName: string | null;
    lastMessageAt: string | null;
    lastMessagePreview: string | null;
    messageVersion: string | null;
  };
  members: ThreadMember[];
  viewerLastReadAt: string | null;
}

export interface MessageView {
  id: string;
  threadId: string;
  senderId: string | null;
  senderName: string | null;
  senderAvatarUrl: string | null;
  kind: ChatMessageKind;
  body: string;
  attachment: ChatAttachment | null;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: string;
}

export interface ListThreadsOptions {
  limit?: number;
  /** Keyset cursor from a previous page: the last row's sort key. */
  cursor?: { at: string; id: string };
}

/** Threads with no activity yet sort by their creation time. */
const threadActivity = sql`coalesce(${chatThreads.lastMessageAt}, ${chatThreads.createdAt})`;

const toIso = (value: Date | null): string | null => (value ? value.toISOString() : null);

/**
 * The inbox: every non-archived thread the user is a member of, newest activity
 * first, with the other participants, the course and a real member count.
 * Aggregates are computed in SQL and the whole list costs a fixed 3 queries —
 * there is no per-thread lookup.
 */
export async function listThreadsForUser(
  userId: string,
  { limit = 50, cursor }: ListThreadsOptions = {},
): Promise<ThreadSummary[]> {
  const conditions = [
    isNull(chatThreads.archivedAt),
    // Keyset pagination on the same expression the list is ordered by, so a page
    // boundary is stable even when many threads share a timestamp.
    cursor
      ? sql`(coalesce(${chatThreads.lastMessageAt}, ${chatThreads.createdAt}), ${chatThreads.id}) < (${cursor.at}::timestamptz, ${cursor.id}::uuid)`
      : undefined,
  ].filter((c): c is NonNullable<typeof c> => c !== undefined);

  const rows = await db
    .select({
      id: chatThreads.id,
      type: chatThreads.type,
      title: chatThreads.title,
      courseId: chatThreads.courseId,
      courseName: courses.name,
      lastMessageAt: chatThreads.lastMessageAt,
      lastMessagePreview: chatThreads.lastMessagePreview,
      viewerLastReadAt: chatMembers.lastReadAt,
      viewerMutedAt: chatMembers.mutedAt,
    })
    .from(chatThreads)
    // The membership join: a thread only appears if chat_members says so.
    .innerJoin(
      chatMembers,
      and(eq(chatMembers.threadId, chatThreads.id), eq(chatMembers.userId, userId)),
    )
    .leftJoin(courses, eq(chatThreads.courseId, courses.id))
    .where(and(...conditions))
    .orderBy(desc(threadActivity), desc(chatThreads.id))
    .limit(limit);

  if (rows.length === 0) return [];

  const threadIds = rows.map((r) => r.id);
  // Second reference to chat_members so "the other people" can be read
  // alongside the viewer's own membership row.
  const otherMembers = alias(chatMembers, 'chat_other_members');

  const [countRows, participantRows] = await Promise.all([
    db
      .select({
        threadId: chatMembers.threadId,
        memberCount: sql<number>`count(*)::int`,
      })
      .from(chatMembers)
      .where(inArray(chatMembers.threadId, threadIds))
      .groupBy(chatMembers.threadId),

    db
      .select({
        threadId: otherMembers.threadId,
        userId: otherMembers.userId,
        displayName: sql<string | null>`coalesce(${otherMembers.displayName}, ${users.name})`,
        avatarUrl: sql<string | null>`coalesce(${otherMembers.avatarUrl}, ${users.avatarUrl})`,
        role: users.role,
      })
      .from(otherMembers)
      .leftJoin(users, eq(otherMembers.userId, users.id))
      .where(
        and(inArray(otherMembers.threadId, threadIds), sql`${otherMembers.userId} <> ${userId}`),
      )
      .orderBy(asc(otherMembers.addedAt)),
  ]);

  const counts = new Map(countRows.map((c) => [c.threadId, c.memberCount]));
  const participants = new Map<string, ChatParticipant[]>();
  for (const p of participantRows) {
    const list = participants.get(p.threadId);
    const entry: ChatParticipant = {
      userId: p.userId,
      displayName: p.displayName,
      avatarUrl: p.avatarUrl,
      role: p.role,
    };
    if (list) list.push(entry);
    else participants.set(p.threadId, [entry]);
  }

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    courseId: row.courseId,
    courseName: row.courseName,
    lastMessageAt: toIso(row.lastMessageAt),
    lastMessagePreview: row.lastMessagePreview,
    memberCount: counts.get(row.id) ?? 1,
    participants: participants.get(row.id) ?? [],
    viewerLastReadAt: toIso(row.viewerLastReadAt),
    viewerMutedAt: toIso(row.viewerMutedAt),
  }));
}

/**
 * A single thread with its full member roster, or null when the user is not a
 * member. The inner join on chat_members is the authorization boundary: a
 * non-member gets null and therefore learns nothing about the thread.
 */
export async function getThreadForUser(
  threadId: string,
  userId: string,
): Promise<ThreadDetail | null> {
  const [row] = await db
    .select({
      id: chatThreads.id,
      type: chatThreads.type,
      title: chatThreads.title,
      courseId: chatThreads.courseId,
      courseName: courses.name,
      lastMessageAt: chatThreads.lastMessageAt,
      lastMessagePreview: chatThreads.lastMessagePreview,
      messageVersion: chatThreads.messageVersion,
      viewerLastReadAt: chatMembers.lastReadAt,
    })
    .from(chatThreads)
    .innerJoin(
      chatMembers,
      and(eq(chatMembers.threadId, chatThreads.id), eq(chatMembers.userId, userId)),
    )
    .leftJoin(courses, eq(chatThreads.courseId, courses.id))
    .where(eq(chatThreads.id, threadId))
    .limit(1);

  if (!row) return null;

  const memberRows = await db
    .select({
      userId: chatMembers.userId,
      displayName: sql<string | null>`coalesce(${chatMembers.displayName}, ${users.name})`,
      avatarUrl: sql<string | null>`coalesce(${chatMembers.avatarUrl}, ${users.avatarUrl})`,
      role: users.role,
      lastReadAt: chatMembers.lastReadAt,
      mutedAt: chatMembers.mutedAt,
    })
    .from(chatMembers)
    .leftJoin(users, eq(chatMembers.userId, users.id))
    .where(eq(chatMembers.threadId, threadId))
    .orderBy(asc(chatMembers.addedAt));

  return {
    thread: {
      id: row.id,
      type: row.type,
      title: row.title,
      courseId: row.courseId,
      courseName: row.courseName,
      lastMessageAt: toIso(row.lastMessageAt),
      lastMessagePreview: row.lastMessagePreview,
      messageVersion: toIso(row.messageVersion),
    },
    members: memberRows.map((m) => ({
      userId: m.userId,
      displayName: m.displayName,
      avatarUrl: m.avatarUrl,
      role: m.role,
      lastReadAt: toIso(m.lastReadAt),
      mutedAt: toIso(m.mutedAt),
    })),
    viewerLastReadAt: toIso(row.viewerLastReadAt),
  };
}

/** Membership probe used before a message read or write. */
export async function isThreadMember(threadId: string, userId: string): Promise<boolean> {
  const [row] = await db
    .select({ one: sql<number>`1` })
    .from(chatMembers)
    .where(and(eq(chatMembers.threadId, threadId), eq(chatMembers.userId, userId)))
    .limit(1);
  return !!row;
}

/**
 * The most recent page of a thread's history, oldest first so it renders top to
 * bottom. Membership is verified first and a non-member gets an empty list.
 * Soft-deleted messages are returned and flagged (`isDeleted`) so the transcript
 * keeps its shape; `body` and `attachment` must be ignored for those rows.
 */
export async function listMessages(
  threadId: string,
  userId: string,
  { limit = 200 }: { limit?: number } = {},
): Promise<MessageView[]> {
  if (!(await isThreadMember(threadId, userId))) return [];

  const rows = await db
    .select({
      id: chatMessages.id,
      threadId: chatMessages.threadId,
      senderId: chatMessages.senderId,
      senderName: users.name,
      senderAvatarUrl: users.avatarUrl,
      kind: chatMessages.kind,
      body: chatMessages.body,
      attachment: chatMessages.attachment,
      editedAt: chatMessages.editedAt,
      deletedAt: chatMessages.deletedAt,
      createdAt: chatMessages.createdAt,
    })
    .from(chatMessages)
    .leftJoin(users, eq(chatMessages.senderId, users.id))
    .where(eq(chatMessages.threadId, threadId))
    // Newest first to apply the limit, then reversed below.
    .orderBy(desc(chatMessages.createdAt), desc(chatMessages.id))
    .limit(limit);

  return rows.reverse().map((row) => ({
    id: row.id,
    threadId: row.threadId,
    senderId: row.senderId,
    senderName: row.senderName,
    senderAvatarUrl: row.senderAvatarUrl,
    kind: row.kind,
    body: row.body,
    attachment: row.attachment,
    isEdited: row.editedAt !== null,
    isDeleted: row.deletedAt !== null,
    createdAt: row.createdAt.toISOString(),
  }));
}

/**
 * Atomically inserts a message, advances thread activity, bumps messageVersion,
 * marks the sender as having read the message, and broadcasts an event via Ably.
 */
export async function sendMessage(opts: {
  threadId: string;
  senderId: string;
  body: string;
  kind?: ChatMessageKind;
  attachment?: ChatAttachment | null;
}): Promise<MessageView> {
  const isMember = await isThreadMember(opts.threadId, opts.senderId);
  if (!isMember) {
    throw new Error('Forbidden: user is not a member of this chat thread');
  }

  const kind = opts.kind ?? 'text';
  const now = new Date();
  const preview =
    kind === 'file'
      ? opts.attachment?.name
        ? `📎 ${opts.attachment.name}`
        : '📎 Attachment'
      : opts.body.slice(0, 100);

  const [message, sender] = await db.transaction(async (tx) => {
    const [msg] = await tx
      .insert(chatMessages)
      .values({
        threadId: opts.threadId,
        senderId: opts.senderId,
        kind,
        body: opts.body,
        attachment: opts.attachment ?? null,
        createdAt: now,
      })
      .returning();

    await tx
      .update(chatThreads)
      .set({
        lastMessageAt: now,
        lastMessagePreview: preview,
        messageVersion: now,
      })
      .where(eq(chatThreads.id, opts.threadId));

    await tx
      .update(chatMembers)
      .set({ lastReadAt: now })
      .where(and(eq(chatMembers.threadId, opts.threadId), eq(chatMembers.userId, opts.senderId)));

    const [u] = await tx
      .select({ name: users.name, avatarUrl: users.avatarUrl })
      .from(users)
      .where(eq(users.id, opts.senderId))
      .limit(1);

    return [msg, u];
  });

  // Fan-out via Ably if configured (safe non-blocking)
  const { broadcastChatEvent } = await import('@/lib/integrations/ably');
  await broadcastChatEvent({
    event: 'message.created',
    threadId: opts.threadId,
    messageId: message.id,
    at: now.toISOString(),
  });

  return {
    id: message.id,
    threadId: message.threadId,
    senderId: message.senderId,
    senderName: sender?.name ?? null,
    senderAvatarUrl: sender?.avatarUrl ?? null,
    kind: message.kind,
    body: message.body,
    attachment: message.attachment,
    isEdited: false,
    isDeleted: false,
    createdAt: message.createdAt.toISOString(),
  };
}

/**
 * Updates a member's lastReadAt timestamp so unread indicators clear.
 */
export async function markThreadRead(threadId: string, userId: string): Promise<boolean> {
  const result = await db
    .update(chatMembers)
    .set({ lastReadAt: new Date() })
    .where(and(eq(chatMembers.threadId, threadId), eq(chatMembers.userId, userId)));
  return true;
}

/**
 * Creates or retrieves an existing direct 1-to-1 conversation thread between two users.
 */
export async function getOrCreateDirectThread(
  creatorId: string,
  recipientId: string,
): Promise<{ id: string; isNew: boolean }> {
  if (creatorId === recipientId) {
    throw new Error('Cannot start a chat with yourself');
  }

  // Look for existing direct thread with both members
  const existingMemberships = await db
    .select({ threadId: chatMembers.threadId })
    .from(chatMembers)
    .innerJoin(chatThreads, eq(chatMembers.threadId, chatThreads.id))
    .where(
      and(
        eq(chatThreads.type, 'direct'),
        inArray(chatMembers.userId, [creatorId, recipientId]),
      ),
    );

  const countsByThread = new Map<string, number>();
  for (const m of existingMemberships) {
    countsByThread.set(m.threadId, (countsByThread.get(m.threadId) ?? 0) + 1);
  }

  for (const [tId, count] of countsByThread.entries()) {
    if (count === 2) {
      return { id: tId, isNew: false };
    }
  }

  // Create new direct thread
  const [creator, recipient] = await Promise.all([
    db.select({ name: users.name, avatarUrl: users.avatarUrl }).from(users).where(eq(users.id, creatorId)).limit(1),
    db.select({ name: users.name, avatarUrl: users.avatarUrl }).from(users).where(eq(users.id, recipientId)).limit(1),
  ]);

  if (!recipient[0]) {
    throw new Error('Recipient user not found');
  }

  const thread = await db.transaction(async (tx) => {
    const [t] = await tx
      .insert(chatThreads)
      .values({
        type: 'direct',
        title: null,
        participantIds: [creatorId, recipientId],
        createdBy: creatorId,
        lastMessageAt: new Date(),
        messageVersion: new Date(),
      })
      .returning();

    await tx.insert(chatMembers).values([
      {
        threadId: t.id,
        userId: creatorId,
        displayName: creator[0]?.name ?? null,
        avatarUrl: creator[0]?.avatarUrl ?? null,
        lastReadAt: new Date(),
      },
      {
        threadId: t.id,
        userId: recipientId,
        displayName: recipient[0].name ?? null,
        avatarUrl: recipient[0].avatarUrl ?? null,
      },
    ]);

    return t;
  });

  return { id: thread.id, isNew: true };
}

/**
 * Returns platform users that the current user can initiate a conversation with.
 */
export async function listAvailableChatRecipients(viewerId: string) {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(and(eq(users.isActive, true), sql`${users.id} != ${viewerId}`))
    .orderBy(asc(users.name))
    .limit(50);

  return rows;
}
