import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  boolean,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './users';

// ─── Enums ────────────────────────────────────────────────────────────────────
export const notificationChannelEnum = pgEnum('notification_channel', [
  'in_app',
  'email',
  'whatsapp',
  'push',
]);

// ─── Notification Log (durable, queryable record of every notification raised) ─
export const notificationLog = pgTable(
  'notification_log',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    type: text('type').notNull(), // e.g. 'session_reminder', 'credit_low', 'new_enrollment'
    // Arbitrary payload (session id, course id, message, etc.)
    payloadJson: jsonb('payload_json'),
    channel: notificationChannelEnum('channel').notNull().default('in_app'),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('notification_log_user_idx').on(t.userId),
    index('notification_log_type_idx').on(t.type),
    index('notification_log_unread_idx').on(t.userId, t.readAt),
  ],
);

// ─── Notification Preferences (per user, per type, per channel) ──────────────
export const notificationPreferences = pgTable(
  'notification_preferences',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    channel: notificationChannelEnum('channel').notNull(),
    type: text('type').notNull(), // notification type key
    enabled: boolean('enabled').notNull().default(true),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('notification_prefs_user_idx').on(t.userId)],
);

export type NotificationLog = typeof notificationLog.$inferSelect;
export type NewNotificationLog = typeof notificationLog.$inferInsert;
export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type NewNotificationPreference = typeof notificationPreferences.$inferInsert;
