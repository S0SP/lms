import { type NextRequest } from 'next/server';
import { requireAuth, apiSuccess } from '@/lib/api';
import { analyticsService } from '@/services/analyticsService';

// GET /api/v1/analytics/overview — admin-only platform KPIs
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(['owner', 'admin']);
  if (error) return error;

  const stats = await analyticsService.getOverviewStats();

  return apiSuccess(stats);
}
