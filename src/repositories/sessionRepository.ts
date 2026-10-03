import { db } from '@/lib/drizzle';
import { sessions, sessionAttendees, users, courses, sessionFeedback, credits } from '@/db/schema';

import { eq, and, desc, gte, lte, sql, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { createSessionSchema } from '@/validators/sessionValidator';

export type CreateSessionParams = z.infer<typeof createSessionSchema> & {
  zoomMeetingId?: string | null;
  zoomMeetingUrl?: string | null;
  googleCalendarEventId?: string | null;
};

export interface SessionQueryFilters {
  from?: string;
  to?: string;
  status?: string;
  courseId?: string;
  courseIds?: string[];
  educatorId?: string;
  educatorIds?: string[];
  learnerId?: string;
  learnerIds?: string[];
  location?: string;
  parentUserId?: string; // ID of the parent user
  page?: number;
  perPage?: number;
}

export const sessionRepository = {
  async findMany(filters: SessionQueryFilters) {
    const page = filters.page || 1;
    const perPage = filters.perPage || 50;

    const conditions = [
      filters.from ? gte(sessions.scheduledAt, new Date(filters.from)) : undefined,
      filters.to ? lte(sessions.scheduledAt, new Date(filters.to)) : undefined,
      filters.status ? eq(sessions.status, filters.status as any) : undefined,
      filters.courseIds && filters.courseIds.length > 0
        ? inArray(sessions.courseId, filters.courseIds)
        : filters.courseId
        ? eq(sessions.courseId, filters.courseId)
        : undefined,
      filters.educatorIds && filters.educatorIds.length > 0
        ? inArray(sessions.educatorId, filters.educatorIds)
        : filters.educatorId
        ? eq(sessions.educatorId, filters.educatorId)
        : undefined,
      filters.learnerIds && filters.learnerIds.length > 0
        ? sql`${sessions.id} IN (
            SELECT session_id FROM session_attendees WHERE learner_id IN (${sql.join(filters.learnerIds.map(id => sql`${id}`), sql`, `)})
          )`
        : filters.learnerId
        ? sql`${sessions.id} IN (
            SELECT session_id FROM session_attendees WHERE learner_id = ${filters.learnerId}
          )`
        : undefined,
      filters.parentUserId
        ? sql`${sessions.id} IN (
            SELECT sa.session_id FROM session_attendees sa
            JOIN parent_profiles pp ON pp.learner_id = sa.learner_id
            WHERE pp.user_id = ${filters.parentUserId}
          )`
        : undefined,
    ].filter((c): c is NonNullable<typeof c> => c !== undefined);

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const result = await db
      .select({
        id: sessions.id,
        title: sessions.title,
        topic: sessions.topic,
        scheduledAt: sessions.scheduledAt,
        durationMin: sessions.durationMin,
        status: sessions.status,
        zoomMeetingUrl: sessions.zoomMeetingUrl,
        googleCalendarEventId: sessions.googleCalendarEventId,
        creditsConsumed: sessions.creditsConsumed,
        courseId: sessions.courseId,
        educatorId: sessions.educatorId,
        actualStartAt: sessions.actualStartAt,
        actualEndAt: sessions.actualEndAt,
        recordingUrl: sessions.recordingUrl,
        aiSummary: sessions.aiSummary,
        educatorName: users.name,
      })
      .from(sessions)
      .leftJoin(users, eq(sessions.educatorId, users.id))
      .where(whereClause)
      .orderBy(desc(sessions.scheduledAt))
      .limit(perPage)
      .offset((page - 1) * perPage);

    return {
      sessions: result,
      page,
      perPage,
    };
  },

  async create(data: CreateSessionParams) {
    return await db.transaction(async (tx) => {
      // 1. Create the session
      const [sess] = await tx
        .insert(sessions)
        .values({
          courseId: data.courseId,
          educatorId: data.educatorId,
          title: data.title,
          topic: data.topic,
          scheduledAt: new Date(data.scheduledAt),
          durationMin: data.durationMin,
          creditsConsumed: data.creditsConsumed !== undefined && data.creditsConsumed !== null ? String(data.creditsConsumed) : '1.0',
          zoomMeetingId: data.zoomMeetingId ?? null,
          zoomMeetingUrl: data.zoomMeetingUrl ?? null,
          googleCalendarEventId: data.googleCalendarEventId ?? null,
        })
        .returning();

      // 2. Add attendees
      if (data.learnerIds && data.learnerIds.length > 0) {
        await tx.insert(sessionAttendees).values(
          data.learnerIds.map((learnerId) => ({
            sessionId: sess.id,
            learnerId,
          }))
        );
      }

      return sess;
    });
  },

  async findById(id: string) {
    const [sess] = await db
      .select({
        id: sessions.id,
        title: sessions.title,
        topic: sessions.topic,
        scheduledAt: sessions.scheduledAt,
        durationMin: sessions.durationMin,
        status: sessions.status,
        zoomMeetingUrl: sessions.zoomMeetingUrl,
        zoomMeetingId: sessions.zoomMeetingId,
        googleCalendarEventId: sessions.googleCalendarEventId,
        creditsConsumed: sessions.creditsConsumed,
        actualStartAt: sessions.actualStartAt,
        actualEndAt: sessions.actualEndAt,
        courseId: sessions.courseId,
        educatorId: sessions.educatorId,
        recordingUrl: sessions.recordingUrl,
        recordingDuration: sessions.recordingDuration,
        recordingFiles: sessions.recordingFiles,
        aiSummary: sessions.aiSummary,
        educatorName: users.name,
        courseName: courses.name,
      })
      .from(sessions)
      .leftJoin(users, eq(sessions.educatorId, users.id))
      .leftJoin(courses, eq(sessions.courseId, courses.id))
      .where(eq(sessions.id, id))
      .limit(1);
    
    return sess;
  },

  async getAttendees(sessionId: string) {
    return await db
      .select({ id: users.id, name: users.name, email: users.email, avatarUrl: users.avatarUrl })
      .from(sessionAttendees)
      .leftJoin(users, eq(sessionAttendees.learnerId, users.id))
      .where(eq(sessionAttendees.sessionId, sessionId));
  },

  async getFeedback(sessionId: string) {
    const [fb] = await db.select().from(sessionFeedback).where(eq(sessionFeedback.sessionId, sessionId)).limit(1);
    return fb ?? null;
  },

  async submitFeedback(sessionId: string, data: any, educatorId: string, courseId: string) {
    return await db.transaction(async (tx) => {
      const creditsToConsume = data.creditsConsumed;
      
      const [fb] = await tx
        .insert(sessionFeedback)
        .values({
          sessionId,
          educatorId,
          topicsCovered: data.topicsCovered,
          comments: data.comments,
          homeworkAssigned: data.homeworkAssigned,
          creditsConsumed: String(creditsToConsume),
          submittedAt: new Date(),
        })
        .returning();

      // Mark session as completed
      await tx
        .update(sessions)
        .set({ status: 'completed', updatedAt: new Date() })
        .where(eq(sessions.id, sessionId));

      // Atomically deduct credits for ALL attendees
      const attendees = await tx
        .select({ learnerId: sessionAttendees.learnerId })
        .from(sessionAttendees)
        .where(eq(sessionAttendees.sessionId, sessionId));

      for (const { learnerId } of attendees) {
        await tx
          .update(credits)
          .set({
            consumed: sql`consumed + ${creditsToConsume}`,
            updatedAt: new Date(),
          })
          .where(and(eq(credits.courseId, courseId), eq(credits.learnerId, learnerId)));
      }

      return fb;
    });
  },


  async update(id: string, data: Partial<z.infer<typeof createSessionSchema>> & { status?: any, cancelledAt?: Date, cancelledBy?: string }) {
    const updateData: Record<string, any> = { updatedAt: new Date(), ...data };
    
    const [updated] = await db
      .update(sessions)
      .set(updateData)
      .where(eq(sessions.id, id))
      .returning();
      
    return updated;
  },

  async delete(id: string) {
    await db.delete(sessions).where(eq(sessions.id, id));
  }
};

