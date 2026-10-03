import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  index,
} from 'drizzle-orm/pg-core';
import { courses } from './courses';
import { users } from './users';

// ─── Timeline Posts (class activity feed — visible to all enrolled learners) ───
export const timelinePosts = pgTable(
  'timeline_posts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    courseId: uuid('course_id').references(() => courses.id, { onDelete: 'cascade' }).notNull(),
    authorId: uuid('author_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    bodyRichtext: text('body_richtext'),
    commentsDisabled: boolean('comments_disabled').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('timeline_posts_course_idx').on(t.courseId),
    index('timeline_posts_created_idx').on(t.courseId, t.createdAt),
  ],
);

// ─── Polls ─────────────────────────────────────────────────────────────────────
export const polls = pgTable('polls', {
  id: uuid('id').defaultRandom().primaryKey(),
  postId: uuid('post_id')
    .references(() => timelinePosts.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  isQuizMode: boolean('is_quiz_mode').notNull().default(false),
  showResultsImmediately: boolean('show_results_immediately').notNull().default(true),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Poll Options ──────────────────────────────────────────────────────────────
export const pollOptions = pgTable(
  'poll_options',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    pollId: uuid('poll_id').references(() => polls.id, { onDelete: 'cascade' }).notNull(),
    body: text('body').notNull(),
    isCorrect: boolean('is_correct').notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [index('poll_options_poll_idx').on(t.pollId)],
);

// ─── Poll Responses (live % = COUNT(*) GROUP BY option_id) ────────────────────
export const pollResponses = pgTable(
  'poll_responses',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    optionId: uuid('option_id').references(() => pollOptions.id, { onDelete: 'cascade' }).notNull(),
    learnerId: uuid('learner_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('poll_responses_option_idx').on(t.optionId),
    index('poll_responses_learner_idx').on(t.learnerId),
  ],
);

// ─── Timeline Comments ─────────────────────────────────────────────────────────
export const timelineComments = pgTable(
  'timeline_comments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    postId: uuid('post_id').references(() => timelinePosts.id, { onDelete: 'cascade' }).notNull(),
    authorId: uuid('author_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    body: text('body').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('timeline_comments_post_idx').on(t.postId)],
);

export type TimelinePost = typeof timelinePosts.$inferSelect;
export type Poll = typeof polls.$inferSelect;
export type PollOption = typeof pollOptions.$inferSelect;
