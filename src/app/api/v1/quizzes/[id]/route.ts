import { type NextRequest } from 'next/server';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';
import { quizService } from '@/services/quizService';

// GET /api/v1/quizzes/[id]
// Can be called with testId or resourceId
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  if (!id) return apiError('Quiz ID is required', 400);

  const userId = session.user?.id as string;
  const userRole = (session.user as any)?.role as string;
  const isStaff = ['owner', 'admin', 'educator'].includes(userRole || '');

  try {
    let quiz = await quizService.getQuiz(id, isStaff, userId);
    if (!quiz) {
      quiz = await quizService.getQuizByResourceId(id, isStaff, userId);
    }

    if (!quiz) return apiError('Quiz not found', 404);

    if (!isStaff && !quiz.isPublished) {
      return apiError('Quiz not found or currently revoked', 404);
    }

    return apiSuccess(quiz);
  } catch (err: any) {
    return apiError(err.message || 'Failed to fetch quiz', 500);
  }
}
