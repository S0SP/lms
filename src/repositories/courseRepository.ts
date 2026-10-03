import { db } from '@/lib/drizzle';
import {
  courses,
  courseEducators,
  courseEnrollments,
  contentSections,
  contentResources,
  videoAssets,
  learnerContentProgress,
  credits,
  sessions,
  timelinePosts,
  timelineComments,
  polls,
  pollOptions,
  users,
  assessments,
  assessmentSubmissions,
  tests,
  testAttempts,
} from '@/db/schema';
import { eq, and, or, desc, asc, sql, ilike, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { createCourseSchema } from '@/validators/courseValidator';

export type CreateCourseParams = Omit<z.infer<typeof createCourseSchema>, 'orgId'> & {
  /** Resolved by courseService — never optional at the repository boundary. */
  orgId: string;
  createdBy: string;
  shortCode: string;
};

const RESOURCE_TYPES = [
  'video',
  'file',
  'test',
  'assessment',
  'youtube',
  'link',
  'embed',
  'chit_chat',
] as const;

type ResourceType = (typeof RESOURCE_TYPES)[number];

/** Legacy UI labels mapped onto the canonical enum; unknown values fall back to 'file'. */
const RESOURCE_TYPE_ALIASES: Record<string, ResourceType> = {
  doc: 'file',
  quiz: 'test',
};

function toResourceType(input: string): ResourceType {
  const alias = RESOURCE_TYPE_ALIASES[input];
  if (alias) return alias;
  return (RESOURCE_TYPES as readonly string[]).includes(input) ? (input as ResourceType) : 'file';
}

/** URL-safe slug, always returns a non-empty string. */
function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'course'
  );
}

export interface CourseQueryFilters {
  type?: string;
  status?: string;
  q?: string;
  educatorId?: string; // If filtering by a specific educator
  isTemplate?: boolean;
  page?: number;
  perPage?: number;
}

export const courseRepository = {
  async findMany(filters: CourseQueryFilters) {
    const page = filters.page || 1;
    const perPage = filters.perPage || 20;

    const conditions = [
      filters.type ? eq(courses.type, filters.type as any) : undefined,
      filters.status ? eq(courses.status, filters.status as any) : undefined,
      filters.isTemplate !== undefined ? eq(courses.isTemplate, filters.isTemplate) : undefined,
      filters.q ? ilike(courses.name, `%${filters.q}%`) : undefined,
      filters.educatorId
        ? sql`${courses.id} IN (SELECT course_id FROM course_educators WHERE educator_id = ${filters.educatorId})`
        : undefined,
    ].filter((c): c is NonNullable<typeof c> => c !== undefined);

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [coursesResult, totalResult] = await Promise.all([
      db
        .select({
          id: courses.id,
          name: courses.name,
          shortCode: courses.shortCode,
          type: courses.type,
          status: courses.status,
          thumbnailUrl: courses.thumbnailUrl,
          board: courses.board,
          grade: courses.grade,
          isTemplate: courses.isTemplate,
          templateId: courses.templateId,
          sellingPageJson: courses.sellingPageJson,
          defaultSessionDurationMin: courses.defaultSessionDurationMin,
          createdAt: courses.createdAt,
          enrollmentCount: sql<number>`(
            SELECT count(*)::int FROM course_enrollments
            WHERE course_id = ${courses.id} AND status = 'active'
          )`,
          educators: sql<any>`(
            SELECT COALESCE(json_agg(json_build_object('id', u.id, 'name', u.name, 'email', u.email, 'avatarUrl', u.avatar_url)), '[]'::json)
            FROM course_educators ce
            JOIN users u ON ce.educator_id = u.id
            WHERE ce.course_id = ${courses.id}
          )`,
        })
        .from(courses)
        .where(whereClause)
        .orderBy(desc(courses.createdAt))
        .limit(perPage)
        .offset((page - 1) * perPage),

      db
        .select({ count: sql<number>`count(*)::int` })
        .from(courses)
        .where(whereClause),
    ]);

    return {
      courses: coursesResult,
      total: totalResult[0]?.count ?? 0,
      page,
      perPage,
    };
  },

  async findById(id: string) {
    const [course] = await db
      .select()
      .from(courses)
      .where(eq(courses.id, id))
      .limit(1);

    if (!course) return null;

    // Fetch assigned educators
    const educatorsResult = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
        payoutRateOverride: courseEducators.payoutRateOverride,
      })
      .from(courseEducators)
      .innerJoin(users, eq(courseEducators.educatorId, users.id))
      .where(eq(courseEducators.courseId, id));

    // Fetch active enrollments count
    const [enrollmentStats] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(courseEnrollments)
      .where(
        and(
          eq(courseEnrollments.courseId, id),
          eq(courseEnrollments.status, 'active')
        )
      );

    // Fetch sections ordered by sortOrder
    const sectionsResult = await db
      .select()
      .from(contentSections)
      .where(eq(contentSections.courseId, id))
      .orderBy(asc(contentSections.sortOrder), asc(contentSections.createdAt));

    // Fetch all resources for all sections of this course
    const sectionIds = sectionsResult.map((s) => s.id);
    let resourcesBySectionId: Record<string, any[]> = {};

    if (sectionIds.length > 0) {
      const resourcesResult = await db
        .select()
        .from(contentResources)
        .where(inArray(contentResources.sectionId, sectionIds))
        .orderBy(asc(contentResources.sortOrder), asc(contentResources.createdAt));

      for (const res of resourcesResult) {
        if (!resourcesBySectionId[res.sectionId]) {
          resourcesBySectionId[res.sectionId] = [];
        }
        resourcesBySectionId[res.sectionId].push(res);
      }
    }

    const curriculum = sectionsResult.map((sec) => ({
      ...sec,
      resources: resourcesBySectionId[sec.id] || [],
    }));

    // Fetch enrolled learners
    const learnersResult = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        avatarUrl: users.avatarUrl,
        enrollmentId: courseEnrollments.id,
        enrolledAt: courseEnrollments.enrolledAt,
        status: courseEnrollments.status,
      })
      .from(courseEnrollments)
      .innerJoin(users, eq(courseEnrollments.learnerId, users.id))
      .where(eq(courseEnrollments.courseId, id));

    // Fetch credits for the primary enrolled learner (especially for 1-on-1)
    let creditsData = null;
    if (learnersResult.length > 0) {
      const [cr] = await db
        .select()
        .from(credits)
        .where(and(eq(credits.courseId, id), eq(credits.learnerId, learnersResult[0].id)))
        .limit(1);
      creditsData = cr || null;
    }

    return {
      ...course,
      educators: educatorsResult,
      learners: learnersResult,
      credits: creditsData,
      activeEnrollments: enrollmentStats?.count ?? 0,
      curriculum,
    };
  },


  async findPublicCatalog(filters: { category?: string; q?: string; page?: number; perPage?: number }) {
    const page = filters.page || 1;
    const perPage = filters.perPage || 12;

    const conditions = [
      eq(courses.status, 'published'),
      filters.q ? ilike(courses.name, `%${filters.q}%`) : undefined,
      filters.category && filters.category !== 'All'
        ? or(
            ilike(courses.board, `%${filters.category}%`),
            ilike(courses.description, `%${filters.category}%`),
            ilike(courses.name, `%${filters.category}%`)
          )
        : undefined,
    ].filter((c): c is NonNullable<typeof c> => c !== undefined);

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [coursesResult, totalResult] = await Promise.all([
      db
        .select({
          id: courses.id,
          name: courses.name,
          shortCode: courses.shortCode,
          type: courses.type,
          description: courses.description,
          thumbnailUrl: courses.thumbnailUrl,
          board: courses.board,
          grade: courses.grade,
          urlSlug: courses.urlSlug,
          createdAt: courses.createdAt,
          enrollmentCount: sql<number>`(
            SELECT count(*)::int FROM course_enrollments
            WHERE course_id = ${courses.id} AND status = 'active'
          )`,
        })
        .from(courses)
        .where(whereClause)
        .orderBy(desc(courses.createdAt))
        .limit(perPage)
        .offset((page - 1) * perPage),

      db
        .select({ count: sql<number>`count(*)::int` })
        .from(courses)
        .where(whereClause),
    ]);

    return {
      courses: coursesResult,
      total: totalResult[0]?.count ?? 0,
      page,
      perPage,
    };
  },

  async update(id: string, data: Partial<typeof courses.$inferInsert>) {
    const [updated] = await db
      .update(courses)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(courses.id, id))
      .returning();

    return updated ?? null;
  },

  async syncCurriculum(
    courseId: string,
    sections: Array<{
      id?: string;
      title: string;
      sortOrder: number;
      resources: Array<{
        id?: string;
        title: string;
        type: 'video' | 'file' | 'test' | 'assessment' | 'youtube' | 'link' | 'embed' | 'chit_chat';
        sortOrder: number;
        externalUrl?: string;
      }>;
    }>
  ) {
    return await db.transaction(async (tx) => {
      // 1. Get existing sections
      const existingSections = await tx
        .select({ id: contentSections.id })
        .from(contentSections)
        .where(eq(contentSections.courseId, courseId));

      const existingSectionIds = new Set(existingSections.map((s) => s.id));
      const keepSectionIds = new Set<string>();

      for (let sIdx = 0; sIdx < sections.length; sIdx++) {
        const secInput = sections[sIdx];
        let sectionId = secInput.id;

        if (sectionId && existingSectionIds.has(sectionId)) {
          // Update existing section
          await tx
            .update(contentSections)
            .set({
              title: secInput.title,
              sortOrder: secInput.sortOrder ?? sIdx,
            })
            .where(eq(contentSections.id, sectionId));
          keepSectionIds.add(sectionId);
        } else {
          // Create new section
          const [newSec] = await tx
            .insert(contentSections)
            .values({
              courseId,
              title: secInput.title,
              sortOrder: secInput.sortOrder ?? sIdx,
            })
            .returning();
          sectionId = newSec.id;
          keepSectionIds.add(sectionId);
        }

        // Handle resources for this section
        const existingResources = await tx
          .select({ id: contentResources.id })
          .from(contentResources)
          .where(eq(contentResources.sectionId, sectionId));

        const existingResIds = new Set(existingResources.map((r) => r.id));
        const keepResIds = new Set<string>();

        if (secInput.resources && Array.isArray(secInput.resources)) {
          for (let rIdx = 0; rIdx < secInput.resources.length; rIdx++) {
            const resInput = secInput.resources[rIdx];
            let resId = resInput.id;

            // Map friendly UI aliases onto contentResourceTypeEnum.
            const validResourceType = toResourceType(resInput.type);

            if (resId && existingResIds.has(resId)) {
              await tx
                .update(contentResources)
                .set({
                  title: resInput.title,
                  type: validResourceType,
                  sortOrder: resInput.sortOrder ?? rIdx,
                  externalUrl: resInput.externalUrl,
                  updatedAt: new Date(),
                })
                .where(eq(contentResources.id, resId));
              keepResIds.add(resId);
            } else {
              const [newRes] = await tx
                .insert(contentResources)
                .values({
                  sectionId,
                  title: resInput.title,
                  type: validResourceType,
                  sortOrder: resInput.sortOrder ?? rIdx,
                  externalUrl: resInput.externalUrl,
                })
                .returning();
              keepResIds.add(newRes.id);
            }
          }
        }

        // Delete deleted resources in this section
        for (const oldResId of existingResIds) {
          if (!keepResIds.has(oldResId)) {
            await tx.delete(contentResources).where(eq(contentResources.id, oldResId));
          }
        }
      }

      // Delete sections that were removed
      for (const oldSecId of existingSectionIds) {
        if (!keepSectionIds.has(oldSecId)) {
          await tx.delete(contentSections).where(eq(contentSections.id, oldSecId));
        }
      }

      return true;
    });
  },

  async createWithEducators(data: CreateCourseParams, educatorIds?: string[]) {
    return await db.transaction(async (tx) => {
      const [course] = await tx
        .insert(courses)
        .values({
          orgId: data.orgId,
          name: data.name,
          shortCode: data.shortCode,
          type: data.type,
          description: data.description,
          board: data.board,
          grade: data.grade,
          thumbnailUrl: data.thumbnailUrl,
          urlSlug: data.urlSlug ?? slugify(data.shortCode || data.name),
          cohortMaxLearners: data.cohortMaxLearners,
          defaultSessionDurationMin: data.defaultSessionDurationMin,
          isAdminBooked: data.isAdminBooked,
          createdBy: data.createdBy,
        })
        .returning();

      if (!course) throw new Error('Failed to create course');

      if (educatorIds && educatorIds.length > 0) {
        await tx.insert(courseEducators).values(
          educatorIds.map((educatorId) => ({
            courseId: course.id,
            educatorId,
          }))
        );
      }

      return course;
    });
  },

  async createTemplate(params: {
    orgId: string;
    createdBy: string;
    name: string;
    shortCode?: string;
    description?: string;
    board?: string;
    grade?: string;
    thumbnailUrl?: string;
    defaultSessionDurationMin?: number;
    sellingPageJson?: any;
    educatorIds?: string[];
    sections?: any[];
  }) {
    return await db.transaction(async (tx) => {
      const shortCode = params.shortCode || params.name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
      const [template] = await tx
        .insert(courses)
        .values({
          orgId: params.orgId,
          name: params.name,
          shortCode,
          type: 'one_on_one',
          status: 'published',
          description: params.description,
          board: params.board,
          grade: params.grade,
          thumbnailUrl: params.thumbnailUrl,
          urlSlug: slugify(`template-${params.name}`),
          defaultSessionDurationMin: params.defaultSessionDurationMin ?? 60,
          isAdminBooked: true,
          sellingPageJson: params.sellingPageJson ?? null,
          isTemplate: true,
          createdBy: params.createdBy,
        })
        .returning();

      if (!template) throw new Error('Failed to create course template');

      if (params.educatorIds && params.educatorIds.length > 0) {
        await tx.insert(courseEducators).values(
          params.educatorIds.map((educatorId) => ({
            courseId: template.id,
            educatorId,
          }))
        );
      }

      if (params.sections && params.sections.length > 0) {
        for (let sIdx = 0; sIdx < params.sections.length; sIdx++) {
          const sec = params.sections[sIdx];
          const [newSec] = await tx
            .insert(contentSections)
            .values({
              courseId: template.id,
              title: sec.title || `Section ${sIdx + 1}`,
              sortOrder: sec.sortOrder ?? sIdx,
            })
            .returning();

          if (sec.resources && sec.resources.length > 0) {
            for (let rIdx = 0; rIdx < sec.resources.length; rIdx++) {
              const res = sec.resources[rIdx];
              await tx.insert(contentResources).values({
                sectionId: newSec.id,
                title: res.title,
                type: toResourceType(res.type),
                sortOrder: res.sortOrder ?? rIdx,
                externalUrl: res.externalUrl,
              });
            }
          }
        }
      }

      return template;
    });
  },

  async createCourseFromTemplate(
    templateId: string,
    overrides: {
      name?: string;
      orgId?: string;
      createdBy: string;
      board?: string;
      grade?: string;
      educatorIds?: string[];
    }
  ) {
    return await db.transaction(async (tx) => {
      const [template] = await tx
        .select()
        .from(courses)
        .where(eq(courses.id, templateId))
        .limit(1);

      if (!template) throw new Error('Template not found');

      const courseName = overrides.name || template.name.replace(/^\[Template\]\s*/i, '');
      const shortCode = courseName.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);

      const [newCourse] = await tx
        .insert(courses)
        .values({
          orgId: overrides.orgId || template.orgId,
          name: courseName,
          shortCode,
          type: template.type,
          status: 'published',
          description: template.description,
          board: overrides.board || template.board,
          grade: overrides.grade || template.grade,
          thumbnailUrl: template.thumbnailUrl,
          urlSlug: slugify(`${courseName}-${Date.now().toString().slice(-4)}`),
          defaultSessionDurationMin: template.defaultSessionDurationMin,
          isAdminBooked: template.isAdminBooked,
          sellingPageJson: template.sellingPageJson,
          isTemplate: false,
          templateId: template.id,
          createdBy: overrides.createdBy,
        })
        .returning();

      // Copy educators
      const educatorsToAssign = overrides.educatorIds && overrides.educatorIds.length > 0
        ? overrides.educatorIds
        : (await tx
            .select({ educatorId: courseEducators.educatorId })
            .from(courseEducators)
            .where(eq(courseEducators.courseId, templateId))
          ).map((e) => e.educatorId);

      if (educatorsToAssign.length > 0) {
        await tx.insert(courseEducators).values(
          educatorsToAssign.map((educatorId) => ({
            courseId: newCourse.id,
            educatorId,
          }))
        );
      }

      // Copy sections & resources
      const sections = await tx
        .select()
        .from(contentSections)
        .where(eq(contentSections.courseId, templateId))
        .orderBy(asc(contentSections.sortOrder));

      for (const sec of sections) {
        const [copiedSec] = await tx
          .insert(contentSections)
          .values({
            courseId: newCourse.id,
            title: sec.title,
            sortOrder: sec.sortOrder,
          })
          .returning();

        const resources = await tx
          .select()
          .from(contentResources)
          .where(eq(contentResources.sectionId, sec.id))
          .orderBy(asc(contentResources.sortOrder));

        for (const res of resources) {
          await tx.insert(contentResources).values({
            sectionId: copiedSec.id,
            title: res.title,
            type: res.type,
            sortOrder: res.sortOrder,
            externalUrl: res.externalUrl,
          });
        }
      }

      return newCourse;
    });
  },

  async duplicateTemplate(templateId: string, userId: string) {
    return await db.transaction(async (tx) => {
      const [template] = await tx
        .select()
        .from(courses)
        .where(eq(courses.id, templateId))
        .limit(1);

      if (!template) throw new Error('Template not found');

      const copyName = `${template.name} (Copy)`;
      const shortCode = copyName.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);

      const [newTemplate] = await tx
        .insert(courses)
        .values({
          orgId: template.orgId,
          name: copyName,
          shortCode,
          type: template.type,
          status: template.status,
          description: template.description,
          board: template.board,
          grade: template.grade,
          thumbnailUrl: template.thumbnailUrl,
          urlSlug: slugify(`template-${copyName}-${Date.now().toString().slice(-4)}`),
          defaultSessionDurationMin: template.defaultSessionDurationMin,
          isAdminBooked: template.isAdminBooked,
          sellingPageJson: template.sellingPageJson,
          isTemplate: true,
          createdBy: userId,
        })
        .returning();

      // Copy educators
      const educators = await tx
        .select()
        .from(courseEducators)
        .where(eq(courseEducators.courseId, templateId));

      if (educators.length > 0) {
        await tx.insert(courseEducators).values(
          educators.map((e) => ({
            courseId: newTemplate.id,
            educatorId: e.educatorId,
            payoutRateOverride: e.payoutRateOverride,
          }))
        );
      }

      // Copy sections & resources
      const sections = await tx
        .select()
        .from(contentSections)
        .where(eq(contentSections.courseId, templateId))
        .orderBy(asc(contentSections.sortOrder));

      for (const sec of sections) {
        const [copiedSec] = await tx
          .insert(contentSections)
          .values({
            courseId: newTemplate.id,
            title: sec.title,
            sortOrder: sec.sortOrder,
          })
          .returning();

        const resources = await tx
          .select()
          .from(contentResources)
          .where(eq(contentResources.sectionId, sec.id))
          .orderBy(asc(contentResources.sortOrder));

        for (const res of resources) {
          await tx.insert(contentResources).values({
            sectionId: copiedSec.id,
            title: res.title,
            type: res.type,
            sortOrder: res.sortOrder,
            externalUrl: res.externalUrl,
          });
        }
      }

      return newTemplate;
    });
  },

  async deleteTemplate(templateId: string) {
    const [deleted] = await db
      .delete(courses)
      .where(and(eq(courses.id, templateId), eq(courses.isTemplate, true)))
      .returning();
    return deleted ?? null;
  },
};

export interface CourseTimelinePost {
  id: string;
  body: string | null;
  authorName: string;
  authorAvatarUrl: string | null;
  createdAt: string;
  commentCount: number;
  poll: {
    question: string;
    showResults: boolean;
    totalVotes: number;
    options: { id: string; body: string; pct: number }[];
  } | null;
}

export interface CourseContentResource {
  id: string;
  title: string;
  type: string;
  externalUrl: string | null;
  sortOrder: number;
  durationSeconds: number | null;
  completed: boolean;
  progressPct: number;
  assessment?: {
    id: string;
    description: string | null;
    maxMarks: number;
    endsOn: string | null;
    submission?: {
      id: string;
      submittedAt: string;
      fileR2Keys: string[] | null;
      totalScore: number | null;
      feedback: string | null;
      gradedAt: string | null;
    } | null;
  } | null;
  test?: {
    id: string;
    timeLimitSeconds: number | null;
    attemptsCount: number;
    latestScore: number | null;
  } | null;
}

export interface CourseContentSection {
  id: string;
  title: string;
  sortOrder: number;
  resources: CourseContentResource[];
  completedCount: number;
  resourceCount: number;
}

/**
 * Everything the course workspace needs in one call, scoped to a single
 * learner. Used by the learner course pages so the page, timeline and
 * curriculum never disagree with each other.
 */
export async function getLearnerCourseWorkspace(courseId: string, learnerId: string) {
  const [course] = await db
    .select({
      id: courses.id,
      name: courses.name,
      shortCode: courses.shortCode,
      description: courses.description,
      board: courses.board,
      grade: courses.grade,
      type: courses.type,
      status: courses.status,
      thumbnailUrl: courses.thumbnailUrl,
    })
    .from(courses)
    .where(eq(courses.id, courseId));

  if (!course) return null;

  const [enrollment] = await db
    .select({ status: courseEnrollments.status, enrolledAt: courseEnrollments.enrolledAt })
    .from(courseEnrollments)
    .where(
      and(eq(courseEnrollments.courseId, courseId), eq(courseEnrollments.learnerId, learnerId)),
    )
    .limit(1);

  const educatorRows = await db
    .select({ id: users.id, name: users.name, avatarUrl: users.avatarUrl })
    .from(courseEducators)
    .innerJoin(users, eq(courseEducators.educatorId, users.id))
    .where(eq(courseEducators.courseId, courseId));

  const [creditRow] = await db
    .select({ total: credits.total, consumed: credits.consumed })
    .from(credits)
    .where(and(eq(credits.courseId, courseId), eq(credits.learnerId, learnerId)))
    .limit(1);

  const [nextSession] = await db
    .select({
      id: sessions.id,
      title: sessions.title,
      scheduledAt: sessions.scheduledAt,
      status: sessions.status,
      hostedBy: sessions.hostedBy,
      zoomMeetingUrl: sessions.zoomMeetingUrl,
    })
    .from(sessions)
    .where(
      and(
        eq(sessions.courseId, courseId),
        sql`${sessions.status} = 'scheduled'`,
        sql`${sessions.scheduledAt} >= now()`,
      ),
    )
    .orderBy(asc(sessions.scheduledAt))
    .limit(1);

  // Timeline: posts with author, comment count and any attached poll results.
  const postRows = await db
    .select({
      id: timelinePosts.id,
      body: timelinePosts.bodyRichtext,
      createdAt: timelinePosts.createdAt,
      commentsDisabled: timelinePosts.commentsDisabled,
      authorName: users.name,
      authorAvatarUrl: users.avatarUrl,
    })
    .from(timelinePosts)
    .innerJoin(users, eq(timelinePosts.authorId, users.id))
    .where(eq(timelinePosts.courseId, courseId))
    .orderBy(desc(timelinePosts.createdAt))
    .limit(50);

  const postIds = postRows.map((p) => p.id);
  const commentCounts = new Map<string, number>();
  const pollByPost = new Map<string, { showResults: boolean; options: { id: string; body: string; votes: number }[] }>();

  if (postIds.length > 0) {
    const grouped = await db
      .select({ postId: timelineComments.postId, count: sql<number>`count(*)::int` })
      .from(timelineComments)
      .where(inArray(timelineComments.postId, postIds))
      .groupBy(timelineComments.postId);
    for (const g of grouped) commentCounts.set(g.postId, g.count);

    const pollRows = await db
      .select({
        postId: polls.postId,
        showResultsImmediately: polls.showResultsImmediately,
        id: polls.id,
      })
      .from(polls)
      .where(inArray(polls.postId, postIds));
    for (const p of pollRows) {
      pollByPost.set(p.postId, {
        showResults: p.showResultsImmediately,
        options: [],
      });
    }

    const pollIds = pollRows.map((p) => p.id);
    if (pollIds.length > 0) {
      const optionRows = await db
        .select({
          pollId: pollOptions.pollId,
          id: pollOptions.id,
          body: pollOptions.body,
          votes: sql<number>`(
            SELECT count(*)::int FROM poll_responses pr
            WHERE pr.option_id = ${pollOptions.id}
          )`,
        })
        .from(pollOptions)
        .where(inArray(pollOptions.pollId, pollIds))
        .orderBy(asc(pollOptions.sortOrder));

      const postIdByPollId = new Map(pollRows.map((p) => [p.id, p.postId]));
      for (const opt of optionRows) {
        const postId = postIdByPollId.get(opt.pollId);
        if (!postId) continue;
        pollByPost.get(postId)!.options.push({ id: opt.id, body: opt.body, votes: opt.votes });
      }
    }
  }

  const timeline: CourseTimelinePost[] = postRows.map((p) => {
    const meta = pollByPost.get(p.id);
    const options = meta?.options ?? [];
    const totalVotes = options.reduce((sum, o) => sum + o.votes, 0);
    return {
      id: p.id,
      body: p.body,
      authorName: p.authorName,
      authorAvatarUrl: p.authorAvatarUrl,
      createdAt: p.createdAt.toISOString(),
      commentCount: p.commentsDisabled ? 0 : (commentCounts.get(p.id) ?? 0),
      // A poll's question lives on the parent post body, so there is nothing
      // separate to render for it.
      poll: meta
        ? {
            question: p.body ?? '',
            showResults: meta.showResults,
            totalVotes,
            options: options.map((o) => ({
              id: o.id,
              body: o.body,
              pct: totalVotes > 0 ? Math.round((o.votes / totalVotes) * 100) : 0,
            })),
          }
        : null,
    };
  });

  // Curriculum with the learner's own progress per resource.
  const sectionRows = await db
    .select({ id: contentSections.id, title: contentSections.title, sortOrder: contentSections.sortOrder })
    .from(contentSections)
    .where(eq(contentSections.courseId, courseId))
    .orderBy(asc(contentSections.sortOrder), asc(contentSections.createdAt));

  let content: CourseContentSection[] = [];
  if (sectionRows.length > 0) {
    const sectionIds = sectionRows.map((s) => s.id);
    const resourceRows = await db
      .select({
        id: contentResources.id,
        sectionId: contentResources.sectionId,
        title: contentResources.title,
        type: contentResources.type,
        externalUrl: contentResources.externalUrl,
        sortOrder: contentResources.sortOrder,
        isPublished: contentResources.isPublished,
        dripReleaseAt: contentResources.dripReleaseAt,
        durationSeconds: videoAssets.durationSeconds,
        progressPct: sql<string>`coalesce(${learnerContentProgress.progressPct}, '0')`,
        completedAt: learnerContentProgress.completedAt,
      })
      .from(contentResources)
      .leftJoin(
        videoAssets,
        sql`${videoAssets.resourceId} = ${contentResources.id}`,
      )
      .leftJoin(
        learnerContentProgress,
        and(
          sql`${learnerContentProgress.resourceId} = ${contentResources.id}`,
          eq(learnerContentProgress.learnerId, learnerId),
        ),
      )
      .where(inArray(contentResources.sectionId, sectionIds))
      .orderBy(asc(contentResources.sortOrder), asc(contentResources.createdAt));

    const nowMs = Date.now();
    const visible = resourceRows.filter(
      (r) =>
        r.isPublished &&
        (r.dripReleaseAt === null || r.dripReleaseAt.getTime() <= nowMs),
    );

    // Fetch assessments and learner submissions for visible assessment resources
    const assessmentResIds = visible.filter((r) => r.type === 'assessment').map((r) => r.id);
    const assessmentMap = new Map<string, any>();
    if (assessmentResIds.length > 0) {
      const aRows = await db
        .select({
          id: assessments.id,
          resourceId: assessments.resourceId,
          description: assessments.description,
          maxMarks: assessments.maxMarks,
          endsOn: assessments.endsOn,
        })
        .from(assessments)
        .where(inArray(assessments.resourceId, assessmentResIds));

      const aIds = aRows.map((a) => a.id);
      const subRows = aIds.length > 0
        ? await db
            .select({
              id: assessmentSubmissions.id,
              assessmentId: assessmentSubmissions.assessmentId,
              submittedAt: assessmentSubmissions.submittedAt,
              fileR2Keys: assessmentSubmissions.fileR2Keys,
              totalScore: assessmentSubmissions.totalScore,
              feedback: assessmentSubmissions.feedback,
              gradedAt: assessmentSubmissions.gradedAt,
            })
            .from(assessmentSubmissions)
            .where(
              and(
                inArray(assessmentSubmissions.assessmentId, aIds),
                eq(assessmentSubmissions.learnerId, learnerId)
              )
            )
        : [];

      const subByAssessment = new Map(subRows.map((s) => [s.assessmentId, s]));
      for (const a of aRows) {
        const sub = subByAssessment.get(a.id);
        assessmentMap.set(a.resourceId, {
          id: a.id,
          description: a.description,
          maxMarks: Number(a.maxMarks),
          endsOn: a.endsOn ? a.endsOn.toISOString() : null,
          submission: sub
            ? {
                id: sub.id,
                submittedAt: sub.submittedAt.toISOString(),
                fileR2Keys: sub.fileR2Keys,
                totalScore: sub.totalScore !== null ? Number(sub.totalScore) : null,
                feedback: sub.feedback,
                gradedAt: sub.gradedAt ? sub.gradedAt.toISOString() : null,
              }
            : null,
        });
      }
    }

    // Fetch tests and attempts for visible test resources
    const testResIds = visible.filter((r) => r.type === 'test').map((r) => r.id);
    const testMap = new Map<string, any>();
    if (testResIds.length > 0) {
      const tRows = await db
        .select({
          id: tests.id,
          resourceId: tests.resourceId,
          timeLimitSeconds: tests.timeLimitSeconds,
        })
        .from(tests)
        .where(inArray(tests.resourceId, testResIds));

      const tIds = tRows.map((t) => t.id);
      const attRows = tIds.length > 0
        ? await db
            .select({
              testId: testAttempts.testId,
              autoScore: testAttempts.autoScore,
            })
            .from(testAttempts)
            .where(
              and(
                inArray(testAttempts.testId, tIds),
                eq(testAttempts.learnerId, learnerId)
              )
            )
            .orderBy(desc(testAttempts.startedAt))
        : [];

      for (const t of tRows) {
        const userAtts = attRows.filter((att) => att.testId === t.id);
        testMap.set(t.resourceId, {
          id: t.id,
          timeLimitSeconds: t.timeLimitSeconds,
          attemptsCount: userAtts.length,
          latestScore: userAtts.length > 0 && userAtts[0].autoScore !== null ? Number(userAtts[0].autoScore) : null,
        });
      }
    }

    content = sectionRows.map((sec) => {
      const resources: CourseContentResource[] = visible
        .filter((r) => r.sectionId === sec.id)
        .map((r) => ({
          id: r.id,
          title: r.title,
          type: r.type,
          externalUrl: r.externalUrl,
          sortOrder: r.sortOrder,
          durationSeconds: r.durationSeconds,
          completed: r.completedAt !== null,
          progressPct: Number(r.progressPct),
          assessment: assessmentMap.get(r.id) || null,
          test: testMap.get(r.id) || null,
        }));
      return {
        id: sec.id,
        title: sec.title,
        sortOrder: sec.sortOrder,
        resources,
        completedCount: resources.filter((r) => r.completed).length,
        resourceCount: resources.length,
      };
    });
  }

  return {
    course,
    enrollment: enrollment ?? null,
    educators: educatorRows,
    credits: creditRow
      ? { total: Number(creditRow.total), consumed: Number(creditRow.consumed ?? 0) }
      : null,
    nextSession: nextSession
      ? { ...nextSession, scheduledAt: nextSession.scheduledAt.toISOString() }
      : null,
    timeline,
    content,
  };
}
