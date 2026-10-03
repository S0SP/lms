import { NextRequest } from 'next/server';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';
import { db } from '@/lib/drizzle';
import { parentProfiles, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { sendParentInvite } from '@/lib/email';

// GET /api/v1/user/parent-linking
// Returns the caller's linked parents. This direction only makes sense for a
// learner session; a parent gets their children from the parent dashboard.
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error || !session?.user?.id) return error || apiError('Unauthorized', 401);

  const role = (session.user as { role?: string }).role;
  if (role !== 'learner' && role !== 'student') {
    return apiError('Only learner accounts have linked parents', 400);
  }

  const userId = session.user.id;

  try {
    const parents = await db
      .select({
        id: parentProfiles.id,
        name: parentProfiles.name,
        email: parentProfiles.email,
        phone: parentProfiles.phone,
        relationship: parentProfiles.relationship,
        createdAt: parentProfiles.createdAt,
      })
      .from(parentProfiles)
      .where(eq(parentProfiles.learnerId, userId));

    return apiSuccess(parents);
  } catch (err: any) {
    console.error('Error fetching linked parents:', err);
    return apiError('Failed to fetch parent profiles', 500);
  }
}

// POST /api/v1/user/parent-linking
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error || !session?.user?.id) return error || apiError('Unauthorized', 401);

  const userId = session.user.id;
  const role = (session.user as { role?: string }).role;

  // This endpoint records "these are the parents of ME", so the caller must be
  // a learner. Without this guard a parent session would insert a row making
  // the parent's own user id the learner, corrupting the link.
  if (role !== 'learner' && role !== 'student') {
    return apiError('Only learner accounts can link a parent', 403);
  }

  try {
    const body = await req.json();
    const { email, name, relationship } = body;

    if (!email || typeof email !== 'string') {
      return apiError('Parent email is required');
    }

    const parentName = name || email.split('@')[0];

    const [newParent] = await db
      .insert(parentProfiles)
      .values({
        learnerId: userId,
        name: parentName,
        email: email.toLowerCase(),
        relationship: relationship || 'parent',
      })
      .returning();

    // Fetch student's name to personalize the invitation email
    const [learner] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    // Send invitation email in background
    sendParentInvite({
      to: email.toLowerCase(),
      name: parentName,
      learnerName: learner?.name || session.user.name || 'your scholar',
    }).catch((emailErr) => console.error('[Parent Linking] Email invite error:', emailErr));

    return apiSuccess(newParent, undefined, 201);
  } catch (err: any) {
    console.error('Error linking parent:', err);
    return apiError('Failed to send parent invite', 500);
  }
}
