import { type NextRequest } from 'next/server';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';
import { availabilityService } from '@/services/availabilityService';
import { saveAvailabilitySchema } from '@/validators/availabilityValidator';

// ─── GET /api/v1/availability — educator gets own profile ───────────────────
// Admin can pass ?educatorId= to view any educator's availability
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(['owner', 'admin', 'educator']);
  if (error) return error;

  const role = (session!.user as any).role as string;
  const userId = session!.user!.id as string;
  const { searchParams } = new URL(req.url);

  // Admin can query any educator. Educator can only query themselves.
  const educatorId = role === 'educator' ? userId : (searchParams.get('educatorId') ?? userId);

  const result = await availabilityService.getAvailability(educatorId);

  return apiSuccess(result);
}

// ─── POST /api/v1/availability — save availability profile ──────────────────
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth(['owner', 'admin', 'educator']);
  if (error) return error;

  const role = (session!.user as any).role as string;
  const userId = session!.user!.id as string;
  const body = await req.json();
  const { searchParams } = new URL(req.url);
  const parsed = saveAvailabilitySchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.message);

  const educatorId = role === 'educator' ? userId : (searchParams.get('educatorId') ?? userId);

  await availabilityService.saveAvailability(educatorId, parsed.data);

  return apiSuccess({ ok: true });
}
