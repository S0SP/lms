import { type NextRequest } from 'next/server';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';
import { assessmentService } from '@/services/assessmentService';

// POST /api/v1/assignments/[id]/submissions/[subId]/grade
// Educator grades a submission
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; subId: string }> }
) {
  const { session, error } = await requireAuth(['owner', 'admin', 'educator']);
  if (error) return error;

  const { subId } = await params;
  if (!subId) return apiError('Submission ID is required', 400);

  try {
    const body = await req.json();
    const { totalScore, feedback, criteriaScores } = body;

    if (totalScore === undefined || totalScore === null || isNaN(Number(totalScore))) {
      return apiError('Valid totalScore is required', 400);
    }

    const graderId = (session.user as any)?.id as string;
    if (!graderId) return apiError('Unauthorized', 401);

    const graded = await assessmentService.gradeSubmission({
      submissionId: subId,
      gradedBy: graderId,
      totalScore: Number(totalScore),
      feedback: feedback?.trim() || undefined,
      criteriaScores,
    });

    return apiSuccess(graded);
  } catch (err: any) {
    return apiError(err.message || 'Failed to grade submission', 500);
  }
}
