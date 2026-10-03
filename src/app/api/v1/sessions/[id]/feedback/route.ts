import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';
import { sessionService } from '@/services/sessionService';

type Params = { params: Promise<{ id: string }> };

// POST /api/v1/sessions/[id]/feedback — educator submits after session
const feedbackSchema = z.object({
  topicsCovered: z.string().optional(),
  comments: z.string().optional(),
  homeworkAssigned: z.string().optional(),
  // Credits consumed override (defaults to session default)
  creditsConsumed: z.number().min(0).optional(),
});

export async function POST(req: NextRequest, { params }: Params) {
  const { session, error } = await requireAuth(['owner', 'admin', 'educator']);
  if (error) return error;

  const { id: sessionId } = await params;
  const role = (session!.user as any).role as string;
  const userId = session!.user!.id as string;
  const body = await req.json();
  const parsed = feedbackSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.message);

  // Verify session exists and educator owns it
  const sess = await sessionService.getSessionById(sessionId);
  if (!sess) return apiError('Session not found', 404);
  if (role === 'educator' && sess.educatorId !== userId) return apiError('Forbidden', 403);

  const creditsToConsume = parsed.data.creditsConsumed ?? Number(sess.creditsConsumed ?? 1);

  try {
    const feedback = await sessionService.submitSessionFeedback(
      sessionId, 
      { ...parsed.data, creditsConsumed: creditsToConsume }, 
      sess.educatorId, 
      sess.courseId
    );
    return apiSuccess(feedback, undefined, 201);
  } catch (err: any) {
    if (err.message === 'Feedback already submitted for this session') {
      return apiError(err.message, 409);
    }
    return apiError(err.message, 500);
  }
}

// GET /api/v1/sessions/[id]/feedback — view submitted feedback
export async function GET(req: NextRequest, { params }: Params) {
  const { session, error } = await requireAuth(['owner', 'admin', 'educator', 'learner', 'parent']);
  if (error) return error;

  const { id: sessionId } = await params;

  const fb = await sessionService.getSessionFeedback(sessionId);

  return apiSuccess(fb);
}
