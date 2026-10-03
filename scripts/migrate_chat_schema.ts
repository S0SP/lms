import { db } from '../src/lib/drizzle';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Migrating chat schema...');

  await db.execute(sql`ALTER TYPE "chat_thread_type" ADD VALUE IF NOT EXISTS 'admin_support';`);

  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "chat_message_kind" AS ENUM('text', 'file', 'system');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await db.execute(sql`
    DROP TABLE IF EXISTS "chat_messages" CASCADE;
    DROP TABLE IF EXISTS "chat_members" CASCADE;
    DROP TABLE IF EXISTS "chat_threads" CASCADE;
  `);

  await db.execute(sql`
    CREATE TABLE "chat_threads" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "course_id" uuid REFERENCES "courses"("id") ON DELETE cascade,
      "type" "chat_thread_type" DEFAULT 'course_group' NOT NULL,
      "title" text,
      "participant_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
      "last_message_at" timestamp with time zone,
      "last_message_preview" text,
      "message_version" timestamp with time zone,
      "archived_at" timestamp with time zone,
      "created_by" uuid REFERENCES "users"("id") ON DELETE set null,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`CREATE INDEX IF NOT EXISTS "chat_threads_course_idx" ON "chat_threads" USING btree ("course_id");`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "chat_threads_type_idx" ON "chat_threads" USING btree ("type");`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "chat_threads_last_msg_idx" ON "chat_threads" USING btree ("last_message_at");`);

  await db.execute(sql`
    CREATE TABLE "chat_members" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "thread_id" uuid NOT NULL REFERENCES "chat_threads"("id") ON DELETE cascade,
      "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
      "display_name" text,
      "avatar_url" text,
      "last_read_at" timestamp with time zone,
      "muted_at" timestamp with time zone,
      "added_at" timestamp with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS "chat_members_thread_user_uq" ON "chat_members" ("thread_id", "user_id");`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "chat_members_user_idx" ON "chat_members" ("user_id");`);

  await db.execute(sql`
    CREATE TABLE "chat_messages" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "thread_id" uuid NOT NULL REFERENCES "chat_threads"("id") ON DELETE cascade,
      "sender_id" uuid REFERENCES "users"("id") ON DELETE set null,
      "kind" "chat_message_kind" DEFAULT 'text' NOT NULL,
      "body" text NOT NULL,
      "attachment" jsonb,
      "client_id" text,
      "edited_at" timestamp with time zone,
      "deleted_at" timestamp with time zone,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL
    );
  `);

  await db.execute(sql`CREATE INDEX IF NOT EXISTS "chat_messages_thread_created_idx" ON "chat_messages" ("thread_id", "created_at");`);
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS "chat_messages_client_id_uq" ON "chat_messages" ("thread_id", "sender_id", "client_id");`);

  console.log('✅ Chat schema migration completed successfully!');
  process.exit(0);
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
