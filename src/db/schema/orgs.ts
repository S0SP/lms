import { pgTable, uuid, text, timestamp, integer } from 'drizzle-orm/pg-core';

export const orgs = pgTable('orgs', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  subdomain: text('subdomain').notNull().unique(),
  logoUrl: text('logo_url'),
  minAttendanceMinutes: integer('min_attendance_minutes').notNull().default(40),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
