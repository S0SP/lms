import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  numeric,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { courses } from './courses';
import { users } from './users';

// ─── Enums ────────────────────────────────────────────────────────────────────
export const sessionStatusEnum = pgEnum('session_status', [
  'scheduled',
  'live',
  'completed',
  'cancelled',
  'no_show',
]);

export const sessionHostEnum = pgEnum('session_host', [
  'admin',
  'educator',
  'learner_self_book',
]);

export const reminderTypeEnum = pgEnum('reminder_type', [
  't_minus_1h',
  't_minus_10m',
  't_plus_3m_not_started',
]);

// ─── Sessions ─────────────────────────────────────────────────────────────────
export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    courseId: uuid('course_id').references(() => courses.id, { onDelete: 'cascade' }).notNull(),
    educatorId: uuid('educator_id').references(() => users.id, { onDelete: 'restrict' }).notNull(),
    title: text('title').notNull(),
    topic: text('topic'),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
    durationMin: integer('duration_min').notNull().default(60),
    status: sessionStatusEnum('status').notNull().default('scheduled'),
    hostedBy: sessionHostEnum('hosted_by').notNull().default('admin'),
    // Zoom integration
    zoomMeetingId: text('zoom_meeting_id'),
    zoomMeetingUrl: text('zoom_meeting_url'),
    // Zoom Cloud Recording assets
    recordingUrl: text('recording_url'),
    recordingDuration: integer('recording_duration'),
    recordingFiles: jsonb('recording_files'),
    // Zoom Cloud Transcript & AI Summary assets
    transcriptText: text('transcript_text'),
    transcriptVtt: text('transcript_vtt'),
    transcriptUrl: text('transcript_url'),
    aiSummary: text('ai_summary'),
    // Google Calendar integration
    googleCalendarEventId: text('google_calendar_event_id'),
    // Actual times (populated by Zoom webhook)
    actualStartAt: timestamp('actual_start_at', { withTimezone: true }),
    actualEndAt: timestamp('actual_end_at', { withTimezone: true }),
    // Credits consumed when this session is marked complete (default 1.0)
    creditsConsumed: numeric('credits_consumed', { precision: 4, scale: 2 }).default('1.0'),
    // Was this session booked outside the educator's configured availability?
    isAvailabilityOverride: boolean('is_availability_override').notNull().default(false),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    cancelledBy: uuid('cancelled_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('sessions_course_idx').on(t.courseId),
    index('sessions_educator_idx').on(t.educatorId),
    index('sessions_scheduled_idx').on(t.scheduledAt),
    index('sessions_status_idx').on(t.status),
    index('sessions_zoom_meeting_idx').on(t.zoomMeetingId),
  ],
);

// ─── Session Attendees (for group courses: one session → many learners) ────────
export const sessionAttendees = pgTable(
  'session_attendees',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'cascade' }).notNull(),
    learnerId: uuid('learner_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  },
  (t) => [
    index('session_attendees_session_idx').on(t.sessionId),
    index('session_attendees_learner_idx').on(t.learnerId),
  ],
);

// ─── Session Feedback (operational record — VISIBLE to learner after submit) ───
export const sessionFeedback = pgTable(
  'session_feedback',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sessionId: uuid('session_id')
      .references(() => sessions.id, { onDelete: 'cascade' })
      .notNull()
      .unique(),
    educatorId: uuid('educator_id').references(() => users.id).notNull(),
    topicsCovered: text('topics_covered'),
    comments: text('comments'),
    homeworkAssigned: text('homework_assigned'),
    creditsConsumed: numeric('credits_consumed', { precision: 4, scale: 2 }),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('session_feedback_session_idx').on(t.sessionId)],
);

// ─── Session Reports (AI-drafted, educator-edited, learner-visible after publish)
export const sessionReports = pgTable(
  'session_reports',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'cascade' }).notNull(),
    learnerId: uuid('learner_id').references(() => users.id).notNull(),
    aiDraft: text('ai_draft'),
    editedContent: text('edited_content'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    publishedBy: uuid('published_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('session_reports_session_idx').on(t.sessionId),
    index('session_reports_learner_idx').on(t.learnerId),
  ],
);

// ─── CONFIDENTIAL: Educator-about-learner feedback ────────────────────────────
// SECURITY CRITICAL: NEVER join this table in educator or learner query paths.
// Admin-only endpoints only. Row-level: admin can read all, educator/learner: none.
export const confidentialFeedbackEducator = pgTable(
  'confidential_feedback_educator',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'cascade' }).notNull(),
    educatorId: uuid('educator_id').references(() => users.id).notNull(),
    learnerId: uuid('learner_id').references(() => users.id).notNull(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('conf_feedback_edu_session_idx').on(t.sessionId)],
);

// ─── CONFIDENTIAL: Learner-about-educator feedback ────────────────────────────
// SECURITY CRITICAL: NEVER join this table in educator or learner query paths.
// Admin-only endpoints only.
export const confidentialFeedbackLearner = pgTable(
  'confidential_feedback_learner',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'cascade' }).notNull(),
    learnerId: uuid('learner_id').references(() => users.id).notNull(),
    educatorId: uuid('educator_id').references(() => users.id).notNull(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('conf_feedback_learner_session_idx').on(t.sessionId)],
);

// ─── QStash reminder job tracking (for cancel/reschedule safety) ──────────────
export const sessionReminderJobs = pgTable(
  'session_reminder_jobs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'cascade' }).notNull(),
    // QStash message ID — needed to cancel/reschedule if session time changes
    qstashMessageId: text('qstash_message_id').notNull(),
    type: reminderTypeEnum('type').notNull(),
    scheduledFor: timestamp('scheduled_for', { withTimezone: true }).notNull(),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('reminder_jobs_session_idx').on(t.sessionId)],
);

// ─── TypeScript types ──────────────────────────────────────────────────────────
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type SessionFeedback = typeof sessionFeedback.$inferSelect;
export type SessionReport = typeof sessionReports.$inferSelect;
