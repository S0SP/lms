import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './users';

// ─── Google OAuth tokens (SSO login) ─────────────────────────────────────────
export const googleOauthTokens = pgTable(
  'google_oauth_tokens',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull()
      .unique(),
    // Stored AES-256-GCM encrypted at rest
    accessTokenEnc: text('access_token_enc').notNull(),
    refreshTokenEnc: text('refresh_token_enc'),
    expiry: timestamp('expiry', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
);

// ─── Google Calendar tokens (per-educator 2-way calendar sync) ────────────────
// Separate from SSO tokens — educator may use a different Google account for calendar.
export const googleCalendarTokens = pgTable(
  'google_calendar_tokens',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    educatorId: uuid('educator_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull()
      .unique(),
    // AES-256-GCM encrypted
    accessTokenEnc: text('access_token_enc').notNull(),
    refreshTokenEnc: text('refresh_token_enc').notNull(),
    expiry: timestamp('expiry', { withTimezone: true }),
    calendarId: text('calendar_id').notNull().default('primary'),
    connectedAt: timestamp('connected_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
);

// ─── Google Calendar Watch Channels ───────────────────────────────────────────
// Created when educator connects calendar. Must be renewed daily before expiry
// via the `POST /api/cron/renew-calendar-channels` QStash job.
export const googleCalendarChannels = pgTable(
  'google_calendar_channels',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    educatorId: uuid('educator_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    // Google-assigned channel ID (used to stop/renew the watch)
    channelId: text('channel_id').notNull().unique(),
    // Google-assigned resource ID (the calendar being watched)
    resourceId: text('resource_id').notNull(),
    // Our secret token — validated in the `x-goog-channel-token` header on every webhook push
    tokenUuid: text('token_uuid').notNull(),
    calendarId: text('calendar_id').notNull().default('primary'),
    // Google Calendar watch channels expire after max 7 days — renew daily
    expiry: timestamp('expiry', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('gcal_channels_educator_idx').on(t.educatorId)],
);

export type GoogleCalendarToken = typeof googleCalendarTokens.$inferSelect;
export type GoogleCalendarChannel = typeof googleCalendarChannels.$inferSelect;
