/**
 * Schema barrel export — import from '@/db/schema' to get everything.
 * Drizzle client is initialized with this full schema object to enable db.query.*
 */

// Orgs (tenant root)
export * from './orgs';

// Users & profiles
export * from './users';

// Tags
export * from './tags';

// Courses & commerce
export * from './courses';

// Content (sections, resources, video/file assets, progress)
export * from './content';

// Testing (test builder, questions, attempts, answers)
export * from './testing';

// Assessments (rubric-graded, not auto-graded)
export * from './assessments';

// Timeline (posts, polls, comments)
export * from './timeline';

// Sessions (core scheduling unit)
export * from './sessions';

// Availability (recurring schedule, leaves, conflicts)
export * from './availability';

// Attendance (Zoom webhook auto-log)
export * from './attendance';

// Payouts
export * from './payouts';

// Monthly AI reports
export * from './reports';

// Store, payments & consultations
export * from './store';

// Google Calendar integration
export * from './calendar';

// Notifications
export * from './notifications';

// Email log
export * from './email';

// Chat (Postgres is the source of truth; Ably only fans out events)
export * from './chat';

// Drizzle relations (must be exported for db.query.* to work)
export * from './relations';
