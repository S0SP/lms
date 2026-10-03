import { type NextRequest } from 'next/server';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';
import { courseService } from '@/services/courseService';
import { createCourseSchema } from '@/validators/courseValidator';

// GET /api/v1/courses
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(['owner', 'admin', 'educator']);
  if (error) return error;

  const role = (session!.user as any).role as string;
  const userId = session!.user!.id as string;
  
  const { searchParams } = new URL(req.url);
  const isTemplateParam = searchParams.get('isTemplate');
  const isTemplate = isTemplateParam !== null ? isTemplateParam === 'true' : false;

  const result = await courseService.getCourses({
    type: searchParams.get('type') || undefined,
    status: searchParams.get('status') || undefined,
    q: searchParams.get('q') || undefined,
    educatorId: role === 'educator' ? userId : undefined,
    isTemplate,
    page: Math.max(1, parseInt(searchParams.get('page') ?? '1')),
    perPage: Math.min(100, parseInt(searchParams.get('perPage') ?? '20'))
  });

  return apiSuccess(result.courses, {
    total: result.total,
    page: result.page,
    perPage: result.perPage,
  });
}

// POST /api/v1/courses
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth(['owner', 'admin']);
  if (error) return error;

  const body = await req.json();
  const parsed = createCourseSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.message);

  const newCourse = await courseService.createCourse(parsed.data, session!.user!.id as string);

  return apiSuccess(newCourse, undefined, 201);
}
