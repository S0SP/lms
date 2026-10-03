import { type NextRequest } from 'next/server';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';
import { assessmentService } from '@/services/assessmentService';

// POST /api/v1/assignments/[id]/submit
// Student uploads completed assignment files
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  if (!id) return apiError('Assignment ID is required', 400);

  try {
    const body = await req.json();
    const { fileR2Keys } = body;

    if (!fileR2Keys || !Array.isArray(fileR2Keys) || fileR2Keys.length === 0) {
      return apiError('At least one uploaded file key (fileR2Keys) is required', 400);
    }

    // Resolve assessment ID if resourceId was passed
    let assessmentId = id;
    const byResource = await assessmentService.getAssessmentByResourceId(id);
    if (byResource) {
      assessmentId = byResource.id;
    }

    const learnerId = (session.user as any)?.id as string;
    if (!learnerId) return apiError('Unauthorized', 401);

    const submission = await assessmentService.submitAssignment({
      assessmentId,
      learnerId,
      fileR2Keys,
    });

    return apiSuccess(submission, undefined, 201);
  } catch (err: any) {
    return apiError(err.message || 'Failed to submit assignment', 400);
  }
}
