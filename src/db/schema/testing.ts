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
import { contentResources } from './content';
import { users } from './users';

// ─── Enums ────────────────────────────────────────────────────────────────────
export const questionTypeEnum = pgEnum('question_type', [
  'single_correct',
  'multi_correct',
  'number',
  'fill_blank',
  'ranking',
  'match',
  'poll',
  'long_answer',
]);

export const testStatusEnum = pgEnum('test_status', ['draft', 'published']);

// ─── Tests (Test Builder header) ──────────────────────────────────────────────
export const tests = pgTable(
  'tests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    resourceId: uuid('resource_id')
      .references(() => contentResources.id, { onDelete: 'cascade' })
      .notNull()
      .unique(),
    name: text('name').notNull(),
    status: testStatusEnum('status').notNull().default('draft'),
    shuffleOptions: boolean('shuffle_options').notNull().default(false),
    negativeMarking: numeric('negative_marking', { precision: 4, scale: 2 }),
    timeLimitSeconds: integer('time_limit_seconds'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
);

// ─── Test Questions ────────────────────────────────────────────────────────────
export const testQuestions = pgTable(
  'test_questions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    testId: uuid('test_id').references(() => tests.id, { onDelete: 'cascade' }).notNull(),
    bodyRichtext: text('body_richtext').notNull(),
    type: questionTypeEnum('type').notNull(),
    timeLimitSeconds: integer('time_limit_seconds'),
    marks: numeric('marks', { precision: 6, scale: 2 }).notNull().default('1'),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [index('test_questions_test_idx').on(t.testId)],
);

// ─── Test Question Options ─────────────────────────────────────────────────────
export const testQuestionOptions = pgTable(
  'test_question_options',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    questionId: uuid('question_id')
      .references(() => testQuestions.id, { onDelete: 'cascade' })
      .notNull(),
    body: text('body').notNull(),
    isCorrect: boolean('is_correct').notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [index('test_question_options_question_idx').on(t.questionId)],
);

// ─── Test Attempts ─────────────────────────────────────────────────────────────
export const testAttempts = pgTable(
  'test_attempts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    testId: uuid('test_id').references(() => tests.id, { onDelete: 'cascade' }).notNull(),
    learnerId: uuid('learner_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    // Auto-scored on submit for objective question types
    autoScore: numeric('auto_score', { precision: 8, scale: 2 }),
  },
  (t) => [
    index('test_attempts_test_idx').on(t.testId),
    index('test_attempts_learner_idx').on(t.learnerId),
  ],
);

// ─── Test Answers (stores whatever shape the question type needs) ──────────────
export const testAnswers = pgTable(
  'test_answers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    attemptId: uuid('attempt_id')
      .references(() => testAttempts.id, { onDelete: 'cascade' })
      .notNull(),
    questionId: uuid('question_id').references(() => testQuestions.id).notNull(),
    // Flexible JSON: option ids for MCQ, text for fill-blank, ranking arrays, etc.
    answerJson: jsonb('answer_json').notNull(),
    isCorrect: boolean('is_correct'),
    marksAwarded: numeric('marks_awarded', { precision: 6, scale: 2 }),
  },
  (t) => [index('test_answers_attempt_idx').on(t.attemptId)],
);

export type Test = typeof tests.$inferSelect;
export type TestQuestion = typeof testQuestions.$inferSelect;
export type TestAttempt = typeof testAttempts.$inferSelect;
