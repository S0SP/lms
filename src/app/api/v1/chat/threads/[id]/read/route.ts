import { NextRequest } from 'next/server';
import { requireAuth, apiSuccess, apiError } from '@/lib/api';
import { markThreadRead, isThreadMember } from '@/repositories/chatRepository';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { session, error } = await requireAuth();
  if (error || !session?.user?.id) return error || apiError('Unauthorized', 401);

  const { id: threadId } = await params;
  const userId = session.user.id;

  const isMember = await isThreadMember(threadId, userId);
  if (!isMember) {
    return apiError('Forbidden: not a thread member', 403);
  }

  await markThreadRead(threadId, userId);
  return apiSuccess({ success: true });
}
