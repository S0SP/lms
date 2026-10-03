import { type NextRequest } from 'next/server';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';
import { creditService } from '@/services/creditService';
import { adjustCreditSchema } from '@/validators/creditValidator';

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(['owner', 'admin', 'educator', 'learner', 'parent']);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get('courseId');
  const learnerId = searchParams.get('learnerId');

  if (!courseId) {
    return apiError('courseId is required', 400);
  }

  if (!learnerId) {
    return apiSuccess({
      credit: { total: 0, consumed: 0, remaining: 0 },
      history: [],
    });
  }

  const includeHistory = searchParams.get('history') === 'true';

  const credit = await creditService.getLearnerCourseCredit(courseId, learnerId);
  let history: any[] = [];
  if (includeHistory) {
    history = await creditService.getCreditHistory(courseId, learnerId);
  }

  return apiSuccess({
    credit: credit ?? null,
    history,
  });
}


export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth(['owner', 'admin']);
  if (error) return error;

  const body = await req.json();
  const parsed = adjustCreditSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.message);

  const adminId = session!.user!.id as string;
  const updated = await creditService.adjustCredit(parsed.data, adminId);

  return apiSuccess(updated);
}
