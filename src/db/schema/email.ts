import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { sessions } from './sessions';

export const emailStatusEnum = pgEnum('email_status', [
  'sent',
  'delivered',
  'bounced',
  'failed',
  /** SMTP was not configured, so the send was a no-op (local dev). */
  'skipped',
]);

// ─── Email Log (every SMTP send is recorded for support/debugging) ─────────────
export const emailLog = pgTable(
  'email_log',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    toUserId: uuid('to_user_id').references(() => users.id, { onDelete: 'set null' }),
    // Denormalised in case the user row is later deleted.
    toEmail: text('to_email').notNull(),
    subject: text('subject').notNull(),
    // Template key for auditing: 'session_reminder', 'educator_invite', etc.
    template: text('template').notNull().default('generic'),
    relatedSessionId: uuid('related_session_id').references(() => sessions.id, { onDelete: 'set null' }),
    // SMTP message ID, for correlating with provider-side delivery logs.
    messageId: text('message_id'),
    status: emailStatusEnum('status').notNull().default('sent'),
    error: text('error'),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('email_log_user_idx').on(t.toUserId),
    index('email_log_session_idx').on(t.relatedSessionId),
    index('email_log_status_idx').on(t.status),
    index('email_log_message_idx').on(t.messageId),
    index('email_log_template_idx').on(t.template),
  ],
);

export type EmailLog = typeof emailLog.$inferSelect;
export type NewEmailLog = typeof emailLog.$inferInsert;
