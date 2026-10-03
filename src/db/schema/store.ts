import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  numeric,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { orgs } from './orgs';
import { users } from './users';
import { courses } from './courses';
import { courseEnrollments } from './courses';
import { coupons } from './courses';

// ─── Enums ────────────────────────────────────────────────────────────────────
export const paymentProviderEnum = pgEnum('payment_provider', ['razorpay', 'stripe', 'manual']);
export const paymentStatusEnum = pgEnum('payment_status', [
  'created',
  'paid',
  'failed',
  'refunded',
]);
export const consultationStatusEnum = pgEnum('consultation_status', [
  'pending',
  'confirmed',
  'completed',
  'cancelled',
  'converted',
]);

// ─── Store Settings (one row per org — public storefront hero) ─────────────────
export const storeSettings = pgTable('store_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id')
    .references(() => orgs.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  title: text('title'),
  subtitle: text('subtitle'),
  bgColor: text('bg_color').default('#ffffff'),
  textColor: text('text_color').default('#000000'),
  logoUrl: text('logo_url'),
  coverImageUrl: text('cover_image_url'),
  externalUrl: text('external_url'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Payment Transactions (populated by Razorpay webhook) ─────────────────────
export const paymentTransactions = pgTable(
  'payment_transactions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    enrollmentId: uuid('enrollment_id').references(() => courseEnrollments.id).notNull(),
    provider: paymentProviderEnum('provider').notNull().default('razorpay'),
    // Provider's order/payment ID
    providerRefId: text('provider_ref_id').notNull(),
    amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
    currency: text('currency').notNull().default('INR'),
    couponId: uuid('coupon_id').references(() => coupons.id),
    status: paymentStatusEnum('status').notNull().default('created'),
    // Full webhook payload for audit/debugging
    rawPayloadJson: jsonb('raw_payload_json'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('payment_tx_enrollment_idx').on(t.enrollmentId),
    index('payment_tx_provider_ref_idx').on(t.providerRefId),
    index('payment_tx_status_idx').on(t.status),
  ],
);

// ─── Consultations (discovery/trial booking → convert to learner) ─────────────
export const consultations = pgTable(
  'consultations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orgId: uuid('org_id').references(() => orgs.id, { onDelete: 'cascade' }).notNull(),
    prospectName: text('prospect_name').notNull(),
    prospectEmail: text('prospect_email').notNull(),
    prospectPhone: text('prospect_phone'),
    courseId: uuid('course_id').references(() => courses.id),
    slotAt: timestamp('slot_at', { withTimezone: true }),
    status: consultationStatusEnum('status').notNull().default('pending'),
    notes: text('notes'),
    // Set when consultation is converted to a full enrolment
    convertedToLearnerId: uuid('converted_to_learner_id').references(() => users.id),
    convertedAt: timestamp('converted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('consultations_org_idx').on(t.orgId),
    index('consultations_status_idx').on(t.status),
    index('consultations_email_idx').on(t.prospectEmail),
  ],
);

export type StoreSettings = typeof storeSettings.$inferSelect;
export type PaymentTransaction = typeof paymentTransactions.$inferSelect;
export type Consultation = typeof consultations.$inferSelect;
export type NewConsultation = typeof consultations.$inferInsert;
