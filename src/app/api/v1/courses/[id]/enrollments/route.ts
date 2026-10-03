import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';
import { enrollStudentInClass } from '@/services/enrollmentService';

type Params = { params: Promise<{ id: string }> };

const enrollSchema = z.object({
  learnerId: z.string().uuid(),
  educatorId: z.string().uuid().optional(),
});

// POST /api/v1/courses/[id]/enrollments
export async function POST(req: NextRequest, { params }: Params) {
  const { session, error } = await requireAuth(['owner', 'admin', 'educator']);
  if (error) return error;

  const { id: courseId } = await params;
  const body = await req.json();

  const parsed = enrollSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.message, 400);
  }

  try {
    const result = await enrollStudentInClass(
      parsed.data.learnerId,
      courseId,
      parsed.data.educatorId
    );
    return apiSuccess(result, undefined, 201);
  } catch (err: any) {
    return apiError(err.message || 'Failed to enroll student in class', 500);
  }
}
