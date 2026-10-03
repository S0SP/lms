import { type NextRequest } from 'next/server';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';
import { db } from '@/lib/drizzle';
import { leaves } from '@/db/schema';
import { and, asc, eq, gte } from 'drizzle-orm';
import { z } from 'zod';

const createLeaveSchema = z.object({
  type: z.enum(['full', 'partial']).default('full'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  reason: z.string().max(1000).optional(),
});

// GET /api/v1/availability/leaves
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(['owner', 'admin', 'educator']);
  if (error) return error;

  const role = (session!.user as any).role as string;
  const userId = session!.user!.id as string;
  const { searchParams } = new URL(req.url);
  const educatorId = role === 'educator' ? userId : (searchParams.get('educatorId') ?? userId);
  const showAll = searchParams.get('scope') === 'all';
  const now = new Date();

  const rows = await db
    .select()
    .from(leaves)
    .where(
      showAll
        ? eq(leaves.educatorId, educatorId)
        : and(eq(leaves.educatorId, educatorId), gte(leaves.endDate, now)),
    )
    .orderBy(asc(leaves.startDate));

  return apiSuccess(rows);
}

// POST /api/v1/availability/leaves
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth(['owner', 'admin', 'educator']);
  if (error) return error;

  const role = (session!.user as any).role as string;
  const userId = session!.user!.id as string;
  const { searchParams } = new URL(req.url);
  const educatorId = role === 'educator' ? userId : (searchParams.get('educatorId') ?? userId);

  const body = await req.json();
  const parsed = createLeaveSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.message, 400);

  const { type, startDate, endDate, startTime, endTime, reason } = parsed.data;

  // Single-day rule: if same date must be same
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (end < start) return apiError('End date must be on or after start date', 400);

  // Partial leaves MUST have both times
  if (type === 'partial' && (!startTime || !endTime)) {
    return apiError('Partial leaves require start_time and end_time in HH:MM format', 400);
  }

  const [row] = await db
    .insert(leaves)
    .values({
      educatorId,
      type,
      startDate: start,
      endDate: end,
      startTime: type === 'partial' ? startTime : null,
      endTime: type === 'partial' ? endTime : null,
      reason: reason ?? null,
    })
    .returning();

  return apiSuccess(row, undefined, 201);
}
