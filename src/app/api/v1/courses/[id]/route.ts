import { type NextRequest } from 'next/server';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';
import { courseService } from '@/services/courseService';

// GET /api/v1/courses/[id]
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

  return apiSuccess(course);
}

// PATCH /api/v1/courses/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth(['owner', 'admin', 'educator']);
  if (error) return error;

  const { id } = await params;
  if (!id) return apiError('Course ID is required', 400);

  const body = await req.json();

  // Validate existence
  const existing = await courseService.getCourseById(id);
  if (!existing) return apiError('Course not found', 404);

  const updated = await courseService.updateCourse(id, body);
  return apiSuccess(updated);
}
