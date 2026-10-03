import { type NextRequest } from 'next/server';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';
import { consultationService } from '@/services/consultationService';
import { createConsultationSchema } from '@/validators/consultationValidator';

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(['owner', 'admin']);
  if (error) return error;

  const { searchParams } = new URL(req.url);

  const result = await consultationService.getConsultations({
    q: searchParams.get('q') ?? '',
    status: searchParams.get('status') || undefined,
    page: Math.max(1, parseInt(searchParams.get('page') ?? '1')),
    perPage: Math.min(100, parseInt(searchParams.get('perPage') ?? '20'))
  });

  return apiSuccess(result.consultations, {
    total: result.total,
    page: result.page,
    perPage: result.perPage,
  });
}

export async function POST(req: NextRequest) {
  // Public route — no auth required for submission from store page
  const body = await req.json();
  const parsed = createConsultationSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.message);

  const consultation = await consultationService.createConsultation(parsed.data);

  return apiSuccess(consultation, undefined, 201);
}
