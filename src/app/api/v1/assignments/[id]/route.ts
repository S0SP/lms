import { type NextRequest } from 'next/server';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';
import { assessmentService } from '@/services/assessmentService';

// GET /api/v1/assignments/[id]
// Can be called by resourceId or assessmentId
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  if (!id) return apiError('Assignment ID is required', 400);

  const userId = session.user?.id as string;
  const userRole = (session.user as any)?.role as string;

  try {
    // Try finding by assessment ID first, then fallback to resource ID
    let assignment = await assessmentService.getAssessment(id, userId);
    if (!assignment) {
      assignment = await assessmentService.getAssessmentByResourceId(id, userId);
    }

    if (!assignment) return apiError('Assignment not found', 404);

    // If user is a student and assignment is revoked / unpublished, return 404
    const isStaff = ['owner', 'admin', 'educator'].includes(userRole || '');
    if (!isStaff && !assignment.isPublished) {
      return apiError('Assignment not found or revoked', 404);
    }

    return apiSuccess(assignment);
  } catch (err: any) {
    return apiError(err.message || 'Failed to fetch assignment', 500);
  }
}
