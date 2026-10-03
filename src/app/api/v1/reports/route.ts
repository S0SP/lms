import { type NextRequest } from 'next/server';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';
import { reportService } from '@/services/reportService';

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(['owner', 'admin', 'educator', 'learner', 'parent']);
  if (error) return error;

  const role = (session!.user as any).role as string;
  const userId = session!.user!.id as string;
  const { searchParams } = new URL(req.url);

  const result = await reportService.getReports({
    role,
    userId,
    learnerId: searchParams.get('learnerId') || undefined,
    courseId: searchParams.get('courseId') || undefined,
    status: searchParams.get('status') || undefined,
    page: Math.max(1, parseInt(searchParams.get('page') ?? '1')),
    perPage: Math.min(50, parseInt(searchParams.get('perPage') ?? '20'))
  });

  return apiSuccess(result.reports, { page: result.page, perPage: result.perPage });
}
