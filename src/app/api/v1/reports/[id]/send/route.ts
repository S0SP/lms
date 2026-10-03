import { type NextRequest } from 'next/server';
import { requireAuth, apiSuccess, apiError, parseBody } from '@/lib/api';
import { reportService } from '@/services/reportService';
import { sendReportSchema } from '@/validators/reportValidator';

/**
 * POST /api/v1/reports/[id]/send
 *
 * Terminal transition: draft -> sent, then emails the learner and every linked
 * parent. Idempotent — a repeat call returns 409 instead of sending twice.
 */
type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { session, error } = await requireAuth(['owner', 'admin']);
  if (error) return error;

  const { id } = await params;

  // An empty body is valid: notify defaults to true.
  const { data, error: bodyError } = await parseBody(req, sendReportSchema);
  if (bodyError) return bodyError;

  const sentBy = (session!.user as { id?: string }).id;
  if (!sentBy) return apiError('Unauthorized', 401);

  const result = await reportService.sendReport(id, sentBy, data!.notify);
  if (!result.ok) {
    const status = result.code === 'not_found' ? 404 : 409;
    return apiError(result.message, status);
  }

  return apiSuccess({ reportId: id, notified: result.notified });
}
