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
import { sessions } from './sessions';

// ─── Enums ────────────────────────────────────────────────────────────────────
export const leaveTypeEnum = pgEnum('leave_type', ['full', 'partial']);
export const conflictSourceEnum = pgEnum('conflict_source', ['leave', 'google', 'lms_overlap']);

// ─── Availability Profiles (recurring weekly schedule per educator) ────────────
export const availabilityProfiles = pgTable(
  'availability_profiles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    educatorId: uuid('educator_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    name: text('name').notNull().default('Default'),
    isDefault: boolean('is_default').notNull().default(false),
    timezone: text('timezone').notNull().default('Asia/Kolkata'),
    // Weekly recurring schedule stored as JSON:
    // { monday: [{start: "09:00", end: "17:00"}], tuesday: [...], ... }
    scheduleJson: jsonb('schedule_json').notNull().default('{}'),
    // Per-date overrides scoped to next 60 days:
    // { "2026-09-15": [{start: "10:00", end: "14:00"}], "2026-09-20": [] (unavailable) }
    overridesJson: jsonb('overrides_json').notNull().default('{}'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('availability_profiles_educator_idx').on(t.educatorId),
    index('availability_profiles_default_idx').on(t.educatorId, t.isDefault),
  ],
);

// ─── Leaves ────────────────────────────────────────────────────────────────────
// PRD rule: single-day leave requires start_date = end_date
export const leaves = pgTable(
  'leaves',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    educatorId: uuid('educator_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    type: leaveTypeEnum('type').notNull().default('full'),
    startDate: timestamp('start_date', { withTimezone: true }).notNull(),
    endDate: timestamp('end_date', { withTimezone: true }).notNull(),
    // For partial-day leaves
    startTime: text('start_time'), // "HH:MM"
    endTime: text('end_time'),     // "HH:MM"
    reason: text('reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('leaves_educator_idx').on(t.educatorId),
    index('leaves_date_range_idx').on(t.startDate, t.endDate),
  ],
);

// ─── Session Conflicts ─────────────────────────────────────────────────────────
// IMPORTANT: A conflict is a SURFACED WARNING — it never auto-cancels the session.
// Resolution is always manual. (PRD §22 rule)
export const sessionConflicts = pgTable(
  'session_conflicts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'cascade' }).notNull(),
    conflictSource: conflictSourceEnum('conflict_source').notNull(),
    // Details about what exactly conflicts (Google event title, overlapping session id, leave id)
    detailsJson: jsonb('details_json'),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    resolvedBy: uuid('resolved_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('session_conflicts_session_idx').on(t.sessionId),
    index('session_conflicts_resolved_idx').on(t.resolvedAt),
  ],
);

export type AvailabilityProfile = typeof availabilityProfiles.$inferSelect;
export type Leave = typeof leaves.$inferSelect;
export type NewLeave = typeof leaves.$inferInsert;
export type SessionConflict = typeof sessionConflicts.$inferSelect;
