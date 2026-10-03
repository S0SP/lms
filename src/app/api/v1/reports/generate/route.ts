import { type NextRequest } from 'next/server';
import { requireAuth, apiSuccess, apiError, parseBody } from '@/lib/api';
import { reportService } from '@/services/reportService';
import { generateReportSchema } from '@/validators/reportValidator';
import { isAnthropicEnabled } from '@/lib/integrations/anthropic';

/**
 * POST /api/v1/reports/generate
 *
 * Two modes, discriminated by `all`:
 *  - `{ all: false, learnerId, courseId, monthYear, force? }` — one report.
 *  - `{ all: true, monthYear, force?, limit? }` — drafts for every active
 *    enrolment in that month.
 *
 * Idempotent by default: an existing report is returned untouched. `force:
 * true` regenerates, and is refused for reports that were already sent.
 */
export async function POST(req: NextRequest) {
  const { error } = await requireAuth(['owner', 'admin', 'educator']);
  if (error) return error;

  const { data, error: bodyError } = await parseBody(req, generateReportSchema);
  if (bodyError) return bodyError;

  const aiEnabled = isAnthropicEnabled();

  if (data!.all) {
    const summary = await reportService.generateAllForMonth({
      monthYear: data!.monthYear,
      force: data!.force,
      limit: data!.limit,
    });

    return apiSuccess({
      ...summary,
      engine: aiEnabled ? 'claude' : 'fallback',
      aiEnabled,
    });
  }

  const result = await reportService.generateReport({
    learnerId: data!.learnerId,
    courseId: data!.courseId,
    monthYear: data!.monthYear,
    force: data!.force,
  });

  if (!result.ok) {
    const status = result.code === 'not_found' ? 404 : result.code === 'already_sent' ? 409 : 500;
    return apiError(result.message, status);
  }

  return apiSuccess(
    {
      reportId: result.reportId,
      created: result.created,
      engine: result.engine,
      // Lets the UI say "AI unavailable, generated from raw data" in dev.
      aiEnabled,
    },
    undefined,
    result.created ? 201 : 200,
  );
}
