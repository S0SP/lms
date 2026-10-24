import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';
import { db } from '@/lib/drizzle';
import { learnerContentProgress, contentResources } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

type Params = { params: Promise<{ id: string }> };

const updateProgressSchema = z.object({
  resourceId: z.string().uuid(),
  progressPct: z.number().min(0).max(100),
  lastPositionSeconds: z.number().int().min(0).optional(),
  completed: z.boolean().optional(),
});

// POST /api/v1/courses/[id]/progress
export async function POST(req: NextRequest, { params }: Params) {
  const { session, error } = await requireAuth();
  if (error || !session?.user?.id) return error || apiError('Unauthorized', 401);

  const learnerId = session.user.id;
  const body = await req.json();
  const parsed = updateProgressSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.message, 400);

  const { resourceId, progressPct, lastPositionSeconds, completed } = parsed.data;

  try {
    // Check if progress row already exists
    const [existing] = await db
      .select()
      .from(learnerContentProgress)
      .where(
        and(
          eq(learnerContentProgress.resourceId, resourceId),
          eq(learnerContentProgress.learnerId, learnerId)
        )
      )
      .limit(1);

    const isDone = completed || progressPct >= 95;
    const completedAt = isDone ? (existing?.completedAt || new Date()) : null;

    let result;
    if (existing) {
      const [updated] = await db
        .update(learnerContentProgress)
        .set({
          progressPct: progressPct.toFixed(2),
          lastPositionSeconds: lastPositionSeconds ?? existing.lastPositionSeconds,
          completedAt,
          updatedAt: new Date(),
        })
        .where(eq(learnerContentProgress.id, existing.id))
        .returning();
      result = updated;
    } else {
      const [inserted] = await db
        .insert(learnerContentProgress)
        .values({
          resourceId,
          learnerId,
          progressPct: progressPct.toFixed(2),
          lastPositionSeconds: lastPositionSeconds ?? 0,
          completedAt,
        })
        .returning();
      result = inserted;
    }

    return apiSuccess(result);
  } catch (err: any) {
    console.error('Error updating content progress:', err);
    return apiError(err.message || 'Failed to update progress', 500);
  }
}

// GET /api/v1/courses/[id]/progress
export async function GET(req: NextRequest, { params }: Params) {
  const { session, error } = await requireAuth();
  if (error || !session?.user?.id) return error || apiError('Unauthorized', 401);

  const learnerId = session.user.id;

  try {
    const progressRecords = await db
      .select({
        id: learnerContentProgress.id,
        resourceId: learnerContentProgress.resourceId,
        progressPct: learnerContentProgress.progressPct,
        lastPositionSeconds: learnerContentProgress.lastPositionSeconds,
        completedAt: learnerContentProgress.completedAt,
      })
      .from(learnerContentProgress)
      .where(eq(learnerContentProgress.learnerId, learnerId));

    return apiSuccess(progressRecords);
  } catch (err: any) {
    return apiError('Failed to fetch progress', 500);
  }
}
