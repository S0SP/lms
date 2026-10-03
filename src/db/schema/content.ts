import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  numeric,
  index,
} from 'drizzle-orm/pg-core';
import { courses } from './courses';
import { users } from './users';

// ─── Enums ────────────────────────────────────────────────────────────────────
export const contentResourceTypeEnum = pgEnum('content_resource_type', [
  'video',
  'file',
  'test',
  'assessment',
  'youtube',
  'link',
  'embed',
  'chit_chat',
]);

export const contentAccessEnum = pgEnum('content_access', ['free', 'paid']);

// ─── Content Sections (drag-to-reorder sections within a course) ──────────────
export const contentSections = pgTable(
  'content_sections',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    courseId: uuid('course_id').references(() => courses.id, { onDelete: 'cascade' }).notNull(),
    title: text('title').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('content_sections_course_idx').on(t.courseId),
    index('content_sections_order_idx').on(t.courseId, t.sortOrder),
  ],
);

// ─── Content Resources (polymorphic — type determines sibling table) ───────────
export const contentResources = pgTable(
  'content_resources',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sectionId: uuid('section_id')
      .references(() => contentSections.id, { onDelete: 'cascade' })
      .notNull(),
    type: contentResourceTypeEnum('type').notNull(),
    title: text('title').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    // Drip release: null = immediately available
    dripReleaseAt: timestamp('drip_release_at', { withTimezone: true }),
    access: contentAccessEnum('access').notNull().default('paid'),
    isPublished: boolean('is_published').notNull().default(false),
    // For youtube/link/embed types: the URL
    externalUrl: text('external_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('content_resources_section_idx').on(t.sectionId),
    index('content_resources_order_idx').on(t.sectionId, t.sortOrder),
    index('content_resources_drip_idx').on(t.dripReleaseAt),
  ],
);

// ─── Video Assets (Cloudflare Stream backed) ──────────────────────────────────
export const videoAssets = pgTable('video_assets', {
  id: uuid('id').defaultRandom().primaryKey(),
  resourceId: uuid('resource_id')
    .references(() => contentResources.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  cloudflareStreamUid: text('cloudflare_stream_uid').notNull(),
  durationSeconds: integer('duration_seconds'),
  thumbnailUrl: text('thumbnail_url'),
  status: text('status').notNull().default('processing'), // processing, ready, error
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── File Assets (Cloudflare R2 backed — PDFs, slides) ────────────────────────
export const fileAssets = pgTable('file_assets', {
  id: uuid('id').defaultRandom().primaryKey(),
  resourceId: uuid('resource_id')
    .references(() => contentResources.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  r2Key: text('r2_key').notNull(),     // Cloudflare R2 object key
  fileType: text('file_type').notNull(), // 'pdf', 'pptx', etc.
  sizeBytes: integer('size_bytes'),
  originalName: text('original_name'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Learner Content Progress ─────────────────────────────────────────────────
export const learnerContentProgress = pgTable(
  'learner_content_progress',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    resourceId: uuid('resource_id')
      .references(() => contentResources.id, { onDelete: 'cascade' })
      .notNull(),
    learnerId: uuid('learner_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    // 0-100
    progressPct: numeric('progress_pct', { precision: 5, scale: 2 }).notNull().default('0'),
    // For video: last watched position in seconds
    lastPositionSeconds: integer('last_position_seconds'),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('learner_progress_resource_idx').on(t.resourceId),
    index('learner_progress_learner_idx').on(t.learnerId),
  ],
);

export type ContentSection = typeof contentSections.$inferSelect;
export type ContentResource = typeof contentResources.$inferSelect;
export type VideoAsset = typeof videoAssets.$inferSelect;
export type FileAsset = typeof fileAssets.$inferSelect;
