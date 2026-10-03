import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  boolean,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { courses } from './courses';
import { users } from './users';

// ─── Enums ────────────────────────────────────────────────────────────────────
export const chatThreadTypeEnum = pgEnum('chat_thread_type', [
  'course_group',
  'direct',
  'admin_support',
]);

export const chatMessageKindEnum = pgEnum('chat_message_kind', [
  'text',
  'file',
  'system',
]);

// ─── Chat Threads ─────────────────────────────────────────────────────────────
// Postgres is the single source of truth for chat. A realtime transport (Ably)
// is used only to fan out events; every client can always fall back to reading
// this table, so the feature works with zero external services configured.
export const chatThreads = pgTable(
  'chat_threads',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // null for admin-initiated direct chats
    courseId: uuid('course_id').references(() => courses.id, { onDelete: 'cascade' }),
    type: chatThreadTypeEnum('type').notNull().default('course_group'),
    title: text('title'),
    // Admin-only participants of a direct thread, stored as user ids.
    participantIds: jsonb('participant_ids').$type<string[]>().notNull().default([]),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
    lastMessagePreview: text('last_message_preview'),
    // Monotonic counter bumped on every accepted message. Clients poll/watch
    // this to detect gaps without relying on transport delivery guarantees.
    messageVersion: timestamp('message_version', { withTimezone: true }),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('chat_threads_course_idx').on(t.courseId),
    index('chat_threads_type_idx').on(t.type),
    index('chat_threads_last_msg_idx').on(t.lastMessageAt),
  ],
);

// ─── Chat Members ─────────────────────────────────────────────────────────────
// Authoritative membership. Every read and write is checked against this table
// before touching chat_messages, so access control never depends on the client.
export const chatMembers = pgTable(
  'chat_members',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    threadId: uuid('thread_id')
      .references(() => chatThreads.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    // Denormalised for cheap thread-list rendering (avoids an N+1 on users).
    displayName: text('display_name'),
    avatarUrl: text('avatar_url'),
    lastReadAt: timestamp('last_read_at', { withTimezone: true }),
    mutedAt: timestamp('muted_at', { withTimezone: true }),
    addedAt: timestamp('added_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    // A user appears at most once per thread.
    uniqueIndex('chat_members_thread_user_uq').on(t.threadId, t.userId),
    index('chat_members_user_idx').on(t.userId),
  ],
);

// ─── Chat Messages ────────────────────────────────────────────────────────────
// Append-only. Edits and deletes are soft so history stays auditable.
export const chatMessages = pgTable(
  'chat_messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    threadId: uuid('thread_id')
      .references(() => chatThreads.id, { onDelete: 'cascade' })
      .notNull(),
    senderId: uuid('sender_id').references(() => users.id, { onDelete: 'set null' }),
    kind: chatMessageKindEnum('kind').notNull().default('text'),
    body: text('body').notNull(),
    // Attachment metadata for kind='file' (key/url/name/size/mime from R2).
    attachment: jsonb('attachment').$type<{
      key: string;
      url: string;
      name: string;
      size: number;
      mime: string;
    } | null>(),
    // Set by clients for optimistic-UI de-duplication.
    clientId: text('client_id'),
    editedAt: timestamp('edited_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('chat_messages_thread_created_idx').on(t.threadId, t.createdAt),
    // Guards against a retried request persisting the same message twice.
    uniqueIndex('chat_messages_client_id_uq').on(t.threadId, t.senderId, t.clientId),
  ],
);

export type ChatThread = typeof chatThreads.$inferSelect;
export type NewChatThread = typeof chatThreads.$inferInsert;
export type ChatMember = typeof chatMembers.$inferSelect;
export type NewChatMember = typeof chatMembers.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;
