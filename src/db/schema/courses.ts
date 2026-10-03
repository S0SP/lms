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
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { orgs } from './orgs';
import { users } from './users';

// ─── Enums ────────────────────────────────────────────────────────────────────
export const courseTypeEnum = pgEnum('course_type', ['one_on_one', 'group', 'recorded']);
export const courseStatusEnum = pgEnum('course_status', ['draft', 'published', 'archived']);
export const enrollmentStatusEnum = pgEnum('enrollment_status', ['active', 'completed', 'cancelled']);
export const paymentPlanTypeEnum = pgEnum('payment_plan_type', [
  'per_session',
  'bundle',
  'subscription',
  'free',
]);
export const discountTypeEnum = pgEnum('discount_type', ['percent', 'flat']);

// ─── Courses ──────────────────────────────────────────────────────────────────
export const courses = pgTable(
  'courses',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orgId: uuid('org_id').references(() => orgs.id, { onDelete: 'cascade' }).notNull(),
    name: text('name').notNull(),
    shortCode: text('short_code'),
    description: text('description'),
    type: courseTypeEnum('type').notNull().default('one_on_one'),
    status: courseStatusEnum('status').notNull().default('draft'),
    thumbnailUrl: text('thumbnail_url'),
    urlSlug: text('url_slug'),
    board: text('board'), // IGCSE, IB, CBSE, etc.
    grade: text('grade'),
    cohortMaxLearners: integer('cohort_max_learners'), // group only
    defaultSessionDurationMin: integer('default_session_duration_min').default(60),
    isAdminBooked: boolean('is_admin_booked').notNull().default(true),
    // Full 9-step wizard payload stored as JSONB for draft/preview divergence
    sellingPageJson: jsonb('selling_page_json'),
    isTemplate: boolean('is_template').notNull().default(false),
    templateId: uuid('template_id'),
    createdBy: uuid('created_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('courses_org_type_idx').on(t.orgId, t.type),
    index('courses_status_idx').on(t.status),
    index('courses_slug_idx').on(t.urlSlug),
  ],
);

// ─── Course Enrollments (learner ↔ course M:M) ────────────────────────────────
export const courseEnrollments = pgTable(
  'course_enrollments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    courseId: uuid('course_id').references(() => courses.id, { onDelete: 'cascade' }).notNull(),
    learnerId: uuid('learner_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    status: enrollmentStatusEnum('status').notNull().default('active'),
    enrolledAt: timestamp('enrolled_at', { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (t) => [
    index('enrollments_course_idx').on(t.courseId),
    index('enrollments_learner_idx').on(t.learnerId),
    uniqueIndex('enrollments_unique_idx').on(t.courseId, t.learnerId),
  ],
);

// ─── Course Educators (educator ↔ course M:M with payout override) ────────────
export const courseEducators = pgTable(
  'course_educators',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    courseId: uuid('course_id').references(() => courses.id, { onDelete: 'cascade' }).notNull(),
    educatorId: uuid('educator_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    // Per-course payout rate override (null = use educator's default rate)
    payoutRateOverride: numeric('payout_rate_override', { precision: 10, scale: 2 }),
    assignedAt: timestamp('assigned_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('course_educators_course_idx').on(t.courseId),
    index('course_educators_educator_idx').on(t.educatorId),
    uniqueIndex('course_educators_unique_idx').on(t.courseId, t.educatorId),
  ],
);

// ─── Credits — billing unit for 1:1 and group sessions ────────────────────────
// CRITICAL: consumed <= total enforced at DB level. Negative balances are REJECTED.
export const credits = pgTable(
  'credits',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    courseId: uuid('course_id').references(() => courses.id, { onDelete: 'cascade' }).notNull(),
    learnerId: uuid('learner_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    // Fractional credits supported (e.g. 0.5 for half-session)
    total: numeric('total', { precision: 8, scale: 2 }).notNull().default('0'),
    consumed: numeric('consumed', { precision: 8, scale: 2 }).notNull().default('0'),
    adjustedBy: uuid('adjusted_by').references(() => users.id), // last admin who manually adjusted
    adjustedAt: timestamp('adjusted_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('credits_course_learner_idx').on(t.courseId, t.learnerId),
    // DB-level constraint: consumed CANNOT exceed total
    check('credits_no_negative_balance', sql`consumed <= total`),
  ],
);

// ─── Credit Ledger — immutable transaction log for every credit adjustment ─────
export const creditLedger = pgTable(
  'credit_ledger',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    courseId: uuid('course_id').references(() => courses.id, { onDelete: 'cascade' }).notNull(),
    learnerId: uuid('learner_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    // Positive = added, Negative = deducted
    delta: numeric('delta', { precision: 8, scale: 2 }).notNull(),
    balanceAfter: numeric('balance_after', { precision: 8, scale: 2 }).notNull(),
    note: text('note'),
    // 'admin' = manual adjustment, 'session' = auto-deducted on session completion, 'system' = other
    source: text('source').notNull().default('admin'),
    sessionId: uuid('session_id'), // optional FK to sessions.id (set null on delete)
    adjustedBy: uuid('adjusted_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('credit_ledger_course_learner_idx').on(t.courseId, t.learnerId),
    index('credit_ledger_created_idx').on(t.createdAt),
  ],
);

// ─── Payment Plans (per wizard Step 3) ────────────────────────────────────────
export const paymentPlans = pgTable(
  'payment_plans',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    courseId: uuid('course_id').references(() => courses.id, { onDelete: 'cascade' }).notNull(),
    type: paymentPlanTypeEnum('type').notNull(),
    price: numeric('price', { precision: 10, scale: 2 }),
    currency: text('currency').notNull().default('INR'),
    creditPackSize: integer('credit_pack_size'), // for bundle plans
    isDefault: boolean('is_default').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('payment_plans_course_idx').on(t.courseId)],
);

// ─── Course Selling Pages (public-facing page content, separate from wizard draft) ──
export const courseSellingPages = pgTable('course_selling_pages', {
  id: uuid('id').defaultRandom().primaryKey(),
  courseId: uuid('course_id')
    .references(() => courses.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  heroJson: jsonb('hero_json'),
  highlightsJson: jsonb('highlights_json'),
  // Array of course_review IDs selected by admin (Step 6 wizard)
  selectedReviewIds: uuid('selected_review_ids').array(),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Coupons (wizard Step 7) ──────────────────────────────────────────────────
export const coupons = pgTable(
  'coupons',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    courseId: uuid('course_id').references(() => courses.id, { onDelete: 'cascade' }).notNull(),
    code: text('code').notNull(),
    discountType: discountTypeEnum('discount_type').notNull(),
    amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
    validFrom: timestamp('valid_from', { withTimezone: true }),
    validTo: timestamp('valid_to', { withTimezone: true }),
    usageLimit: integer('usage_limit'),
    timesUsed: integer('times_used').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('coupons_course_idx').on(t.courseId),
    uniqueIndex('coupons_code_course_idx').on(t.courseId, t.code),
  ],
);

// ─── Course Reviews ────────────────────────────────────────────────────────────
export const courseReviews = pgTable(
  'course_reviews',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    courseId: uuid('course_id').references(() => courses.id, { onDelete: 'cascade' }).notNull(),
    learnerId: uuid('learner_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    rating: integer('rating').notNull(), // 1-5
    body: text('body'),
    isPublic: boolean('is_public').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('reviews_course_idx').on(t.courseId)],
);

// ─── Course Bundles ────────────────────────────────────────────────────────────
export const courseBundles = pgTable('course_bundles', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').references(() => orgs.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const courseBundleItems = pgTable('course_bundle_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  bundleId: uuid('bundle_id').references(() => courseBundles.id, { onDelete: 'cascade' }).notNull(),
  courseId: uuid('course_id').references(() => courses.id, { onDelete: 'cascade' }).notNull(),
});

// ─── TypeScript inferred types ─────────────────────────────────────────────────
export type Course = typeof courses.$inferSelect;
export type NewCourse = typeof courses.$inferInsert;
export type CourseEnrollment = typeof courseEnrollments.$inferSelect;
export type Credits = typeof credits.$inferSelect;
export type Coupon = typeof coupons.$inferSelect;
export type CreditLedgerEntry = typeof creditLedger.$inferSelect;
