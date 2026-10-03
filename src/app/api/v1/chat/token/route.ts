import { NextRequest } from 'next/server';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';
import { db } from '@/lib/drizzle';
import { chatMembers } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { createRealtimeToken } from '@/lib/integrations/ably';

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error || !session?.user?.id) return error || apiError('Unauthorized', 401);

  const userId = session.user.id;

  try {
    const userMemberships = await db
      .select({ threadId: chatMembers.threadId })
      .from(chatMembers)
      .where(eq(chatMembers.userId, userId));

    const threadIds = userMemberships.map((m) => m.threadId);
    const tokenPayload = await createRealtimeToken(userId, threadIds);

    return apiSuccess(tokenPayload);
  } catch (err: any) {
    console.error('Failed to create realtime token:', err);
    return apiError(err.message || 'Failed to create token', 500);
  }
}
