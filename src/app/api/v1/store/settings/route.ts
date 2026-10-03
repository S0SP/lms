import { type NextRequest } from 'next/server';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';
import { storeService } from '@/services/storeService';
import { storeSettingsSchema } from '@/validators/storeValidator';

// GET /api/v1/store/settings — public (no auth for store page)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get('orgId');

  if (!orgId) return apiError('orgId is required', 400);

  const settings = await storeService.getSettings(orgId);

  return apiSuccess(settings);
}

// PATCH /api/v1/store/settings — admin only
export async function PATCH(req: NextRequest) {
  const { session, error } = await requireAuth(['owner', 'admin']);
  if (error) return error;

  const body = await req.json();
  const parsed = storeSettingsSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.message);

  const updated = await storeService.updateSettings(parsed.data);

  return apiSuccess(updated);
}
