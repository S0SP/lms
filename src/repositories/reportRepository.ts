import { db } from '@/lib/drizzle';
import {
  monthlyReports,
  users,
  courses,
  sessions,
  sessionAttendees,
  sessionFeedback,
  credits,
  courseEnrollments,
  zoomAttendance,
  parentProfiles,
} from '@/db/schema';
import { eq, and, desc, gte, lt, sql, isNull, inArray } from 'drizzle-orm';

export interface ReportQueryFilters {
  role: string;
  userId: string;
  learnerId?: string;
  courseId?: string;
  status?: string;
  page?: number;
  perPage?: number;
}

function parseMonthYearSlug(slug: string): { start: Date; end: Date } | null {
  const s = slug.trim().toLowerCase();

  const toRange = (year: number, monthIdx: number) => ({
    // Buffer by 24h to accommodate timezone offsets (e.g. UTC+05:30 stores Aug 1st local as July 31st 18:30 UTC)
    start: new Date(Date.UTC(year, monthIdx, 1) - 24 * 3600 * 1000),
    end: new Date(Date.UTC(year, monthIdx + 1, 1) - 24 * 3600 * 1000),
  });

  // Format: "YYYY-MM" (e.g. "2026-08")
  const yyyyMm = /^(\d{4})-(\d{1,2})$/.exec(s);
  if (yyyyMm) {
    const year = parseInt(yyyyMm[1], 10);
    const month = parseInt(yyyyMm[2], 10) - 1;
    if (month >= 0 && month <= 11) {
      return toRange(year, month);
    }
  }

  // Format: "month-YYYY" (e.g. "august-2026", "aug-2026")
  const monthNames = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december',
  ];
  const shortMonthNames = [
    'jan', 'feb', 'mar', 'apr', 'may', 'jun',
    'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
  ];

  const monthYear = /^([a-z]+)-(\d{4})$/.exec(s);
  if (monthYear) {
    const mStr = monthYear[1];
    const year = parseInt(monthYear[2], 10);
    let monthIdx = monthNames.indexOf(mStr);
    if (monthIdx === -1) {
      monthIdx = shortMonthNames.indexOf(mStr);
    }
    if (monthIdx !== -1) {
      return toRange(year, monthIdx);
    }
  }

  return null;
}

export const reportRepository = {
  async findMany(filters: ReportQueryFilters) {
    const { role, userId, learnerId, courseId, status } = filters;
    const page = filters.page || 1;
    const perPage = filters.perPage || 20;

    const conditions = [
      learnerId ? eq(monthlyReports.learnerId, learnerId) : undefined,
      courseId ? eq(monthlyReports.courseId, courseId) : undefined,
      status ? eq(monthlyReports.status, status as never) : undefined,
      // Learner: only their own sent reports
      role === 'learner'
        ? and(eq(monthlyReports.learnerId, userId), eq(monthlyReports.status, 'sent'))
        : undefined,
      // Parent: only child's sent reports
      role === 'parent'
        ? and(
            sql`${monthlyReports.learnerId} IN (
              SELECT learner_id FROM parent_profiles WHERE user_id = ${userId}
            )`,
            eq(monthlyReports.status, 'sent'),
          )
        : undefined,
      // Educator: reports for learners enrolled in their courses
      role === 'educator'
        ? sql`${monthlyReports.courseId} IN (
            SELECT course_id FROM course_educators WHERE educator_id = ${userId}
          )`
        : undefined,
    ].filter((c): c is NonNullable<typeof c> => c !== undefined);

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [result, totalResult] = await Promise.all([
      db
        .select({
          id: monthlyReports.id,
          learnerId: monthlyReports.learnerId,
          learnerName: users.name,
          learnerAvatarUrl: users.avatarUrl,
          courseId: monthlyReports.courseId,
          courseName: courses.name,
          monthYear: monthlyReports.monthYear,
          status: monthlyReports.status,
          headline: sql<string | null>`${monthlyReports.sectionsJson}->>'headline'`,
          overallScore: sql<number | null>`(${monthlyReports.sectionsJson}->>'overallScore')::int`,
          sentAt: monthlyReports.sentAt,
          generatedAt: monthlyReports.generatedAt,
          createdAt: monthlyReports.createdAt,
        })
        .from(monthlyReports)
        .leftJoin(users, eq(monthlyReports.learnerId, users.id))
        .leftJoin(courses, eq(monthlyReports.courseId, courses.id))
        .where(whereClause)
        .orderBy(desc(monthlyReports.monthYear), desc(monthlyReports.createdAt))
        .limit(perPage)
        .offset((page - 1) * perPage),

      db.select({ count: sql<number>`count(*)::int` }).from(monthlyReports).where(whereClause),
    ]);

    return {
      reports: result,
      total: totalResult[0]?.count ?? 0,
      page,
      perPage,
    };
  },

  /** Full report row plus names, for the detail view. Supports either report UUID or month slug (e.g. 'august-2026', '2026-08'). */
  async findById(id: string, viewerLearnerId?: string) {
    const trimmedId = id.trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmedId);

    if (isUuid) {
      const [report] = await db
        .select({
          id: monthlyReports.id,
          learnerId: monthlyReports.learnerId,
          learnerName: users.name,
          courseId: monthlyReports.courseId,
          courseName: courses.name,
          monthYear: monthlyReports.monthYear,
          status: monthlyReports.status,
          sectionsJson: monthlyReports.sectionsJson,
          selectedSessionIds: monthlyReports.selectedSessionIds,
          shareToken: monthlyReports.shareToken,
          brandTheme: monthlyReports.brandTheme,
          aiDraft: monthlyReports.aiDraft,
          editedContent: monthlyReports.editedContent,
          generatedAt: monthlyReports.generatedAt,
          sentAt: monthlyReports.sentAt,
          createdAt: monthlyReports.createdAt,
          updatedAt: monthlyReports.updatedAt,
        })
        .from(monthlyReports)
        .leftJoin(users, eq(monthlyReports.learnerId, users.id))
        .leftJoin(courses, eq(monthlyReports.courseId, courses.id))
        .where(eq(monthlyReports.id, trimmedId))
        .limit(1);

      return report ?? null;
    }

    // Attempt to parse as month-year slug (e.g. "august-2026" or "2026-08")
    const dateRange = parseMonthYearSlug(trimmedId);
    if (!dateRange) {
      // Neither UUID nor valid date slug — safe return null without SQL error
      return null;
    }

    const conditions = [
      gte(monthlyReports.monthYear, dateRange.start),
      lt(monthlyReports.monthYear, dateRange.end),
    ];
    if (viewerLearnerId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(viewerLearnerId)) {
      conditions.push(eq(monthlyReports.learnerId, viewerLearnerId));
    }

    const [report] = await db
      .select({
        id: monthlyReports.id,
        learnerId: monthlyReports.learnerId,
        learnerName: users.name,
        courseId: monthlyReports.courseId,
        courseName: courses.name,
        monthYear: monthlyReports.monthYear,
        status: monthlyReports.status,
        sectionsJson: monthlyReports.sectionsJson,
        aiDraft: monthlyReports.aiDraft,
        editedContent: monthlyReports.editedContent,
        generatedAt: monthlyReports.generatedAt,
        sentAt: monthlyReports.sentAt,
        createdAt: monthlyReports.createdAt,
        updatedAt: monthlyReports.updatedAt,
      })
      .from(monthlyReports)
      .leftJoin(users, eq(monthlyReports.learnerId, users.id))
      .leftJoin(courses, eq(monthlyReports.courseId, courses.id))
      .where(and(...conditions))
      .orderBy(desc(monthlyReports.sentAt), desc(monthlyReports.createdAt))
      .limit(1);

    return report ?? null;
  },

  /** Finds a report by its public share token for parent/external link viewing. */
  async findByShareToken(shareToken: string) {
    if (!shareToken) return null;
    const [report] = await db
      .select({
        id: monthlyReports.id,
        learnerId: monthlyReports.learnerId,
        learnerName: users.name,
        courseId: monthlyReports.courseId,
        courseName: courses.name,
        monthYear: monthlyReports.monthYear,
        status: monthlyReports.status,
        sectionsJson: monthlyReports.sectionsJson,
        selectedSessionIds: monthlyReports.selectedSessionIds,
        shareToken: monthlyReports.shareToken,
        brandTheme: monthlyReports.brandTheme,
        aiDraft: monthlyReports.aiDraft,
        editedContent: monthlyReports.editedContent,
        generatedAt: monthlyReports.generatedAt,
        sentAt: monthlyReports.sentAt,
        createdAt: monthlyReports.createdAt,
        updatedAt: monthlyReports.updatedAt,
      })
      .from(monthlyReports)
      .leftJoin(users, eq(monthlyReports.learnerId, users.id))
      .leftJoin(courses, eq(monthlyReports.courseId, courses.id))
      .where(eq(monthlyReports.shareToken, shareToken))
      .limit(1);

    return report ?? null;
  },

  /**
   * Active learner/course pairs that are eligible for a report.
   * Ordered so a truncated `limit` produces a stable, predictable slice.
   */
  async listEligibleEnrollments(limit: number) {
    return await db
      .select({
        learnerId: courseEnrollments.learnerId,
        learnerName: users.name,
        courseId: courseEnrollments.courseId,
        courseName: courses.name,
      })
      .from(courseEnrollments)
      .innerJoin(users, eq(courseEnrollments.learnerId, users.id))
      .innerJoin(courses, eq(courseEnrollments.courseId, courses.id))
      .where(eq(courseEnrollments.status, 'active'))
      .orderBy(users.name, courses.name)
      .limit(limit);
  },

  /**
   * The single report for a learner/course/month, if one exists.
   * Used to short-circuit regeneration and to enforce the natural key.
   */
  async findByScope(learnerId: string, courseId: string, monthYear: Date) {
    const [report] = await db
      .select({
        id: monthlyReports.id,
        status: monthlyReports.status,
        monthYear: monthlyReports.monthYear,
        generatedAt: monthlyReports.generatedAt,
        sentAt: monthlyReports.sentAt,
      })
      .from(monthlyReports)
      .where(
        and(
          eq(monthlyReports.learnerId, learnerId),
          eq(monthlyReports.courseId, courseId),
          eq(monthlyReports.monthYear, monthYear),
        ),
      )
      .limit(1);

    return report ?? null;
  },

  /**
   * Everything Gemini needs to write a monthly report: who the learner is,
   * the course context, and the month's sessions with educator feedback,
   * attendance, and Zoom audio transcripts. Returns null when the learner is not enrolled in the course.
   */
  async collectGenerationContext(
    learnerId: string,
    courseId: string,
    monthStart: Date,
    selectedSessionIds?: string[],
  ) {
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);

    const [learnerRows, courseRows, enrollmentRows] = await Promise.all([
      db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          grade: sql<string | null>`(SELECT grade FROM learner_profiles WHERE user_id = ${users.id})`,
          board: sql<string | null>`(SELECT board FROM learner_profiles WHERE user_id = ${users.id})`,
        })
        .from(users)
        .where(eq(users.id, learnerId))
        .limit(1),
      db
        .select({
          id: courses.id,
          name: courses.name,
          board: courses.board,
          grade: courses.grade,
          type: courses.type,
        })
        .from(courses)
        .where(eq(courses.id, courseId))
        .limit(1),
      db
        .select({ status: courseEnrollments.status, enrolledAt: courseEnrollments.enrolledAt })
        .from(courseEnrollments)
        .where(
          and(
            eq(courseEnrollments.courseId, courseId),
            eq(courseEnrollments.learnerId, learnerId),
          ),
        )
        .limit(1),
    ]);

    if (!learnerRows[0] || !courseRows[0]) return null;

    // Build session filter: either explicit selectedSessionIds or sessions in date range
    const sessionConditions = [eq(sessionAttendees.learnerId, learnerId)];
    if (selectedSessionIds && selectedSessionIds.length > 0) {
      sessionConditions.push(inArray(sessions.id, selectedSessionIds));
    } else {
      sessionConditions.push(
        gte(sessions.scheduledAt, monthStart),
        lt(sessions.scheduledAt, monthEnd),
      );
    }

    // Sessions in the target period that this learner was booked into.
    const monthSessions = await db
      .select({
        id: sessions.id,
        title: sessions.title,
        topic: sessions.topic,
        scheduledAt: sessions.scheduledAt,
        durationMin: sessions.durationMin,
        status: sessions.status,
        creditsConsumed: sessions.creditsConsumed,
        transcriptText: sessions.transcriptText,
        transcriptVtt: sessions.transcriptVtt,
        aiSummary: sessions.aiSummary,
        educatorName: sql<string | null>`(SELECT name FROM users WHERE id = ${sessions.educatorId})`,
        topicsCovered: sessionFeedback.topicsCovered,
        comments: sessionFeedback.comments,
        homeworkAssigned: sessionFeedback.homeworkAssigned,
      })
      .from(sessions)
      .innerJoin(sessionAttendees, eq(sessionAttendees.sessionId, sessions.id))
      .leftJoin(sessionFeedback, eq(sessionFeedback.sessionId, sessions.id))
      .where(and(...sessionConditions))
      .orderBy(sessions.scheduledAt);

    // Attendance totals for the sessions (from Zoom webhooks).
    const sessionIds = monthSessions.map((s) => s.id);
    const [attendance] = sessionIds.length
      ? await db
          .select({
            totalJoins: sql<number>`count(*)::int`,
            totalSeconds: sql<number>`COALESCE(sum(${zoomAttendance.durationSeconds}), 0)::int`,
          })
          .from(zoomAttendance)
          .where(
            and(
              inArray(zoomAttendance.sessionId, sessionIds),
              eq(zoomAttendance.event, 'joined'),
            ),
          )
      : [{ totalJoins: 0, totalSeconds: 0 }];

    // Credit balance for the course.
    const [credit] = await db
      .select({ total: credits.total, consumed: credits.consumed })
      .from(credits)
      .where(and(eq(credits.courseId, courseId), eq(credits.learnerId, learnerId)))
      .limit(1);

    // Parents to notify when the report is sent.
    const parents = await db
      .select({ name: parentProfiles.name, email: parentProfiles.email })
      .from(parentProfiles)
      .where(eq(parentProfiles.learnerId, learnerId));

    const completed = monthSessions.filter((s) => s.status === 'completed').length;
    const noShows = monthSessions.filter((s) => s.status === 'no_show').length;

    return {
      learner: learnerRows[0],
      course: courseRows[0],
      enrollment: enrollmentRows[0] ?? null,
      parents,
      sessions: monthSessions,
      stats: {
        totalSessions: monthSessions.length,
        completedSessions: completed,
        noShows,
        attendanceJoins: attendance?.totalJoins ?? 0,
        attendanceSeconds: attendance?.totalSeconds ?? 0,
        sessionsWithFeedback: monthSessions.filter((s) => s.comments || s.topicsCovered).length,
        creditsRemaining: credit ? Number(credit.total) - Number(credit.consumed) : null,
      },
    };
  },

  /** Insert-or-update the draft for a learner/course/month. */
  async upsertDraft(input: {
    learnerId: string;
    courseId: string;
    monthYear: Date;
    sectionsJson: unknown;
    aiDraft: string;
    selectedSessionIds?: string[];
    shareToken?: string;
    brandTheme?: string;
  }) {
    const [existing] = await db
      .select({ id: monthlyReports.id })
      .from(monthlyReports)
      .where(
        and(
          eq(monthlyReports.learnerId, input.learnerId),
          eq(monthlyReports.courseId, input.courseId),
          eq(monthlyReports.monthYear, input.monthYear),
        ),
      )
      .limit(1);

    const shareToken = input.shareToken || crypto.randomUUID();
    const brandTheme = input.brandTheme || 'unboundyou-brand';

    if (existing) {
      const [updated] = await db
        .update(monthlyReports)
        .set({
          sectionsJson: input.sectionsJson,
          aiDraft: input.aiDraft,
          selectedSessionIds: input.selectedSessionIds ? (input.selectedSessionIds as any) : undefined,
          shareToken,
          brandTheme,
          // Regenerating resets an unsent report to draft; a sent report stays sent.
          generatedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(monthlyReports.id, existing.id))
        .returning();
      return { report: updated, created: false };
    }

    const [created] = await db
      .insert(monthlyReports)
      .values({
        learnerId: input.learnerId,
        courseId: input.courseId,
        monthYear: input.monthYear,
        sectionsJson: input.sectionsJson,
        aiDraft: input.aiDraft,
        selectedSessionIds: input.selectedSessionIds ? (input.selectedSessionIds as any) : undefined,
        shareToken,
        brandTheme,
        generatedAt: new Date(),
      })
      .returning();
    return { report: created, created: true };
  },

  /** Applies human edits without touching the AI draft (kept for audit). */
  async updateContent(
    id: string,
    patch: { sectionsJson?: unknown; editedContent?: string },
  ) {
    const [updated] = await db
      .update(monthlyReports)
      .set({
        ...(patch.sectionsJson !== undefined ? { sectionsJson: patch.sectionsJson } : {}),
        ...(patch.editedContent !== undefined ? { editedContent: patch.editedContent } : {}),
        updatedAt: new Date(),
      })
      .where(eq(monthlyReports.id, id))
      .returning();
    return updated ?? null;
  },

  /**
   * Everyone who should be notified when a report is sent: the learner plus
   * every linked parent. Returns emails only — names included for the greeting.
   */
  async getRecipients(learnerId: string) {
    const [learner, parents] = await Promise.all([
      db
        .select({ name: users.name, email: users.email })
        .from(users)
        .where(eq(users.id, learnerId))
        .limit(1),
      db
        .select({ name: parentProfiles.name, email: parentProfiles.email })
        .from(parentProfiles)
        .where(eq(parentProfiles.learnerId, learnerId)),
    ]);

    return {
      learner: learner[0] ?? null,
      parents: parents.filter((p) => !!p.email),
    };
  },

  /** True when this user is a linked parent of the learner. */
  async isLinkedParent(parentUserId: string, learnerId: string) {
    const [row] = await db
      .select({ one: sql<number>`1` })
      .from(parentProfiles)
      .where(
        and(
          eq(parentProfiles.userId, parentUserId),
          eq(parentProfiles.learnerId, learnerId),
        ),
      )
      .limit(1);
    return !!row;
  },

  /**
   * Marks a report sent. Terminal state — refuses to re-send so parents never
   * receive a duplicate notification.
   */
  async markSent(id: string, sentBy: string) {
    const [updated] = await db
      .update(monthlyReports)
      .set({ status: 'sent', sentAt: new Date(), sentBy, updatedAt: new Date() })
      .where(and(eq(monthlyReports.id, id), isNull(monthlyReports.sentAt)))
      .returning();
    return updated ?? null;
  },
};
