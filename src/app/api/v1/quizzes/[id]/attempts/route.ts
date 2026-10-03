import { type NextRequest } from 'next/server';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';
import { quizService } from '@/services/quizService';

// GET /api/v1/quizzes/[id]/attempts
// List learner attempts for this quiz
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  if (!id) return apiError('Quiz ID is required', 400);

  const userId = session.user?.id as string;
  if (!userId) return apiError('Unauthorized', 401);

  try {
    let testId = id;
    const byResource = await quizService.getQuizByResourceId(id);
    if (byResource) {
      testId = byResource.id;
    }

    const attempts = await quizService.getLearnerAttempts(testId, userId);
    return apiSuccess(attempts);
  } catch (err: any) {
    return apiError(err.message || 'Failed to fetch attempts', 500);
  }
}

// POST /api/v1/quizzes/[id]/attempts
// Starts an attempt or submits answers for auto-grading
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  if (!id) return apiError('Quiz ID is required', 400);

  const userId = session.user?.id as string;
  if (!userId) return apiError('Unauthorized', 401);

  try {
    let testId = id;
    const byResource = await quizService.getQuizByResourceId(id);
    if (byResource) {
      testId = byResource.id;
    }

    const body = await req.json();
    const action = body.action || (body.answers ? 'submit' : 'start');

    if (action === 'start') {
      const attempt = await quizService.startAttempt(testId, userId);
      return apiSuccess(attempt, undefined, 201);
    }

    if (action === 'submit') {
      const { attemptId, answers } = body;
      if (!attemptId) return apiError('attemptId is required for submission', 400);
      if (!answers || !Array.isArray(answers)) return apiError('answers array is required', 400);

      const result = await quizService.submitAttempt({
        attemptId,
        learnerId: userId,
        answers,
      });

      return apiSuccess(result);
    }

    return apiError('Invalid action. Expected "start" or "submit"', 400);
  } catch (err: any) {
    return apiError(err.message || 'Failed to process quiz attempt', 400);
  }
}
