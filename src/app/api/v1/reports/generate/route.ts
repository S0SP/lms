import { type NextRequest } from 'next/server';
import { requireAuth, apiSuccess, apiError, parseBody } from '@/lib/api';
import { reportService } from '@/services/reportService';
import { generateReportSchema } from '@/validators/reportValidator';
import { isGeminiEnabled } from '@/lib/integrations/gemini';

/**
 * POST /api/v1/reports/generate
 *
 * Supports generating for a single student with a custom evaluation period
 * or batch generating for all students.
 */
export async function POST(req: NextRequest) {
  const { error } = await requireAuth(['owner', 'admin', 'educator']);
  if (error) return error;

  const { data, error: bodyError } = await parseBody(req, generateReportSchema);
  if (bodyError) return bodyError;

  const aiEnabled = isGeminiEnabled();

  if (data!.all) {
    const summary = await reportService.generateAllForMonth({
      monthYear: data!.monthYear || data!.startDate || new Date(),
      force: data!.force,
      limit: data!.limit,
    });

    return apiSuccess({
      ...summary,
      engine: aiEnabled ? 'gemini' : 'gemini_fallback',
      aiEnabled,
    });
  }

  const result = await reportService.generateReport({
    learnerId: data!.learnerId,
    courseId: data!.courseId,
    monthYear: data!.monthYear || data!.startDate || new Date(),
    force: data!.force,
    startDate: data!.startDate,
    endDate: data!.endDate,
    periodLabel: data!.periodLabel,
    sessionIds: data!.sessionIds,
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
      aiEnabled,
      usage: result.usage,
    },
    undefined,
    result.created ? 201 : 200,
  );
}
