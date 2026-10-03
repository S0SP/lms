import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  numeric,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { sessions } from './sessions';

// ─── Enums ────────────────────────────────────────────────────────────────────
export const payoutStatusEnum = pgEnum('payout_status', [
  'in_review',
  'approved',
  'paid',
  'rejected',
]);

// ─── Payouts (admin creates, educator reads only) ─────────────────────────────
export const payouts = pgTable(
  'payouts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    educatorId: uuid('educator_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    // Period string e.g. "2026-08" (YYYY-MM)
    cyclePeriod: text('cycle_period').notNull(),
    amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
    currency: text('currency').notNull().default('INR'),
    status: payoutStatusEnum('status').notNull().default('in_review'),
    // Set when status transitions to 'paid'
    payoutDate: timestamp('payout_date', { withTimezone: true }),
    notes: text('notes'),
    processedBy: uuid('processed_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('payouts_educator_idx').on(t.educatorId),
    index('payouts_status_idx').on(t.status),
    index('payouts_cycle_idx').on(t.cyclePeriod),
  ],
);

// ─── Payout Session Links (line-item breakdown of each payout) ─────────────────
export const payoutSessionLinks = pgTable(
  'payout_session_links',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    payoutId: uuid('payout_id').references(() => payouts.id, { onDelete: 'cascade' }).notNull(),
    sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'restrict' }).notNull(),
    // The rate that was applied at the time of payout calculation
    rateApplied: numeric('rate_applied', { precision: 10, scale: 2 }).notNull(),
    creditsOrHours: numeric('credits_or_hours', { precision: 6, scale: 2 }).notNull(),
  },
  (t) => [
    index('payout_session_links_payout_idx').on(t.payoutId),
    index('payout_session_links_session_idx').on(t.sessionId),
  ],
);

export type Payout = typeof payouts.$inferSelect;
export type NewPayout = typeof payouts.$inferInsert;
export type PayoutSessionLink = typeof payoutSessionLinks.$inferSelect;
