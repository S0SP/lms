import { type NextRequest } from 'next/server';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';
import { courseService } from '@/services/courseService';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth(['owner', 'admin', 'educator']);
  if (error) return error;

  const { id } = await params;
  const template = await courseService.getCourseById(id);
  if (!template || !template.isTemplate) {
    return apiError('Template not found', 404);
  }

  return apiSuccess(template);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth(['owner', 'admin']);
  if (error) return error;

  const { id } = await params;
  try {
    const body = await req.json();
    const updated = await courseService.updateCourse(id, {
      name: body.name,
      description: body.description,
      board: body.board,
      grade: body.grade,
      thumbnailUrl: body.thumbnailUrl,
      defaultSessionDurationMin: body.defaultSessionDurationMin,
      sellingPageJson: body.sellingPageJson,
    });

    if (body.sections) {
      await courseService.updateCurriculum(id, body.sections);
    }

    return apiSuccess(updated);
  } catch (err: any) {
    return apiError(err.message || 'Failed to update template', 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth(['owner', 'admin']);
  if (error) return error;

  const { id } = await params;
  const deleted = await courseService.deleteTemplate(id);
  if (!deleted) {
    return apiError('Template not found', 404);
  }

  return apiSuccess({ success: true, id });
}
