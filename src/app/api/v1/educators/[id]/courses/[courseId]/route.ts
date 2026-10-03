import { type NextRequest } from 'next/server';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';
import { db } from '@/lib/drizzle';
import { courseEducators, payoutSessionLinks, sessions, payouts } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

type Params = { params: Promise<{ id: string; courseId: string }> };

const updatePayoutSchema = z.object({
  payoutRate: z.string().min(1),
  applyTo: z.enum(['future', 'all']).default('future'),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  const { session, error } = await requireAuth(['owner', 'admin']);
  if (error) return error;

  const { id: educatorId, courseId } = await params;
  const body = await req.json();

  const parsed = updatePayoutSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.message, 400);

  const { payoutRate, applyTo } = parsed.data;

  // 1. Update courseEducators payoutRateOverride
  const [updated] = await db
    .update(courseEducators)
    .set({ payoutRateOverride: payoutRate })
    .where(and(eq(courseEducators.educatorId, educatorId), eq(courseEducators.courseId, courseId)))
    .returning();

  if (!updated) {
    return apiError('Assignment not found', 404);
  }

  // 2. If applyTo === 'all', update past session payout links if needed
  if (applyTo === 'all') {
    // Optionally update existing unfinalized payout session links for this course & educator
    // Find unfinalized sessions
    const educatorCourseSessions = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(and(eq(sessions.educatorId, educatorId), eq(sessions.courseId, courseId)));

    // Update rateApplied in payoutSessionLinks where applicable
    for (const s of educatorCourseSessions) {
      await db
        .update(payoutSessionLinks)
        .set({ rateApplied: payoutRate })
        .where(eq(payoutSessionLinks.sessionId, s.id));
    }
  }

  return apiSuccess({ success: true, payoutRate });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { session, error } = await requireAuth(['owner', 'admin']);
  if (error) return error;

  const { id: educatorId, courseId } = await params;

  await db
    .delete(courseEducators)
    .where(and(eq(courseEducators.educatorId, educatorId), eq(courseEducators.courseId, courseId)));

  return apiSuccess({ success: true });
}
