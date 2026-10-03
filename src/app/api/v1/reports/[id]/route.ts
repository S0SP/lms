import { type NextRequest } from 'next/server';
import { requireAuth, apiSuccess, apiError, parseBody } from '@/lib/api';
import { reportService } from '@/services/reportService';
import { updateReportSchema } from '@/validators/reportValidator';

/**
 * GET  /api/v1/reports/[id] — full report for the review screen.
 * PATCH /api/v1/reports/[id] — apply educator/admin edits.
 *
 * The AI draft is never overwritten by an edit; edits go to `editedContent`
 * and `sectionsJson` so the original model output stays auditable.
 */
type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { session, error } = await requireAuth([
    'owner',
    'admin',
    'educator',
    'learner',
    'parent',
  ]);
  if (error) return error;

  const { id } = await params;

  // Visibility (including "learners/parents only see sent reports") lives in the
  // service so this route and the server-rendered pages cannot drift apart.
  const viewer = await reportService.getReportForViewer(id, {
    role: (session!.user as { role?: string }).role ?? '',
    userId: (session!.user as { id?: string }).id ?? '',
  });
  if (!viewer.ok) return apiError('Report not found', 404);

  return apiSuccess(viewer.report);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { error } = await requireAuth(['owner', 'admin', 'educator']);
  if (error) return error;

  const { id } = await params;

  const existing = await reportService.getReportById(id);
  if (!existing) return apiError('Report not found', 404);
  if (existing.status === 'sent') {
    return apiError('Sent reports are immutable and cannot be edited', 409);
  }

  const { data, error: bodyError } = await parseBody(req, updateReportSchema);
  if (bodyError) return bodyError;

  const updated = await reportService.updateReport(id, {
    sections: data!.sections,
    summary: data!.summary,
  });
  if (!updated) return apiError('Report not found', 404);

  return apiSuccess(updated);
}
