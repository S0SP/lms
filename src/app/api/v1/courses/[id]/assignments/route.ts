import { type NextRequest } from 'next/server';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';
import { assessmentService } from '@/services/assessmentService';

// POST /api/v1/courses/[id]/assignments
// Educator/admin creates a new assignment within a section
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth(['owner', 'admin', 'educator']);
  if (error) return error;

  const { id: courseId } = await params;
  if (!courseId) return apiError('Course ID is required', 400);

  try {
    const body = await req.json();
    const { sectionId, title, description, startsOn, endsOn, maxMarks, rubricEnabled, isPublished, attachments, criteria } = body;

    if (!sectionId) return apiError('Section ID is required', 400);
    if (!title?.trim()) return apiError('Assignment title is required', 400);
    if (!maxMarks || Number(maxMarks) <= 0) return apiError('Max marks must be greater than 0', 400);

    const assignment = await assessmentService.createAssessment({
      sectionId,
      title: title.trim(),
      description: description?.trim() || undefined,
      startsOn: startsOn ? new Date(startsOn) : null,
      endsOn: endsOn ? new Date(endsOn) : null,
      maxMarks: Number(maxMarks),
      rubricEnabled: Boolean(rubricEnabled),
      isPublished: isPublished !== false,
      attachments: Array.isArray(attachments) ? attachments : [],
      criteria,
    });

    return apiSuccess(assignment, undefined, 201);
  } catch (err: any) {
    return apiError(err.message || 'Failed to create assignment', 500);
  }
}
