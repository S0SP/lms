import { NextRequest } from 'next/server';
import { requireAuth, apiSuccess, apiError, parseBody } from '@/lib/api';
import { db } from '@/lib/drizzle';
import { users, parentProfiles, orgs } from '@/db/schema';
import { eq, and, or, ilike, desc, sql } from 'drizzle-orm';
import { z } from 'zod';
import { hash } from '@node-rs/argon2';

const createParentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  relationship: z.string().default('parent'),
  learnerId: z.string().uuid('Valid learner ID is required'),
});

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(['owner', 'admin']);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || '';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const perPage = Math.min(100, parseInt(searchParams.get('perPage') || '20'));

  const whereClause = q
    ? or(
        ilike(parentProfiles.name, `%${q}%`),
        ilike(parentProfiles.email, `%${q}%`),
        ilike(parentProfiles.phone, `%${q}%`)
      )
    : undefined;

  const [parents, totalRow] = await Promise.all([
    db
      .select({
        id: parentProfiles.id,
        userId: parentProfiles.userId,
        name: parentProfiles.name,
        email: parentProfiles.email,
        phone: parentProfiles.phone,
        relationship: parentProfiles.relationship,
        learnerId: parentProfiles.learnerId,
        createdAt: parentProfiles.createdAt,
      })
      .from(parentProfiles)
      .where(whereClause)
      .orderBy(desc(parentProfiles.createdAt))
      .limit(perPage)
      .offset((page - 1) * perPage),
    db.select({ count: sql<number>`count(*)::int` }).from(parentProfiles).where(whereClause),
  ]);

  return apiSuccess(parents, {
    total: totalRow[0]?.count ?? 0,
    page,
    perPage,
  });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth(['owner', 'admin']);
  if (error || !session?.user?.id) return error || apiError('Unauthorized', 401);

  const { data, error: parseError } = await parseBody(req, createParentSchema);
  if (parseError || !data) return parseError || apiError('Invalid request body', 400);

  // Verify learner exists
  const [learner] = await db
    .select({ id: users.id, orgId: users.orgId })
    .from(users)
    .where(and(eq(users.id, data.learnerId), eq(users.role, 'learner')))
    .limit(1);

  if (!learner) {
    return apiError('Selected learner does not exist', 404);
  }

  // Resolve org
  let orgId = learner.orgId;
  if (!orgId) {
    const [firstOrg] = await db.select({ id: orgs.id }).from(orgs).limit(1);
    orgId = firstOrg?.id ?? null;
  }

  try {
    const result = await db.transaction(async (tx) => {
      // Check if user with this email already exists
      const [existingUser] = await tx
        .select({ id: users.id, role: users.role })
        .from(users)
        .where(eq(users.email, data.email.toLowerCase()))
        .limit(1);

      let parentUserId = existingUser?.id;

      if (!existingUser) {
        const tempPassword = Math.random().toString(36).slice(-10);
        const passwordHash = await hash(tempPassword);

        const [newUser] = await tx
          .insert(users)
          .values({
            orgId,
            name: data.name,
            email: data.email.toLowerCase(),
            phone: data.phone,
            role: 'parent',
            passwordHash,
          })
          .returning({ id: users.id });

        parentUserId = newUser.id;
      }

      // Create parent profile link
      const [newProfile] = await tx
        .insert(parentProfiles)
        .values({
          userId: parentUserId,
          learnerId: data.learnerId,
          name: data.name,
          email: data.email.toLowerCase(),
          phone: data.phone,
          relationship: data.relationship,
        })
        .returning();

      return newProfile;
    });

    return apiSuccess(result, undefined, 201);
  } catch (err: any) {
    console.error('Failed to create parent:', err);
    return apiError(err.message || 'Failed to create parent', 500);
  }
}
