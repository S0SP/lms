import { type NextRequest } from 'next/server';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';
import { db } from '@/lib/drizzle';
import { availabilityProfiles } from '@/db/schema';
import { and, asc, desc, eq } from 'drizzle-orm';
import { z } from 'zod';

const createProfileSchema = z.object({
  name: z.string().min(1).max(100),
  timezone: z.string().min(1),
  isDefault: z.boolean().optional().default(false),
  scheduleJson: z.record(
    z.string(),
    z.array(z.object({ start: z.string(), end: z.string() })),
  ).optional().default({}),
  overridesJson: z.record(z.string(), z.any()).optional().default({}),
});

const updateProfileSchema = createProfileSchema.partial();

// GET /api/v1/availability/profiles — list all profiles for the educator
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(['owner', 'admin', 'educator']);
  if (error) return error;

  const role = (session!.user as any).role as string;
  const userId = session!.user!.id as string;
  const { searchParams } = new URL(req.url);
  const educatorId = role === 'educator' ? userId : (searchParams.get('educatorId') ?? userId);

  const profiles = await db
    .select()
    .from(availabilityProfiles)
    .where(eq(availabilityProfiles.educatorId, educatorId))
    .orderBy(desc(availabilityProfiles.isDefault), asc(availabilityProfiles.name));

  return apiSuccess(profiles);
}

// POST /api/v1/availability/profiles — create a new profile
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth(['owner', 'admin', 'educator']);
  if (error) return error;

  const role = (session!.user as any).role as string;
  const userId = session!.user!.id as string;
  const { searchParams } = new URL(req.url);
  const educatorId = role === 'educator' ? userId : (searchParams.get('educatorId') ?? userId);

  const body = await req.json();
  const parsed = createProfileSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.message, 400);

  const { name, timezone, isDefault, scheduleJson, overridesJson } = parsed.data;

  // If this is being set as default, clear existing default first (within the same educator scope)
  if (isDefault) {
    await db
      .update(availabilityProfiles)
      .set({ isDefault: false })
      .where(eq(availabilityProfiles.educatorId, educatorId));
  }

  const [profile] = await db
    .insert(availabilityProfiles)
    .values({ educatorId, name, timezone, isDefault, scheduleJson, overridesJson })
    .returning();

  return apiSuccess(profile, undefined, 201);
}
