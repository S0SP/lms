import { type NextRequest } from 'next/server';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';
import { courseService } from '@/services/courseService';

// GET /api/v1/courses/[id]/curriculum
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  if (!id) return apiError('Course ID is required', 400);

  const course = await courseService.getCourseById(id);
  if (!course) return apiError('Course not found', 404);

  return apiSuccess(course.curriculum);
}

// PUT /api/v1/courses/[id]/curriculum
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth(['owner', 'admin', 'educator']);
  if (error) return error;

  const { id } = await params;
  if (!id) return apiError('Course ID is required', 400);

  const body = await req.json();
  const sections = body.sections;

  if (!Array.isArray(sections)) {
    return apiError('Expected "sections" array in request body', 400);
  }

  await courseService.updateCurriculum(id, sections);

  const updatedCourse = await courseService.getCourseById(id);
  return apiSuccess(updatedCourse?.curriculum);
}
