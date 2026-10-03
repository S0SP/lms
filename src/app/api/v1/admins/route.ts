import { type NextRequest } from 'next/server';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';
import { db } from '@/lib/drizzle';
import { users, orgs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { hash } from '@node-rs/argon2';
import { z } from 'zod';
import { sendAdminInvite } from '@/lib/email';
import { config } from '@/config/unifiedConfig';

const inviteAdminSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  tags: z.array(z.string()).optional(),
  payoutDefaultRate: z.number().min(0).optional(),
  payoutCurrency: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(['owner', 'admin']);
  if (error) return error;

  try {
    const adminUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        role: users.role,
        avatarUrl: users.avatarUrl,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.role, 'admin'));

    return apiSuccess(adminUsers);
  } catch (err: any) {
    return apiError(err.message || 'Failed to list admins', 500);
  }
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth(['owner', 'admin']);
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const parsed = inviteAdminSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.message);

  const { name, email, phone } = parsed.data;

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
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (existing) {
      return apiError('A user with this email already exists', 409);
    }

    const tempPassword = Math.random().toString(36).slice(-12);
    const passwordHash = await hash(tempPassword);

    const [newUser] = await db
      .insert(users)
      .values({
        orgId: orgId ?? null,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone?.trim() || null,
        role: 'admin',
        passwordHash,
        isActive: true,
      })
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
      });

    // Send admin invite email asynchronously
    sendAdminInvite({
      to: newUser.email,
      name: newUser.name,
      tempPassword,
      loginUrl: `${config.appUrl}/login`,
    }).catch((err) => console.error('[adminInvite] Failed to send invite email:', err));

    return apiSuccess(
      {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
      },
      undefined,
      201
    );
  } catch (err: any) {
    return apiError(err.message || 'Failed to create admin', 500);
  }
}
