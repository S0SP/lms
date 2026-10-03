import { type NextRequest } from 'next/server';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';
import { assessmentService } from '@/services/assessmentService';

// GET /api/v1/assignments/[id]/submissions
// Educator views all submissions for this assignment
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth(['owner', 'admin', 'educator']);
  if (error) return error;

  const { id } = await params;
  if (!id) return apiError('Assignment ID is required', 400);

  try {
    let assessmentId = id;
    const byResource = await assessmentService.getAssessmentByResourceId(id);
    if (byResource) {
      assessmentId = byResource.id;
    }

    const submissions = await assessmentService.listSubmissions(assessmentId);
    return apiSuccess(submissions);
  } catch (err: any) {
    return apiError(err.message || 'Failed to list submissions', 500);
  }
}
