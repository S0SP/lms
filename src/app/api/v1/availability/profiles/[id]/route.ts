import { type NextRequest } from 'next/server';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';
import { db } from '@/lib/drizzle';
import { availabilityProfiles } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  timezone: z.string().min(1).optional(),
  isDefault: z.boolean().optional(),
  scheduleJson: z.record(
    z.string(),
    z.array(z.object({ start: z.string(), end: z.string() })),
  ).optional(),
  overridesJson: z.record(z.string(), z.any()).optional(),
});

type Params = { params: Promise<{ id: string }> };

async function resolveEducatorId(session: any, req: NextRequest): Promise<string> {
  const role = (session.user as any).role as string;
  const userId = session.user!.id as string;
  const { searchParams } = new URL(req.url);
  return role === 'educator' ? userId : (searchParams.get('educatorId') ?? userId);
}

// PATCH /api/v1/availability/profiles/[id] — update a profile
export async function PATCH(req: NextRequest, { params }: Params) {
  const { session, error } = await requireAuth(['owner', 'admin', 'educator']);
  if (error) return error;

  const { id } = await params;
  const educatorId = await resolveEducatorId(session!, req);

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.message, 400);

  // Verify ownership
  const [existing] = await db
    .select({ id: availabilityProfiles.id })
    .from(availabilityProfiles)
    .where(and(eq(availabilityProfiles.id, id), eq(availabilityProfiles.educatorId, educatorId)))
    .limit(1);

  if (!existing) return apiError('Profile not found', 404);

  const { isDefault, ...rest } = parsed.data;

  // Clearing default on others first if this is becoming default
  if (isDefault === true) {
    await db
      .update(availabilityProfiles)
      .set({ isDefault: false })
      .where(eq(availabilityProfiles.educatorId, educatorId));
  }

  const [updated] = await db
    .update(availabilityProfiles)
    .set({ ...rest, ...(isDefault !== undefined ? { isDefault } : {}), updatedAt: new Date() })
    .where(and(eq(availabilityProfiles.id, id), eq(availabilityProfiles.educatorId, educatorId)))
    .returning();

  return apiSuccess(updated);
}

// DELETE /api/v1/availability/profiles/[id] — delete a profile
export async function DELETE(req: NextRequest, { params }: Params) {
  const { session, error } = await requireAuth(['owner', 'admin', 'educator']);
  if (error) return error;

  const { id } = await params;
  const educatorId = await resolveEducatorId(session!, req);

  const [existing] = await db
    .select({ id: availabilityProfiles.id, isDefault: availabilityProfiles.isDefault })
    .from(availabilityProfiles)
    .where(and(eq(availabilityProfiles.id, id), eq(availabilityProfiles.educatorId, educatorId)))
    .limit(1);

  if (!existing) return apiError('Profile not found', 404);
  if (existing.isDefault) return apiError('Cannot delete the default profile. Set another as default first.', 400);

  await db
    .delete(availabilityProfiles)
    .where(and(eq(availabilityProfiles.id, id), eq(availabilityProfiles.educatorId, educatorId)));

  return apiSuccess({ ok: true });
}
