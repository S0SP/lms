import { pgTable, pgEnum, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { orgs } from './orgs';
import { users } from './users';

// ─── Enums ────────────────────────────────────────────────────────────────────
export const tagCategoryEnum = pgEnum('tag_category', ['core', 'language', 'curriculum', 'custom']);

// ─── Global tag dictionary (per org) ─────────────────────────────────────────
export const tags = pgTable(
  'tags',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orgId: uuid('org_id').references(() => orgs.id, { onDelete: 'cascade' }).notNull(),
    name: text('name').notNull(),
    colorHex: text('color_hex').notNull().default('#6366f1'),
    category: tagCategoryEnum('category').notNull().default('custom'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('tags_org_idx').on(t.orgId)],
);

// ─── Course tags (M:M) ────────────────────────────────────────────────────────
export const courseTags = pgTable(
  'course_tags',
  {
    tagId: uuid('tag_id').references(() => tags.id, { onDelete: 'cascade' }).notNull(),
    courseId: uuid('course_id').notNull(), // FK to courses.id — defined in courses.ts
  },
  (t) => [index('course_tags_course_idx').on(t.courseId)],
);

// ─── Educator tags (M:M) ──────────────────────────────────────────────────────
export const educatorTags = pgTable(
  'educator_tags',
  {
    tagId: uuid('tag_id').references(() => tags.id, { onDelete: 'cascade' }).notNull(),
    educatorId: uuid('educator_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  },
  (t) => [index('educator_tags_educator_idx').on(t.educatorId)],
);

// ─── Learner tags (M:M) ───────────────────────────────────────────────────────
export const learnerTags = pgTable(
  'learner_tags',
  {
    tagId: uuid('tag_id').references(() => tags.id, { onDelete: 'cascade' }).notNull(),
    learnerId: uuid('learner_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  },
  (t) => [index('learner_tags_learner_idx').on(t.learnerId)],
);

export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;
