import { type NextRequest } from 'next/server';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';
import { db } from '@/lib/drizzle';
import { pollResponses, pollOptions, polls } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// POST /api/v1/courses/[id]/timeline/vote
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const userId = session!.user!.id as string;
  const body = await req.json();
  const optionId = body.optionId;
  const pollId = body.pollId;

  if (!optionId) {
    return apiError('optionId is required', 400);
  }

  // Verify option exists
  const [option] = await db
    .select()
    .from(pollOptions)
    .where(eq(pollOptions.id, optionId))
    .limit(1);

  if (!option) {
    return apiError('Option not found', 404);
  }

  // Remove any previous vote from this learner for any options in the same poll
  const allPollOptions = await db
    .select({ id: pollOptions.id })
    .from(pollOptions)
    .where(eq(pollOptions.pollId, option.pollId));

  for (const opt of allPollOptions) {
    await db
      .delete(pollResponses)
      .where(and(eq(pollResponses.optionId, opt.id), eq(pollResponses.learnerId, userId)));
  }

  // Insert the vote
  const [response] = await db
    .insert(pollResponses)
    .values({
      optionId,
      learnerId: userId,
    })
    .returning();

  return apiSuccess({
    voted: true,
    optionId,
    isCorrect: option.isCorrect,
  });
}
