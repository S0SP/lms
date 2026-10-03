import { type NextRequest } from 'next/server';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';
import { db } from '@/lib/drizzle';
import {
  courses,
  courseEducators,
  courseEnrollments,
  users,
  orgs,
  educatorProfiles,
} from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { z } from 'zod';

type Params = { params: Promise<{ id: string }> };

const assignCourseSchema = z.object({
  courseId: z.string().uuid(),
  payoutRateOverride: z.string().optional(),
});

export async function GET(req: NextRequest, { params }: Params) {
  const { session, error } = await requireAuth(['owner', 'admin', 'educator']);
  if (error) return error;

  const { id } = await params;

  // 1. Fetch assigned courses for this educator
  const educatorCourseRows = await db
    .select({
      id: courseEducators.id,
      courseId: courses.id,
      courseName: courses.name,
      courseType: courses.type,
      board: courses.board,
      grade: courses.grade,
      description: courses.description,
      payoutRateOverride: courseEducators.payoutRateOverride,
      assignedAt: courseEducators.assignedAt,
      orgName: orgs.name,
    })
    .from(courseEducators)
    .innerJoin(courses, eq(courseEducators.courseId, courses.id))
    .leftJoin(orgs, eq(courses.orgId, orgs.id))
    .where(eq(courseEducators.educatorId, id));

  // 2. Fetch default payout rate from educator profile
  const [profile] = await db
    .select({
      payoutDefaultRate: educatorProfiles.payoutDefaultRate,
      payoutCurrency: educatorProfiles.payoutCurrency,
    })
    .from(educatorProfiles)
    .where(eq(educatorProfiles.userId, id))
    .limit(1);

  const defaultRate = profile?.payoutDefaultRate || '0';
  const defaultCurrency = profile?.payoutCurrency || 'INR';

  // 3. For each course, fetch enrolled learners
  const courseIds = educatorCourseRows.map((r) => r.courseId);
  const learnersByCourse = new Map<string, string[]>();

  if (courseIds.length > 0) {
    const enrollments = await db
      .select({
        courseId: courseEnrollments.courseId,
        learnerName: users.name,
      })
      .from(courseEnrollments)
      .innerJoin(users, eq(courseEnrollments.learnerId, users.id))
      .where(inArray(courseEnrollments.courseId, courseIds));

    enrollments.forEach((e) => {
      const list = learnersByCourse.get(e.courseId) || [];
      if (e.learnerName) list.push(e.learnerName);
      learnersByCourse.set(e.courseId, list);
    });
  }

  const result = educatorCourseRows.map((r) => {
    const typeBadge =
      r.courseType === 'one_on_one'
        ? '1-on-1 personalized course'
        : r.courseType === 'group'
        ? 'Group course'
        : 'Recorded course';

    const subtitle = [r.board, r.grade].filter(Boolean).join(', ') || r.description || '';
    const learners = learnersByCourse.get(r.courseId) || [];

    return {
      id: r.courseId,
      name: r.courseName,
      typeBadge,
      subtitle,
      learners: learners.length > 0 ? learners.join(', ') : 'No learners yet',
      adminName: r.orgName || 'UnboundYou',
      payoutPerCredit: r.payoutRateOverride ? `${defaultCurrency} ${r.payoutRateOverride}` : (defaultRate !== '0' ? `${defaultCurrency} ${defaultRate}` : '-'),
      rawPayoutRate: r.payoutRateOverride || defaultRate,
      currency: defaultCurrency,
      assignedAt: r.assignedAt,
    };
  });

  return apiSuccess(result);
}

export async function POST(req: NextRequest, { params }: Params) {
  const { session, error } = await requireAuth(['owner', 'admin']);
  if (error) return error;

  const { id } = await params;
  const body = await req.json();

  const parsed = assignCourseSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.message, 400);

  const { courseId, payoutRateOverride } = parsed.data;

  // Check if assignment already exists
  const [existing] = await db
    .select({ id: courseEducators.id })
    .from(courseEducators)
    .where(and(eq(courseEducators.courseId, courseId), eq(courseEducators.educatorId, id)))
    .limit(1);

  if (existing) {
    return apiError('Educator is already assigned to this course', 400);
  }

  const [created] = await db
    .insert(courseEducators)
    .values({
      courseId,
      educatorId: id,
      payoutRateOverride: payoutRateOverride || null,
    })
    .returning();

  return apiSuccess(created, undefined, 201);
}
