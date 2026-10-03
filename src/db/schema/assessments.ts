import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  numeric,
  index,
  jsonb,
} from 'drizzle-orm/pg-core';
import { contentResources } from './content';
import { users } from './users';

// ─── Assessments (rubric-graded, NOT auto-graded — essays, projects, spoken) ──
export const assessments = pgTable(
  'assessments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    resourceId: uuid('resource_id')
      .references(() => contentResources.id, { onDelete: 'cascade' })
      .notNull()
      .unique(),
    title: text('title').notNull(),
    description: text('description'),
    startsOn: timestamp('starts_on', { withTimezone: true }),
    endsOn: timestamp('ends_on', { withTimezone: true }),
    maxMarks: numeric('max_marks', { precision: 8, scale: 2 }).notNull(),
    rubricEnabled: boolean('rubric_enabled').notNull().default(true),
    attachments: jsonb('attachments')
      .$type<Array<{ name: string; url: string; size?: number; type?: string; key?: string }>>()
      .default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
);

// ─── Assessment Criteria (rubric rows — sum of marks <= max_marks) ────────────
export const assessmentCriteria = pgTable(
  'assessment_criteria',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    assessmentId: uuid('assessment_id')
      .references(() => assessments.id, { onDelete: 'cascade' })
      .notNull(),
    name: text('name').notNull(),
    maxMarks: numeric('max_marks', { precision: 8, scale: 2 }).notNull(),
    description: text('description'),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [index('assessment_criteria_assessment_idx').on(t.assessmentId)],
);

// ─── Assessment Submissions ────────────────────────────────────────────────────
export const assessmentSubmissions = pgTable(
  'assessment_submissions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    assessmentId: uuid('assessment_id')
      .references(() => assessments.id, { onDelete: 'cascade' })
      .notNull(),
    learnerId: uuid('learner_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).defaultNow().notNull(),
    // Array of Cloudflare R2 keys for uploaded files
    fileR2Keys: text('file_r2_keys').array(),
    totalScore: numeric('total_score', { precision: 8, scale: 2 }),
    gradedBy: uuid('graded_by').references(() => users.id),
    gradedAt: timestamp('graded_at', { withTimezone: true }),
    feedback: text('feedback'),
  },
  (t) => [
    index('assessment_submissions_assessment_idx').on(t.assessmentId),
    index('assessment_submissions_learner_idx').on(t.learnerId),
    // For SLA reminder: find submissions where graded_at IS NULL older than 72h
    index('assessment_submissions_ungraded_idx').on(t.gradedAt, t.submittedAt),
  ],
);

// ─── Assessment Scores (per-criterion breakdown) ───────────────────────────────
export const assessmentScores = pgTable(
  'assessment_scores',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    submissionId: uuid('submission_id')
      .references(() => assessmentSubmissions.id, { onDelete: 'cascade' })
      .notNull(),
    criterionId: uuid('criterion_id').references(() => assessmentCriteria.id).notNull(),
    marksAwarded: numeric('marks_awarded', { precision: 8, scale: 2 }).notNull(),
    comment: text('comment'),
  },
  (t) => [index('assessment_scores_submission_idx').on(t.submissionId)],
);

export type Assessment = typeof assessments.$inferSelect;
export type AssessmentSubmission = typeof assessmentSubmissions.$inferSelect;
