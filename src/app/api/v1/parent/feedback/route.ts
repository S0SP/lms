import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';
import { db } from '@/lib/drizzle';
import { educatorProfiles, users } from '@/db/schema';
import { eq } from 'drizzle-orm';

const parentFeedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comments: z.string().optional(),
  sessionId: z.string().uuid().optional(),
  educatorId: z.string().uuid().optional(),
  sessionName: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error || !session?.user?.id) return error || apiError('Unauthorized', 401);

  try {
    const body = await req.json();
    const parsed = parentFeedbackSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.message, 400);

    const { rating, comments, educatorId, sessionName } = parsed.data;
    const parentName = session.user.name || 'Parent';

    // If an educator is associated, append to educator reviews
    if (educatorId) {
      const [eduProfile] = await db
        .select()
        .from(educatorProfiles)
        .where(eq(educatorProfiles.userId, educatorId))
        .limit(1);

      if (eduProfile) {
        const existingReviews = Array.isArray(eduProfile.reviews) ? eduProfile.reviews : [];
        const newReview = {
          id: `rev_${Date.now()}`,
          studentName: parentName,
          rating,
          comment: comments || 'Positive parent evaluation',
          date: new Date().toISOString(),
        };

        await db
          .update(educatorProfiles)
          .set({
            reviews: [...existingReviews, newReview],
            updatedAt: new Date(),
          })
          .where(eq(educatorProfiles.userId, educatorId));
      }
    }

    return apiSuccess({
      message: 'Feedback submitted successfully',
      feedback: {
        rating,
        comments,
        submittedAt: new Date(),
        parentName,
      },
    }, undefined, 201);
  } catch (err: any) {
    console.error('Failed to submit parent feedback:', err);
    return apiError(err.message || 'Failed to submit feedback', 500);
  }
}
