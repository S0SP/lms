import { type NextRequest } from 'next/server';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';
import { payoutService } from '@/services/payoutService';
import { createPayoutSchema } from '@/validators/payoutValidator';

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(['owner', 'admin', 'educator']);
  if (error) return error;

  const role = (session!.user as any).role as string;
  const userId = session!.user!.id as string;
  const { searchParams } = new URL(req.url);

  const result = await payoutService.getPayouts({
    role,
    userId,
    educatorId: searchParams.get('educatorId') || undefined,
    status: searchParams.get('status') || undefined,
    page: Math.max(1, parseInt(searchParams.get('page') ?? '1')),
    perPage: Math.min(100, parseInt(searchParams.get('perPage') ?? '20'))
  });

  return apiSuccess(result.payouts, { page: result.page, perPage: result.perPage });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth(['owner', 'admin']);
  if (error) return error;

  const body = await req.json();
  const parsed = createPayoutSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.message);

  const newPayout = await payoutService.createPayout(parsed.data, session!.user!.id as string);

  return apiSuccess(newPayout, undefined, 201);
}
