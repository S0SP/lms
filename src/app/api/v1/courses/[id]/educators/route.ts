import { type NextRequest } from 'next/server';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';
import { db } from '@/lib/drizzle';
import { courseEducators, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// GET /api/v1/courses/[id]/educators
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id: courseId } = await params;

  const assigned = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl,
      payoutRateOverride: courseEducators.payoutRateOverride,
      assignedAt: courseEducators.assignedAt,
    })
    .from(courseEducators)
    .innerJoin(users, eq(courseEducators.educatorId, users.id))
    .where(eq(courseEducators.courseId, courseId));

  return apiSuccess(assigned);
}

// POST /api/v1/courses/[id]/educators (assign or update payout)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth(['owner', 'admin']);
  if (error) return error;

  const { id: courseId } = await params;
  const body = await req.json();
  const educatorId = body.educatorId;
  const payoutRateOverride = body.payoutRateOverride !== undefined ? String(body.payoutRateOverride) : null;

  if (!educatorId) return apiError('educatorId is required', 400);

  // Check if already assigned
  const [existing] = await db
    .select()
    .from(courseEducators)
    .where(and(eq(courseEducators.courseId, courseId), eq(courseEducators.educatorId, educatorId)))
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(courseEducators)
      .set({ payoutRateOverride })
      .where(eq(courseEducators.id, existing.id))
      .returning();
    return apiSuccess(updated);
  }

  const [inserted] = await db
    .insert(courseEducators)
    .values({
      courseId,
      educatorId,
      payoutRateOverride,
    })
    .returning();

  return apiSuccess(inserted, undefined, 201);
}

// DELETE /api/v1/courses/[id]/educators
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth(['owner', 'admin']);
  if (error) return error;

  const { id: courseId } = await params;
  const { searchParams } = new URL(req.url);
  const educatorId = searchParams.get('educatorId');

  if (!educatorId) return apiError('educatorId query param is required', 400);

  await db
    .delete(courseEducators)
    .where(and(eq(courseEducators.courseId, courseId), eq(courseEducators.educatorId, educatorId)));

  return apiSuccess({ deleted: true });
}
