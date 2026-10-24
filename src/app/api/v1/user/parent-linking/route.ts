import { NextRequest } from 'next/server';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';
import { db } from '@/lib/drizzle';
import { parentProfiles, users } from '@/db/schema';
import { eq, or, and, ilike } from 'drizzle-orm';
import { sendParentInvite } from '@/lib/email';

// GET /api/v1/user/parent-linking
// Returns the caller's linked parents (if learner) or linked children (if parent).
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error || !session?.user?.id) return error || apiError('Unauthorized', 401);

  const role = (session.user as { role?: string }).role;
  const userId = session.user.id;

  try {
    if (role === 'parent') {
      const children = await db
        .select({
          id: parentProfiles.id,
          learnerId: parentProfiles.learnerId,
          learnerName: users.name,
          learnerEmail: users.email,
          relationship: parentProfiles.relationship,
          createdAt: parentProfiles.createdAt,
        })
        .from(parentProfiles)
        .leftJoin(users, eq(parentProfiles.learnerId, users.id))
        .where(eq(parentProfiles.userId, userId));

      return apiSuccess(children);
    }

    if (role !== 'learner' && role !== 'student') {
      return apiError('Only learner or parent accounts have linked relationships', 400);
    }

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
    console.error('Error fetching linking profiles:', err);
    return apiError('Failed to fetch profiles', 500);
  }
}

// POST /api/v1/user/parent-linking
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error || !session?.user?.id) return error || apiError('Unauthorized', 401);

  const userId = session.user.id;
  const userEmail = session.user.email?.toLowerCase();
  const userName = session.user.name || 'Parent';
  const role = (session.user as { role?: string }).role;

  try {
    const body = await req.json();

    // ─── Case 1: Parent linking a child / learner via invite code or email ─────────────
    if (role === 'parent') {
      const inviteCode = (body.inviteCode || body.code || body.email || '').trim();
      if (!inviteCode) {
        return apiError('Learner invite code or email is required', 400);
      }

      // Check if code matches learner email, login pin, or user id
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(inviteCode);

      const conditions = [
        eq(users.email, inviteCode.toLowerCase()),
        eq(users.loginPin, inviteCode),
      ];
      if (isUUID) {
        conditions.push(eq(users.id, inviteCode));
      }

      const [matchedLearner] = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
        })
        .from(users)
        .where(and(eq(users.role, 'learner'), or(...conditions)))
        .limit(1);

      if (!matchedLearner) {
        return apiError('No learner found matching this invite code or email. Please check with your administrator.', 404);
      }

      // Check if already linked
      const [existingLink] = await db
        .select()
        .from(parentProfiles)
        .where(
          and(
            eq(parentProfiles.learnerId, matchedLearner.id),
            or(
              eq(parentProfiles.userId, userId),
              userEmail ? eq(parentProfiles.email, userEmail) : undefined
            )
          )
        )
        .limit(1);

      if (existingLink) {
        if (!existingLink.userId) {
          await db
            .update(parentProfiles)
            .set({ userId })
            .where(eq(parentProfiles.id, existingLink.id));
        }
        return apiSuccess({ message: 'Learner already linked to your profile', learner: matchedLearner });
      }

      // Create new parent-learner relationship
      const [newLink] = await db
        .insert(parentProfiles)
        .values({
          userId,
          learnerId: matchedLearner.id,
          name: userName,
          email: userEmail || `parent.${Date.now()}@unboundyou.local`,
          relationship: body.relationship || 'parent',
        })
        .returning();

      return apiSuccess({ message: 'Successfully linked learner', link: newLink, learner: matchedLearner }, undefined, 201);
    }

    // ─── Case 2: Learner linking a parent ──────────────────────────────────────────
    if (role !== 'learner' && role !== 'student') {
      return apiError('Unauthorized role for linking', 403);
    }

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

    // Fetch student's name to personalize invitation email
    const [learner] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    sendParentInvite({
      to: email.toLowerCase(),
      name: parentName,
      learnerName: learner?.name || session.user.name || 'your scholar',
    }).catch((emailErr) => console.error('[Parent Linking] Email invite error:', emailErr));

    return apiSuccess(newParent, undefined, 201);
  } catch (err: any) {
    console.error('Error linking user:', err);
    return apiError(err.message || 'Failed to complete link request', 500);
  }
}
