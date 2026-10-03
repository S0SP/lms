import { type NextRequest } from 'next/server';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';
import { courseService } from '@/services/courseService';

// GET /api/v1/courses/templates
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(['owner', 'admin', 'educator']);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || undefined;
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
  const perPage = Math.min(100, parseInt(searchParams.get('perPage') ?? '50'));

  const result = await courseService.getTemplates({ q, page, perPage });

  return apiSuccess(result.courses, {
    total: result.total,
    page: result.page,
    perPage: result.perPage,
  });
}

// POST /api/v1/courses/templates
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth(['owner', 'admin']);
  if (error) return error;

  try {
    const body = await req.json();
    if (!body.name || !body.name.trim()) {
      return apiError('Template name is required', 400);
    }

    const template = await courseService.createTemplate(
      {
        name: body.name.trim(),
        description: body.description,
        board: body.board,
        grade: body.grade,
        thumbnailUrl: body.thumbnailUrl,
        defaultSessionDurationMin: body.defaultSessionDurationMin ?? 60,
        sellingPageJson: body.sellingPageJson ?? null,
        educatorIds: body.educatorIds ?? [],
        sections: body.sections ?? [],
        isTemplate: body.isTemplate !== undefined ? Boolean(body.isTemplate) : true,
      },
      session!.user!.id as string
    );

    return apiSuccess(template, undefined, 201);
  } catch (err: any) {
    console.error('Failed to create course template:', err);
    return apiError(err.message || 'Internal server error', 500);
  }
}
