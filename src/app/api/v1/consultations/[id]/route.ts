import { type NextRequest } from 'next/server';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';
import { consultationService } from '@/services/consultationService';
import { updateConsultationSchema } from '@/validators/consultationValidator';

// GET /api/v1/consultations/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth(['owner', 'admin']);
  if (error) return error;

  const { id } = await params;
  if (!id) return apiError('Consultation ID is required', 400);

  const consultation = await consultationService.getConsultationById(id);
  if (!consultation) return apiError('Consultation not found', 404);

  return apiSuccess(consultation);
}

// PATCH /api/v1/consultations/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAuth(['owner', 'admin']);
  if (error) return error;

  const { id } = await params;
  if (!id) return apiError('Consultation ID is required', 400);

  const body = await req.json();
  const parsed = updateConsultationSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.message);

  const updated = await consultationService.updateConsultation(id, parsed.data);
  if (!updated) return apiError('Consultation not found', 404);

  return apiSuccess(updated);
}
