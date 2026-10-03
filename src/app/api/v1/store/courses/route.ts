import { type NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api';
import { courseService } from '@/services/courseService';

// GET /api/v1/store/courses
export async function GET(req: NextRequest) {
  // Public storefront endpoint — no authentication required
  try {
    const { searchParams } = new URL(req.url);

    const result = await courseService.getPublicCatalog({
      category: searchParams.get('category') || undefined,
      q: searchParams.get('q') || undefined,
      page: Math.max(1, parseInt(searchParams.get('page') ?? '1')),
      perPage: Math.min(50, parseInt(searchParams.get('perPage') ?? '12')),
    });

    return apiSuccess(result.courses, {
      total: result.total,
      page: result.page,
      perPage: result.perPage,
    });
  } catch (err: any) {
    console.error('Store catalog error:', err);
    return apiError('Failed to fetch catalog', 500);
  }
}
