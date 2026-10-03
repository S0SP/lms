import { type NextRequest } from 'next/server';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';
import { educatorService } from '@/services/educatorService';
import { inviteEducatorSchema } from '@/validators/educatorValidator';
import { db } from '@/lib/drizzle';
import { users, orgs } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(['owner', 'admin', 'educator']);
  if (error) return error;

  const { searchParams } = new URL(req.url);

  const result = await educatorService.getEducators({
    q: searchParams.get('q') ?? '',
    page: Math.max(1, parseInt(searchParams.get('page') ?? '1')),
    perPage: Math.min(100, parseInt(searchParams.get('perPage') ?? '20'))
  });

  return apiSuccess(result.educators, {
    total: result.total,
    page: result.page,
    perPage: result.perPage,
  });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth(['owner', 'admin']);
  if (error) return error;

  const body = await req.json();
  const parsed = inviteEducatorSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.message);

  // Resolve tenant orgId from admin session
  let orgId = (session?.user as any)?.orgId;
  if (!orgId && session?.user?.id) {
    const [me] = await db
      .select({ orgId: users.orgId })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);
    orgId = me?.orgId;
  }
  if (!orgId) {
    const [firstOrg] = await db.select({ id: orgs.id }).from(orgs).limit(1);
    orgId = firstOrg?.id ?? null;
  }

  try {
    const newEducator = await educatorService.inviteEducator(parsed.data, orgId);
    return apiSuccess({ id: newEducator.id, email: newEducator.email }, undefined, 201);
  } catch (err: any) {
    if (err.message.includes('already exists')) {
      return apiError(err.message, 409);
    }
    return apiError(err.message, 500);
  }
}

