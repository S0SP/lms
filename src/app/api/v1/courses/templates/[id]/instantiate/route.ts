import { type NextRequest } from 'next/server';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';
import { courseService } from '@/services/courseService';

// POST /api/v1/courses/templates/[id]/instantiate
// Creates a new live 1-on-1 course from the template
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth(['owner', 'admin']);
  if (error) return error;

  const { id } = await params;
  try {
    const body = await req.json().catch(() => ({}));
    const newCourse = await courseService.createCourseFromTemplate(
      id,
      {
        name: body.name,
        board: body.board,
        grade: body.grade,
        educatorIds: body.educatorIds,
      },
      session!.user!.id as string
    );

    return apiSuccess(newCourse, undefined, 201);
  } catch (err: any) {
    console.error('Failed to create course from template:', err);
    return apiError(err.message || 'Failed to create course from template', 500);
  }
}
