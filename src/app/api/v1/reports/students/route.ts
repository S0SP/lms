import { type NextRequest } from 'next/server';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';
import { reportRepository } from '@/repositories/reportRepository';

/**
 * GET /api/v1/reports/students
 *
 * Returns active students ordered alphabetically (A-Z) with their enrolled
 * courses, grade, and board, enabling super admin to select a student for
 * compiling progress reports.
 */
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(['owner', 'admin', 'educator']);
  if (error) return error;

  try {
    const students = await reportRepository.listStudentsForReportGeneration();
    return apiSuccess({ students });
  } catch (err: any) {
    console.error('[reports/students] Failed to list students:', err);
    return apiError(err.message || 'Failed to list students', 500);
  }
}
