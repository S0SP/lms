import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  integer,
  index,
} from 'drizzle-orm/pg-core';
import { sessions } from './sessions';
import { users } from './users';

export const attendanceRoleEnum = pgEnum('attendance_role', ['educator', 'learner', 'guest']);
export const attendanceEventEnum = pgEnum('attendance_event', ['joined', 'left', 'admitted']);

// ─── Zoom Attendance Log ───────────────────────────────────────────────────────
// One row per join/leave event from Zoom webhooks.
// User matching: primary = email lookup, fallback = display name fuzzy match.
// user_id is nullable: if unmatched, surfaced in Admin Review queue.
export const zoomAttendance = pgTable(
  'zoom_attendance',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'cascade' }).notNull(),
    // Nullable: set to null if the Zoom participant can't be matched to a user
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    role: attendanceRoleEnum('role').notNull(),
    event: attendanceEventEnum('event').notNull(),
    zoomParticipantId: text('zoom_participant_id').notNull(),
    zoomDisplayName: text('zoom_display_name'),
    zoomEmail: text('zoom_email'),
    eventAt: timestamp('event_at', { withTimezone: true }).notNull(),
    // Computed on 'left' event: duration_seconds = left_at - joined_at
    durationSeconds: integer('duration_seconds'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('zoom_attendance_session_idx').on(t.sessionId),
    index('zoom_attendance_user_idx').on(t.userId),
    // For Admin Review queue: find all unmatched participants
    index('zoom_attendance_unmatched_idx').on(t.userId, t.sessionId),
  ],
);

export type ZoomAttendance = typeof zoomAttendance.$inferSelect;
export type NewZoomAttendance = typeof zoomAttendance.$inferInsert;
