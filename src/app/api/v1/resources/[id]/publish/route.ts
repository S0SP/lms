import { type NextRequest } from 'next/server';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';
import { assessmentService } from '@/services/assessmentService';

// PATCH /api/v1/resources/[id]/publish
// Allows educator or admin to toggle isPublished (publishing or revoking an assignment, quiz, or content resource)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth(['owner', 'admin', 'educator']);
  if (error) return error;

  const { id } = await params;
  if (!id) return apiError('Resource ID is required', 400);

  try {
    const body = await req.json();
    if (typeof body.isPublished !== 'boolean') {
      return apiError('isPublished boolean field is required', 400);
    }

    const updated = await assessmentService.togglePublish(id, body.isPublished);
    if (!updated) return apiError('Resource not found', 404);

    return apiSuccess(updated);
  } catch (err: any) {
    return apiError(err.message || 'Failed to update resource publish state', 500);
  }
}
