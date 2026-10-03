import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  boolean,
  numeric,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { orgs } from './orgs';

// ─── Enums ────────────────────────────────────────────────────────────────────
export const roleEnum = pgEnum('user_role', ['owner', 'admin', 'educator', 'learner', 'parent']);
export const platformEnum = pgEnum('device_platform', ['ios', 'android', 'web']);

// ─── Core users table (all 4 portals authenticate through here) ───────────────
export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orgId: uuid('org_id').references(() => orgs.id, { onDelete: 'cascade' }),
    email: text('email').notNull().unique(),
    phone: text('phone'),
    name: text('name').notNull(),
    avatarUrl: text('avatar_url'),
    role: roleEnum('role').notNull().default('learner'),
    passwordHash: text('password_hash'), // Argon2id; null for OAuth-only users
    loginPin: text('login_pin'), // 4-digit PIN for student/learner login
    isActive: boolean('is_active').notNull().default(true),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('users_email_idx').on(t.email),
    index('users_org_role_idx').on(t.orgId, t.role),
    index('users_phone_idx').on(t.phone),
  ],
);

// ─── Educator profiles (1:1 extension of users) ───────────────────────────────
export const educatorProfiles = pgTable('educator_profiles', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  tagline: text('tagline'),
  about: text('about'),
  youtubeUrl: text('youtube_url'),
  coverPhotoUrl: text('cover_photo_url'),
  tags: jsonb('tags').$type<string[]>().default([]),
  reviews: jsonb('reviews').$type<Array<{ id: string; studentName: string; rating: number; comment: string; date: string }>>().default([]),
  payoutDefaultRate: numeric('payout_default_rate', { precision: 10, scale: 2 }).default('0'),
  payoutCurrency: text('payout_currency').notNull().default('INR'),
  payoutDetails: jsonb('payout_details').$type<{
    beneficiaryName?: string;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    upiId?: string;
    currency?: string;
  }>().default({}),
  bookingPreferences: jsonb('booking_preferences').$type<{
    minNotice?: string;
    bufferTime?: string;
    restrictAdjacent?: boolean;
    limitFuture?: string;
  }>().default({
    minNotice: '1 hour',
    bufferTime: '0 mins',
    restrictAdjacent: false,
    limitFuture: '30 days',
  }),
  calendarConnected: boolean('calendar_connected').notNull().default(false),
  pinHash: text('pin_hash'), // bcrypt hash for 4-digit quick-access PIN
  zoomUserId: text('zoom_user_id'), // educator's connected Zoom account ID
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Learner profiles (1:1 extension of users) ────────────────────────────────
export const learnerProfiles = pgTable('learner_profiles', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  displayName: text('display_name'),
  dob: timestamp('dob', { withTimezone: true }),
  board: text('board'), // IGCSE, IB, CBSE, etc.
  grade: text('grade'),
  avatarUrl: text('avatar_url'),
  // SECURITY: This column must NEVER appear in non-admin queries
  // Always use .omit({ privateNote: true }) for educator/learner/parent endpoints
  privateNote: text('private_note'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Parent profiles (linked to a learner) ────────────────────────────────────
export const parentProfiles = pgTable(
  'parent_profiles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // userId is null until the parent activates a Parent-app login account
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    learnerId: uuid('learner_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    phone: text('phone'),
    relationship: text('relationship').default('parent'), // parent, guardian, etc.
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('parent_profiles_learner_idx').on(t.learnerId)],
);

// ─── Device tokens for push notifications ─────────────────────────────────────
export const deviceTokens = pgTable(
  'device_tokens',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    platform: platformEnum('platform').notNull(),
    token: text('token').notNull().unique(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('device_tokens_user_idx').on(t.userId)],
);

// ─── TypeScript inferred types ─────────────────────────────────────────────────
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type EducatorProfile = typeof educatorProfiles.$inferSelect;
export type LearnerProfile = typeof learnerProfiles.$inferSelect;
export type ParentProfile = typeof parentProfiles.$inferSelect;
