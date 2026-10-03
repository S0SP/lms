import { type NextRequest } from 'next/server';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';
import { db } from '@/lib/drizzle';
import { leaves } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

type Params = { params: Promise<{ id: string }> };

// DELETE /api/v1/availability/leaves/[id]
export async function DELETE(req: NextRequest, { params }: Params) {
  const { session, error } = await requireAuth(['owner', 'admin', 'educator']);
  if (error) return error;

  const { id } = await params;
  const role = (session!.user as any).role as string;
  const userId = session!.user!.id as string;
  const { searchParams } = new URL(req.url);
  const educatorId = role === 'educator' ? userId : (searchParams.get('educatorId') ?? userId);

  const [existing] = await db
    .select({ id: leaves.id })
    .from(leaves)
    .where(and(eq(leaves.id, id), eq(leaves.educatorId, educatorId)))
    .limit(1);

  if (!existing) return apiError('Leave not found', 404);

  await db
    .delete(leaves)
    .where(and(eq(leaves.id, id), eq(leaves.educatorId, educatorId)));

  return apiSuccess({ ok: true });
}
