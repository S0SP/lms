import { type NextRequest } from 'next/server';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';
import { quizService } from '@/services/quizService';

// POST /api/v1/courses/[id]/quizzes
// Educator/admin creates a quiz with questions & options
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth(['owner', 'admin', 'educator']);
  if (error) return error;

  const { id: courseId } = await params;
  if (!courseId) return apiError('Course ID is required', 400);

  try {
    const body = await req.json();
    const { sectionId, name, timeLimitSeconds, shuffleOptions, negativeMarking, isPublished, questions } = body;

    if (!sectionId) return apiError('Section ID is required', 400);
    if (!name?.trim()) return apiError('Quiz name is required', 400);
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return apiError('At least one question is required', 400);
    }

    const quiz = await quizService.createQuiz({
      sectionId,
      name: name.trim(),
      timeLimitSeconds: timeLimitSeconds ? Number(timeLimitSeconds) : undefined,
      shuffleOptions: Boolean(shuffleOptions),
      negativeMarking: negativeMarking !== undefined ? Number(negativeMarking) : undefined,
      isPublished: isPublished !== false,
      questions,
    });

    return apiSuccess(quiz, undefined, 201);
  } catch (err: any) {
    return apiError(err.message || 'Failed to create quiz', 500);
  }
}
