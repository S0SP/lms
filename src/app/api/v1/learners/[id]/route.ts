import { type NextRequest } from 'next/server';
import { db } from '@/lib/drizzle';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';
import { courseEnrollments, courses, credits, users, learnerProfiles } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { learnerService } from '@/services/learnerService';

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { session, error } = await requireAuth(['owner', 'admin', 'educator', 'learner', 'parent']);
  if (error) return error;

  const { id } = await params;
  const role = (session!.user as any).role as string;
  const userId = session!.user!.id as string;

  // Learner can only view themselves
  if (role === 'learner' && id !== userId) return apiError('Forbidden', 403);

  // Parent can only view their child
  if (role === 'parent') {
    const [parentCheck] = await db.execute(
      sql`SELECT 1 FROM parent_profiles WHERE user_id = ${userId} AND learner_id = ${id} LIMIT 1`
    );
    if (!parentCheck) return apiError('Forbidden', 403);
  }

  // Select profile — ONLY admin gets privateNote
  const isAdmin = role === 'owner' || role === 'admin';
  const user = await learnerService.getLearnerById(id, isAdmin);

  if (!user) return apiError('Learner not found', 404);

  // Get course enrollments
  // Can be moved to courseService.getEnrollmentsByLearner later if needed
  const enrollments = await db
    .select({ courseId: courseEnrollments.courseId, courseName: courses.name, status: courseEnrollments.status, enrolledAt: courseEnrollments.enrolledAt })
    .from(courseEnrollments)
    .leftJoin(courses, eq(courseEnrollments.courseId, courses.id))
    .where(eq(courseEnrollments.learnerId, id));

  // Get credit balances
  // Can be moved to creditService.getBalancesByLearner later if needed
  const creditBalances = await db
    .select()
    .from(credits)
    .where(eq(credits.learnerId, id));

  return apiSuccess({ ...user, enrollments, credits: creditBalances });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { session, error } = await requireAuth(['owner', 'admin']);
  if (error) return error;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const updateProfile: Record<string, any> = { updatedAt: new Date() };
    if (body.privateNote !== undefined) updateProfile.privateNote = body.privateNote;
    if (body.board !== undefined) updateProfile.board = body.board;
    if (body.grade !== undefined) updateProfile.grade = body.grade;
    if (body.displayName !== undefined) updateProfile.displayName = body.displayName;
    if (body.dob !== undefined) updateProfile.dob = body.dob ? new Date(body.dob) : null;

    const updateUser: Record<string, any> = { updatedAt: new Date() };
    if (body.phone !== undefined) updateUser.phone = body.phone;
    if (body.name !== undefined) updateUser.name = body.name;
    if (body.loginPin !== undefined) updateUser.loginPin = body.loginPin;
    if (typeof body.isActive === 'boolean') updateUser.isActive = body.isActive;

    await db.transaction(async (tx) => {
      if (Object.keys(updateUser).length > 0) {
        await tx.update(users).set(updateUser).where(eq(users.id, id));
      }
      if (Object.keys(updateProfile).length > 1) { // more than just updatedAt
        const [existing] = await tx
          .select({ userId: learnerProfiles.userId })
          .from(learnerProfiles)
          .where(eq(learnerProfiles.userId, id))
          .limit(1);

        if (existing) {
          await tx
            .update(learnerProfiles)
            .set(updateProfile)
            .where(eq(learnerProfiles.userId, id));
        } else {
          await tx.insert(learnerProfiles).values({
            userId: id,
            ...updateProfile,
          });
        }
      }
    });

    return apiSuccess({ success: true });
  } catch (err: any) {
    console.error('Failed to update learner:', err);
    return apiError(err.message || 'Failed to update learner', 500);
  }
}
