import { type NextRequest } from 'next/server';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';
import { courseService } from '@/services/courseService';

// POST /api/v1/courses/templates/[id]/duplicate
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth(['owner', 'admin']);
  if (error) return error;

  const { id } = await params;
  try {
    const duplicated = await courseService.duplicateTemplate(id, session!.user!.id as string);
    return apiSuccess(duplicated, undefined, 201);
  } catch (err: any) {
    console.error('Failed to duplicate template:', err);
    return apiError(err.message || 'Failed to duplicate template', 500);
  }
}
