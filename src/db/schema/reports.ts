import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { courses } from './courses';

// ─── Enums ────────────────────────────────────────────────────────────────────
export const reportStatusEnum = pgEnum('report_status', ['draft', 'sent']);

// ─── Monthly AI-generated Progress Reports ─────────────────────────────────────
// One report per learner per course per month.
// Flow: AI generates draft → educator reviews/edits → admin sends.
// IMMUTABLE once sent: status 'sent' is a terminal state.
export const monthlyReports = pgTable(
  'monthly_reports',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    learnerId: uuid('learner_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    courseId: uuid('course_id').references(() => courses.id, { onDelete: 'cascade' }).notNull(),
    // ISO date of the first day of the month, e.g. "2026-08-01"
    monthYear: timestamp('month_year', { withTimezone: true }).notNull(),
    status: reportStatusEnum('status').notNull().default('draft'),
    // AI-generated content (Claude Haiku output)
    aiDraft: text('ai_draft'),
    // After admin/educator edits — this is what gets sent
    editedContent: text('edited_content'),
    // Structured sections stored as JSONB:
    // { summary, topicsCovered, strengths, areasForGrowth, nextSteps, overallScore, sessionMetrics }
    sectionsJson: jsonb('sections_json'),
    selectedSessionIds: jsonb('selected_session_ids'),
    shareToken: text('share_token'),
    brandTheme: text('brand_theme'),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    sentBy: uuid('sent_by').references(() => users.id),
    generatedAt: timestamp('generated_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('monthly_reports_learner_idx').on(t.learnerId),
    index('monthly_reports_course_idx').on(t.courseId),
    index('monthly_reports_status_idx').on(t.status),
    // Enforce one report per learner per course per month
    uniqueIndex('monthly_reports_unique_idx').on(t.learnerId, t.courseId, t.monthYear),
  ],
);

export type MonthlyReport = typeof monthlyReports.$inferSelect;
export type NewMonthlyReport = typeof monthlyReports.$inferInsert;
