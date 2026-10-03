import { type NextRequest } from 'next/server';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';
import { db } from '@/lib/drizzle';
import { tags, orgs } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

// GET /api/v1/tags
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const [firstOrg] = await db.select({ id: orgs.id }).from(orgs).limit(1);
  const orgId = firstOrg?.id;
  if (!orgId) return apiSuccess([]);

  const tagList = await db
    .select()
    .from(tags)
    .where(eq(tags.orgId, orgId))
    .orderBy(desc(tags.createdAt));

  return apiSuccess(tagList);
}

// POST /api/v1/tags
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth(['owner', 'admin', 'educator']);
  if (error) return error;

  const body = await req.json();
  const name = body.name?.trim();
  if (!name) return apiError('Tag name is required', 400);

  const [firstOrg] = await db.select({ id: orgs.id }).from(orgs).limit(1);
  const orgId = firstOrg?.id;
  if (!orgId) return apiError('Organisation not found', 404);

  // Check if tag already exists
  const [existing] = await db
    .select()
    .from(tags)
    .where(and(eq(tags.orgId, orgId), eq(tags.name, name)))
    .limit(1);

  if (existing) {
    return apiSuccess(existing);
  }

  const [newTag] = await db
    .insert(tags)
    .values({
      orgId,
      name,
      colorHex: body.colorHex || '#3b82f6',
      category: body.category || 'custom',
    })
    .returning();

  return apiSuccess(newTag, undefined, 201);
}
